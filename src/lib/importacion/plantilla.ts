/** Genera la plantilla Excel para importar atenciones (con listas desplegables). */
import ExcelJS from "exceljs";
import { COLUMNAS } from "./columnas";
import { CANALES, ESTADOS_PAGO, METODOS_PAGO, TURNOS } from "../constantes";
import { estiloEncabezado, FORMATO_FECHA, FORMATO_SOLES, COLOR_MARCA_CLARO } from "../excel/estilos";

export async function generarPlantilla(p: {
  nombreClinica: string;
  servicios: { nombre: string; precio: number }[];
  odontologos: string[];
}): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = p.nombreClinica;
  libro.created = new Date();

  const hoja = libro.addWorksheet("Atenciones", { views: [{ state: "frozen", ySplit: 1 }] });
  const listas = libro.addWorksheet("Listas");
  const instrucciones = libro.addWorksheet("Instrucciones");

  // Hoja de listas (fuente de los desplegables)
  const columnasListas: [string, string[]][] = [
    ["Servicios", p.servicios.map((s) => s.nombre)],
    ["Precio de lista", p.servicios.map((s) => String(s.precio))],
    ["Odontólogos", p.odontologos],
    ["Turnos", Object.values(TURNOS)],
    ["Métodos de pago", Object.values(METODOS_PAGO)],
    ["Estados", Object.values(ESTADOS_PAGO)],
    ["Canales", Object.values(CANALES)],
    ["Sí/No", ["Sí", "No"]],
  ];
  columnasListas.forEach(([titulo, valores], i) => {
    const col = listas.getColumn(i + 1);
    col.width = Math.max(14, ...valores.map((v) => v.length + 2));
    estiloEncabezado(listas.getCell(1, i + 1));
    listas.getCell(1, i + 1).value = titulo;
    valores.forEach((v, j) => {
      listas.getCell(j + 2, i + 1).value = titulo === "Precio de lista" ? Number(v) : v;
      if (titulo === "Precio de lista") listas.getCell(j + 2, i + 1).numFmt = FORMATO_SOLES;
    });
  });
  const rango = (col: string, n: number) => `Listas!$${col}$2:$${col}$${Math.max(2, n + 1)}`;
  const fuentes: Record<string, string> = {
    servicio: rango("A", p.servicios.length),
    odontologo: rango("C", p.odontologos.length),
    turno: rango("D", 2),
    metodoPago: rango("E", 4),
    estadoPago: rango("F", 3),
    canal: rango("G", 5),
    incluyeIgv: rango("H", 2),
  };

  // Encabezados
  hoja.columns = COLUMNAS.map((c) => ({ header: c.encabezado + (c.obligatorio ? " *" : ""), key: c.clave, width: c.ancho }));
  hoja.getRow(1).height = 22;
  hoja.getRow(1).eachCell((celda, i) => {
    estiloEncabezado(celda);
    celda.note = COLUMNAS[i - 1].nota;
  });

  // Filas de ejemplo
  const ejemplo = (dias: number) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - dias);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  };
  const s0 = p.servicios[0];
  const s1 = p.servicios[1] ?? s0;
  hoja.addRow({
    fecha: ejemplo(1), paciente: "María Quispe Flores", dni: "45678912", servicio: s0?.nombre, odontologo: p.odontologos[0],
    turno: "Mañana", precioLista: s0?.precio, descuento: 0, incluyeIgv: "Sí", metodoPago: "Yape/Plin", estadoPago: "Pagado", canal: "Redes sociales",
  });
  hoja.addRow({
    fecha: ejemplo(1), paciente: "José Ramírez Díaz", dni: "", servicio: s1?.nombre, odontologo: p.odontologos[p.odontologos.length - 1],
    turno: "Tarde", precioLista: s1?.precio, descuento: 10, incluyeIgv: "Sí", metodoPago: "Efectivo", estadoPago: "Parcial", montoPagado: 50,
    canal: "Telemarketing", observaciones: "Ejemplo: borre estas filas antes de importar",
  });
  for (const r of [2, 3]) hoja.getRow(r).eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_MARCA_CLARO } }));

  // Formatos y validaciones hasta la fila 2000
  const MAX = 2000;
  const letra = (clave: string) => hoja.getColumn(clave).letter;
  for (let r = 2; r <= MAX; r++) {
    hoja.getCell(`${letra("fecha")}${r}`).numFmt = FORMATO_FECHA;
    for (const k of ["precioLista", "descuento", "montoPagado"]) hoja.getCell(`${letra(k)}${r}`).numFmt = FORMATO_SOLES;
    hoja.getCell(`${letra("dni")}${r}`).numFmt = "@";
    for (const [clave, fuente] of Object.entries(fuentes)) {
      hoja.getCell(`${letra(clave)}${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [fuente],
        showErrorMessage: true,
        errorTitle: "Valor no válido",
        error: "Elija un valor de la lista (ver hoja Listas).",
      };
    }
    hoja.getCell(`${letra("fecha")}${r}`).dataValidation = {
      type: "date",
      operator: "greaterThan",
      allowBlank: true,
      formulae: [new Date(Date.UTC(2000, 0, 1))],
      showErrorMessage: true,
      error: "Ingrese una fecha válida (dd/mm/aaaa).",
    };
  }
  hoja.autoFilter = { from: "A1", to: `${hoja.getColumn(COLUMNAS.length).letter}1` };

  // Instrucciones
  instrucciones.getColumn(1).width = 22;
  instrucciones.getColumn(2).width = 12;
  instrucciones.getColumn(3).width = 80;
  instrucciones.addRow([`Plantilla de importación de atenciones — ${p.nombreClinica}`]).font = { bold: true, size: 14 };
  instrucciones.addRow([]);
  instrucciones.addRow(["1. Complete una fila por atención en la hoja “Atenciones” (borre las 2 filas de ejemplo)."]);
  instrucciones.addRow(["2. Las columnas con * son obligatorias. Use los desplegables para evitar errores de escritura."]);
  instrucciones.addRow(["3. En el sistema: Atenciones → Importar desde Excel → primero “Validar”, luego “Importar”."]);
  instrucciones.addRow(["4. Si alguna fila tiene errores, el sistema indicará el número de fila y el motivo."]);
  instrucciones.addRow([]);
  const cab = instrucciones.addRow(["Columna", "Obligatoria", "Descripción"]);
  cab.eachCell(estiloEncabezado);
  for (const c of COLUMNAS) instrucciones.addRow([c.encabezado, c.obligatorio ? "Sí" : "No", c.nota]);

  return Buffer.from(await libro.xlsx.writeBuffer());
}
