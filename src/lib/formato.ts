/** Utilidades de formato para Perú: soles, fechas dd/mm/aaaa y porcentajes. */

export const ZONA_HORARIA = "America/Lima";

const fmtSoles = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const fmtNumero = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** Redondea a n decimales evitando errores de coma flotante (1.005 → 1.01). */
export function redondear(valor: number, decimales = 2): number {
  const f = 10 ** decimales;
  return Math.round((valor + Number.EPSILON) * f) / f;
}

/** Espacio no separable: "S/" nunca queda en una línea y el número en otra. */
export const NBSP = "\u00a0";

/** 1234.5 → "S/ 1,234.50"; negativos → "-S/ 12.00" (con espacio no separable) */
export function formatSoles(valor: number): string {
  const v = redondear(valor);
  const s = `S/${NBSP}${fmtSoles.format(Math.abs(v))}`;
  return v < 0 ? `-${s}` : s;
}

export function formatNumero(valor: number, decimales = 2): string {
  return decimales === 2
    ? fmtNumero.format(valor)
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: decimales }).format(valor);
}

/** 0.1234 → "12.3 %" */
export function formatPorcentaje(valor: number, decimales = 1): string {
  if (!Number.isFinite(valor)) return "—";
  return `${(valor * 100).toFixed(decimales)} %`;
}

function partesFecha(fecha: Date) {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA_HORARIA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(fecha);
  const get = (t: string) => partes.find((p) => p.type === t)!.value;
  return { d: get("day"), m: get("month"), a: get("year") };
}

/** Date → "dd/mm/aaaa" en hora de Lima */
export function formatFecha(fecha: Date | string): string {
  const { d, m, a } = partesFecha(new Date(fecha));
  return `${d}/${m}/${a}`;
}

/** Date → "aaaa-mm-dd" en hora de Lima (para inputs type=date) */
export function fechaISO(fecha: Date | string): string {
  const { d, m, a } = partesFecha(new Date(fecha));
  return `${a}-${m}-${d}`;
}

/** Date → "AAAA-MM" (periodo contable) en hora de Lima */
export function periodoDe(fecha: Date | string): string {
  return fechaISO(fecha).slice(0, 7);
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre",
];

/** "2026-04" → "Abril 2026" */
export function nombrePeriodo(periodo: string): string {
  const [a, m] = periodo.split("-").map(Number);
  return `${MESES[m - 1]} ${a}`;
}

/** "2026-04" → "Abr 26" (para ejes de gráficos) */
export function periodoCorto(periodo: string): string {
  const [a, m] = periodo.split("-").map(Number);
  return `${MESES[m - 1].slice(0, 3)} ${String(a).slice(2)}`;
}

/**
 * "aaaa-mm-dd" (hora de Lima) → Date a las 12:00 de Lima.
 * Usar mediodía evita que la fecha cambie de día por la zona horaria (Lima = UTC-5, sin horario de verano).
 */
export function parseFechaISO(iso: string): Date {
  return new Date(`${iso}T12:00:00-05:00`);
}

/** "dd/mm/aaaa" → Date (null si es inválida) */
export function parseFechaPeru(texto: string): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const [, d, mes, a] = m.map(Number);
  const fecha = new Date(Date.UTC(a, mes - 1, d));
  if (fecha.getUTCFullYear() !== a || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== d) return null;
  return parseFechaISO(`${a}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
}

/** Inicio (00:00 Lima) y fin (23:59:59.999 Lima) de un día aaaa-mm-dd */
export function inicioDia(iso: string): Date {
  return new Date(`${iso}T00:00:00-05:00`);
}
export function finDia(iso: string): Date {
  return new Date(`${iso}T23:59:59.999-05:00`);
}

/** Lista de periodos AAAA-MM entre dos fechas aaaa-mm-dd (inclusive) */
export function periodosEntre(desdeISO: string, hastaISO: string): string[] {
  let [a, m] = desdeISO.slice(0, 7).split("-").map(Number);
  const [ah, mh] = hastaISO.slice(0, 7).split("-").map(Number);
  const out: string[] = [];
  while (a < ah || (a === ah && m <= mh)) {
    out.push(`${a}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; a++; }
  }
  return out;
}
