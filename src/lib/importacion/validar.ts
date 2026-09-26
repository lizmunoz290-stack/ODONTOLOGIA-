/**
 * Validación de filas importadas desde Excel. Funciones puras: convierten los textos
 * de la plantilla (etiquetas en español) a los datos que espera el formulario de atención.
 */
import { CANALES, ESTADOS_PAGO, METODOS_PAGO, TURNOS, claveDesdeEtiqueta } from "../constantes";
import { fechaISO, parseFechaPeru } from "../formato";
import { esquemaAtencion, type DatosAtencion } from "../validaciones/atenciones";

export type ValorCelda = string | number | boolean | Date | null | undefined;

export interface Catalogos {
  /** nombre normalizado → servicio */
  servicios: Map<string, { id: number; precio: number; activo: boolean }>;
  /** nombre normalizado → odontólogo */
  odontologos: Map<string, { id: number; activo: boolean }>;
}

export type ResultadoFila = { ok: true; datos: DatosAtencion } | { ok: false; errores: string[] };

export const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const texto = (v: ValorCelda) => (v === null || v === undefined ? "" : v instanceof Date ? "" : String(v).trim());

/** Excel guarda las fechas como día a las 00:00 UTC. */
function leerFecha(v: ValorCelda): string | null {
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null;
    return v.toISOString().slice(0, 10);
  }
  const t = texto(v);
  if (!t) return null;
  const f = parseFechaPeru(t);
  return f ? fechaISO(f) : null;
}

function leerNumero(v: ValorCelda): number | undefined | null {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(/^S\/\s*/i, "").replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function leerSiNo(v: ValorCelda): boolean | null {
  if (typeof v === "boolean") return v;
  const t = normalizar(texto(v));
  if (!t) return true;
  if (["si", "s", "1", "true", "verdadero", "x"].includes(t)) return true;
  if (["no", "n", "0", "false", "falso"].includes(t)) return false;
  return null;
}

export function validarFila(fila: Record<string, ValorCelda>, cat: Catalogos): ResultadoFila {
  const errores: string[] = [];

  const fecha = leerFecha(fila.fecha);
  if (!fecha) errores.push("Fecha vacía o inválida (use dd/mm/aaaa)");

  const nombreServicio = texto(fila.servicio);
  const servicio = cat.servicios.get(normalizar(nombreServicio));
  if (!nombreServicio) errores.push("Falta el servicio");
  else if (!servicio) errores.push(`Servicio "${nombreServicio}" no existe en el catálogo`);
  else if (!servicio.activo) errores.push(`El servicio "${nombreServicio}" está inactivo`);

  const nombreOdo = texto(fila.odontologo);
  const odo = cat.odontologos.get(normalizar(nombreOdo));
  if (!nombreOdo) errores.push("Falta el odontólogo");
  else if (!odo) errores.push(`Odontólogo "${nombreOdo}" no existe`);
  else if (!odo.activo) errores.push(`El odontólogo "${nombreOdo}" está inactivo`);

  const turno = claveDesdeEtiqueta(TURNOS, texto(fila.turno));
  if (!turno) errores.push('Turno inválido (use "Mañana" o "Tarde")');

  const metodoPago = claveDesdeEtiqueta(METODOS_PAGO, texto(fila.metodoPago));
  if (!metodoPago) errores.push("Método de pago inválido");

  const estadoTxt = texto(fila.estadoPago);
  const estadoPago = estadoTxt ? claveDesdeEtiqueta(ESTADOS_PAGO, estadoTxt) : "PAGADO";
  if (!estadoPago) errores.push("Estado de pago inválido");

  const canalTxt = texto(fila.canal);
  const canal = canalTxt ? claveDesdeEtiqueta(CANALES, canalTxt) ?? claveDesdeEtiqueta(CANALES, canalTxt.split(/[\/(]/)[0]) : "OTRO";
  if (!canal) errores.push("Canal inválido");

  const incluyeIgv = leerSiNo(fila.incluyeIgv);
  if (incluyeIgv === null) errores.push('Incluye IGV debe ser "Sí" o "No"');

  const precio = leerNumero(fila.precioLista);
  const descuento = leerNumero(fila.descuento);
  const montoPagado = leerNumero(fila.montoPagado);
  if (precio === null) errores.push("Precio lista no es un número");
  if (descuento === null) errores.push("Descuento no es un número");
  if (montoPagado === null) errores.push("Monto pagado no es un número");

  if (errores.length) return { ok: false, errores };

  const dni = texto(fila.dni).replace(/\.0$/, "");
  const r = esquemaAtencion.safeParse({
    fecha,
    pacienteNombre: texto(fila.paciente),
    pacienteDni: dni,
    servicioId: servicio!.id,
    odontologoId: odo!.id,
    turno,
    precioLista: precio ?? servicio!.precio,
    descuento: descuento ?? 0,
    incluyeIgv: incluyeIgv!,
    metodoPago,
    estadoPago,
    montoPagado: montoPagado ?? undefined,
    canal,
    observaciones: texto(fila.observaciones),
  });
  if (!r.success) {
    const nombres: Record<string, string> = { pacienteNombre: "Paciente", pacienteDni: "DNI", fecha: "Fecha", precioLista: "Precio lista", descuento: "Descuento", observaciones: "Observaciones" };
    return {
      ok: false,
      errores: Object.entries(r.error.flatten().fieldErrors).map(([k, v]) => `${nombres[k] ?? k}: ${v?.[0]}`),
    };
  }
  return { ok: true, datos: r.data };
}
