/**
 * Lectura del libro contable en Excel (formato "ODM - INFORME"): hojas INGRESOS AAAA, GASTOS AAAA,
 * INICIOS AAAA, REPORTE MENSUAL (metas) y PERMISOS. Detecta columnas por su encabezado, así que
 * tolera columnas movidas o tablas auxiliares a la derecha.
 */
import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import { claveTexto, normalizarEspecialidad, normalizarMedioPago, tipoGastoFinal } from "./normalizar";
import { corregirFecha, isoDia, leerFechaCelda } from "./fechas";

export interface IngresoLeido {
  fecha: Date;
  ticket: number | null;
  paciente: string;
  pacienteClave: string;
  monto: number;
  medioPago: string;
  especialidad: "ORTODONCIA" | "ODONTOLOGIA";
  correccion?: string;
  origen: string;
  huella: string;
}
export interface GastoLeido {
  fecha: Date;
  descripcion: string;
  monto: number;
  tipo: string;
  tipoOriginal: string;
  medioPago: string;
  comprobante: string;
  numero: string | null;
  correccion?: string;
  origen: string;
  huella: string;
}
export interface InicioLeido {
  fecha: Date;
  paciente: string;
  pacienteClave: string;
  asesora: string;
  cantidad: number;
  origen: string;
  huella: string;
}
export interface MetaLeida {
  periodo: string;
  indicador: "ORTODONCIA" | "ODONTOLOGIA" | "INICIOS" | "UTILIDAD";
  valor: number;
}
export interface PermisoLeido {
  detalle: string;
  vencimiento: Date | null;
  notas: string | null;
}

export interface ResumenHoja {
  hoja: string;
  tipo: "ingresos" | "gastos" | "inicios" | "metas" | "permisos" | "ignorada";
  filas: number;
  total?: number;
  anulados?: number;
  sinMonto?: number;
  correcciones?: number;
}

export interface LibroLeido {
  ingresos: IngresoLeido[];
  gastos: GastoLeido[];
  inicios: InicioLeido[];
  metas: MetaLeida[];
  permisos: PermisoLeido[];
  hojas: ResumenHoja[];
  /** Ejemplos de correcciones automáticas (máx. 200) */
  correcciones: { hoja: string; fila: number; detalle: string }[];
  error?: string;
}

const MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SETIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

function valor(c: ExcelJS.Cell): unknown {
  const v = c.value;
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) return (v as { result: unknown }).result ?? null;
    if ("richText" in v) return (v as { richText: { text: string }[] }).richText.map((t) => t.text).join("");
    if ("text" in v) return (v as { text: string }).text;
    if ("error" in v) return null;
  }
  return v;
}
const texto = (v: unknown) => (v === null || v === undefined || v instanceof Date ? "" : String(v).trim());
const numero = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const t = texto(v).replace(/^S\/\s*/i, "").replace(/,/g, "");
  if (!t || !/^-?\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
};
/** La celda de fecha tiene texto que no es fecha (títulos o encabezados repetidos dentro de la hoja) */
const esTextoNoFecha = (v: unknown, anio: number) => !(v instanceof Date) && typeof v !== "number" && texto(v) !== "" && leerFechaCelda(v, anio) === null;
const hash = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 24);

/** Busca en las primeras filas la fila de encabezados que contiene todos los `requeridos`. */
function encabezados(ws: ExcelJS.Worksheet, requeridos: string[]): { fila: number; col: Record<string, number> } | null {
  for (let r = 1; r <= 8; r++) {
    const col: Record<string, number> = {};
    ws.getRow(r).eachCell((c, n) => {
      const k = claveTexto(valor(c));
      if (k && !(k in col)) col[k] = n; // la primera aparición (izquierda) gana
    });
    if (requeridos.every((q) => q in col)) return { fila: r, col };
  }
  return null;
}
const buscar = (col: Record<string, number>, ...nombres: string[]) => nombres.map((n) => col[n]).find((x) => x !== undefined);

/** Agrega un sufijo de ocurrencia para que filas idénticas dentro del archivo tengan huellas distintas. */
function contadorHuellas() {
  const vistos = new Map<string, number>();
  return (base: string) => {
    const n = (vistos.get(base) ?? 0) + 1;
    vistos.set(base, n);
    return hash(`${base}#${n}`);
  };
}

export async function leerLibro(buffer: ArrayBuffer): Promise<LibroLeido> {
  const libro: LibroLeido = { ingresos: [], gastos: [], inicios: [], metas: [], permisos: [], hojas: [], correcciones: [] };
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    return { ...libro, error: "No se pudo leer el archivo. Asegúrese de que sea un Excel (.xlsx)." };
  }
  const huellaIng = contadorHuellas();
  const huellaGas = contadorHuellas();
  const huellaIni = contadorHuellas();
  const anotar = (hoja: string, fila: number, detalle: string) => {
    if (libro.correcciones.length < 200) libro.correcciones.push({ hoja, fila, detalle });
  };

  for (const ws of wb.worksheets) {
    const nombre = claveTexto(ws.name);
    const anioHoja = Number(/(\d{4})/.exec(nombre)?.[1]) || new Date().getFullYear();

    // ───── INGRESOS ─────
    if (nombre.startsWith("INGRESO") && !nombre.includes("PERSONAL")) {
      const h = encabezados(ws, ["FECHA", "MONTO"]);
      if (!h) { libro.hojas.push({ hoja: ws.name, tipo: "ignorada", filas: 0 }); continue; }
      const cF = h.col["FECHA"], cM = h.col["MONTO"];
      const cT = buscar(h.col, "TICKET", "N TICKET"), cN = buscar(h.col, "NOMBRE Y APELLIDO", "NOMBRE", "PACIENTE");
      const cP = buscar(h.col, "M PAGO", "MEDIO DE PAGO", "METODO DE PAGO"), cE = buscar(h.col, "ESPECIALIDAD");
      const res: ResumenHoja = { hoja: ws.name, tipo: "ingresos", filas: 0, total: 0, anulados: 0, sinMonto: 0, correcciones: 0 };
      let previa: Date | null = null;
      ws.eachRow((row, r) => {
        if (r <= h.fila) return;
        const vF = valor(row.getCell(cF)), vM = valor(row.getCell(cM));
        const nom = cN ? texto(valor(row.getCell(cN))) : "";
        const monto = numero(vM);
        if (!nom && monto === null && !texto(vF)) return; // fila vacía
        if (/ANULAD/i.test(nom)) { res.anulados!++; return; }
        if (esTextoNoFecha(vF, anioHoja)) return; // título o encabezado repetido
        const esp = cE ? normalizarEspecialidad(valor(row.getCell(cE))) : null;
        if (monto === null || monto <= 0 || !esp) { res.sinMonto!++; return; }
        const leida = leerFechaCelda(vF, previa?.getUTCFullYear() ?? anioHoja);
        const f = corregirFecha(leida, previa, vF instanceof Date ? isoDia(vF) : texto(vF));
        if (!f.fecha) { res.sinMonto!++; return; }
        if (f.correccion) { res.correcciones!++; anotar(ws.name, r, f.correccion); }
        previa = f.fecha;
        const ticket = cT ? numero(valor(row.getCell(cT))) : null;
        const medio = cP ? normalizarMedioPago(valor(row.getCell(cP))) : "SIN DATO";
        const clave = claveTexto(nom) || "SIN NOMBRE";
        libro.ingresos.push({
          fecha: f.fecha, ticket: ticket !== null ? Math.round(ticket) : null, paciente: nom || "Sin nombre", pacienteClave: clave,
          monto, medioPago: medio, especialidad: esp, correccion: f.correccion, origen: ws.name,
          huella: huellaIng(`I|${ticket}|${clave}|${monto}|${esp}|${medio}|${isoDia(f.fecha)}`),
        });
        res.filas++; res.total! += monto;
      });
      libro.hojas.push(res);
      continue;
    }

    // ───── GASTOS ─────
    if (nombre.startsWith("GASTO") && !nombre.includes("DEPOSITO")) {
      const h = encabezados(ws, ["FECHA", "DESCRIPCION", "MONTO"]);
      if (!h) { libro.hojas.push({ hoja: ws.name, tipo: "ignorada", filas: 0 }); continue; }
      const cF = h.col["FECHA"], cD = h.col["DESCRIPCION"], cM = h.col["MONTO"];
      const cT = buscar(h.col, "TIPO DE GASTO", "TIPO GASTO"), cP = buscar(h.col, "ME PAGO", "M PAGO", "MEDIO DE PAGO");
      const cR = buscar(h.col, "TIPO DE RECIBO", "TIPO RECIBO", "COMPROBANTE"), cNum = buscar(h.col, "N A RECIBO", "N RECIBO", "NUMERO");
      const res: ResumenHoja = { hoja: ws.name, tipo: "gastos", filas: 0, total: 0, anulados: 0, sinMonto: 0, correcciones: 0 };
      let previa: Date | null = null;
      ws.eachRow((row, r) => {
        if (r <= h.fila) return;
        const vF = valor(row.getCell(cF));
        const desc = texto(valor(row.getCell(cD)));
        const monto = numero(valor(row.getCell(cM)));
        if (!desc && monto === null) return;
        if (/^ANULAD/i.test(desc)) { res.anulados!++; return; }
        if (esTextoNoFecha(vF, anioHoja)) return; // título o encabezado repetido
        if (monto === null || monto <= 0) { res.sinMonto!++; return; }
        const leida = leerFechaCelda(vF, previa?.getUTCFullYear() ?? anioHoja);
        const f = corregirFecha(leida, previa, vF instanceof Date ? isoDia(vF) : texto(vF));
        if (!f.fecha) { res.sinMonto!++; return; }
        if (f.correccion) { res.correcciones!++; anotar(ws.name, r, f.correccion); }
        previa = f.fecha;
        const tipoOriginal = cT ? texto(valor(row.getCell(cT))) : "";
        const tipo = tipoGastoFinal(tipoOriginal, desc);
        const medio = cP ? normalizarMedioPago(valor(row.getCell(cP))) : "SIN DATO";
        const comp = cR ? claveTexto(valor(row.getCell(cR))) || "SIN DATO" : "SIN DATO";
        const num = cNum ? texto(valor(row.getCell(cNum))) || null : null;
        libro.gastos.push({
          fecha: f.fecha, descripcion: desc || "(sin descripción)", monto, tipo, tipoOriginal: tipoOriginal || "(vacío)",
          medioPago: medio, comprobante: comp, numero: num, correccion: f.correccion, origen: ws.name,
          huella: huellaGas(`G|${isoDia(f.fecha)}|${claveTexto(desc)}|${monto}|${num}|${medio}`),
        });
        res.filas++; res.total! += monto;
      });
      libro.hojas.push(res);
      continue;
    }

    // ───── INICIOS ─────
    if (nombre.startsWith("INICIO")) {
      const h = encabezados(ws, ["FECHA", "NOMBRE"]);
      if (!h) { libro.hojas.push({ hoja: ws.name, tipo: "ignorada", filas: 0 }); continue; }
      const cF = h.col["FECHA"], cN = h.col["NOMBRE"], cC = buscar(h.col, "CANTIDAD"), cA = buscar(h.col, "ASESORA", "ASESOR");
      const res: ResumenHoja = { hoja: ws.name, tipo: "inicios", filas: 0, correcciones: 0 };
      let previa: Date | null = null;
      ws.eachRow((row, r) => {
        if (r <= h.fila) return;
        const nom = texto(valor(row.getCell(cN)));
        if (!nom) return;
        const vF = valor(row.getCell(cF));
        // Descarta títulos ("INICIOS - FEBRERO - 2026") y encabezados repetidos: un inicio siempre tiene fecha
        if (!texto(vF) && !(vF instanceof Date)) return;
        if (esTextoNoFecha(vF, anioHoja)) return;
        const f = corregirFecha(leerFechaCelda(vF, previa?.getUTCFullYear() ?? anioHoja), previa, vF instanceof Date ? isoDia(vF) : texto(vF));
        if (!f.fecha) return;
        if (f.correccion) { res.correcciones!++; anotar(ws.name, r, f.correccion); }
        previa = f.fecha;
        const asesora = cA ? claveTexto(valor(row.getCell(cA))) || "SIN ASESORA" : "SIN ASESORA";
        const cantidad = Math.max(1, Math.round((cC ? numero(valor(row.getCell(cC))) : 1) ?? 1));
        const clave = claveTexto(nom);
        libro.inicios.push({ fecha: f.fecha, paciente: nom, pacienteClave: clave, asesora, cantidad, origen: ws.name, huella: huellaIni(`N|${isoDia(f.fecha)}|${clave}|${asesora}`) });
        res.filas++;
      });
      libro.hojas.push(res);
      continue;
    }

    // ───── METAS (REPORTE MENSUAL: bloques "CIERRE <MES> - <AÑO>") ─────
    if (nombre.startsWith("REPORTE MENSUAL")) {
      let periodo: string | null = null;
      let colMeta = 3;
      const res: ResumenHoja = { hoja: ws.name, tipo: "metas", filas: 0 };
      ws.eachRow((row) => {
        row.eachCell((c, n) => {
          const t = claveTexto(valor(c));
          const m = /^CIERRE ([A-Z]+) (\d{4})$/.exec(t);
          if (m) {
            const mes = MESES.indexOf(m[1] === "SEPTIEMBRE" ? "SETIEMBRE" : m[1]);
            if (mes >= 0) periodo = `${m[2]}-${String(mes + 1).padStart(2, "0")}`;
          }
          if (t === "META") colMeta = n;
        });
        const etiqueta = claveTexto(valor(row.getCell(2)));
        if (periodo && ["ORTODONCIA", "ODONTOLOGIA", "INICIOS", "UTILIDAD"].includes(etiqueta)) {
          const v = numero(valor(row.getCell(colMeta)));
          if (v !== null && !libro.metas.some((x) => x.periodo === periodo && x.indicador === etiqueta)) {
            libro.metas.push({ periodo, indicador: etiqueta as MetaLeida["indicador"], valor: v });
            res.filas++;
          }
        }
      });
      libro.hojas.push(res);
      continue;
    }

    // ───── PERMISOS ─────
    if (nombre.startsWith("PERMISO")) {
      const h = encabezados(ws, ["DETALLE"]);
      if (!h) { libro.hojas.push({ hoja: ws.name, tipo: "ignorada", filas: 0 }); continue; }
      const cD = h.col["DETALLE"], cV = buscar(h.col, "FECHA DE VENCIMIENTO", "VENCIMIENTO");
      const res: ResumenHoja = { hoja: ws.name, tipo: "permisos", filas: 0 };
      ws.eachRow((row, r) => {
        if (r <= h.fila) return;
        const det = texto(valor(row.getCell(cD)));
        if (!det) return;
        const v = cV ? valor(row.getCell(cV)) : null;
        const f = leerFechaCelda(v, anioHoja);
        libro.permisos.push({ detalle: det, vencimiento: f, notas: f ? null : texto(v) || null });
        res.filas++;
      });
      libro.hojas.push(res);
      continue;
    }

    libro.hojas.push({ hoja: ws.name, tipo: "ignorada", filas: 0 });
  }
  return libro;
}
