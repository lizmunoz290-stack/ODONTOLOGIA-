/**
 * Corrección de fechas del libro contable. Las filas están en orden cronológico, así que una fecha
 * que se aleja mucho de la fila anterior casi siempre es un año mal escrito (p. ej. 2025-12 en la
 * hoja 2024). También interpreta fechas escritas como texto ("22-07", "22/07/2025").
 */

const DIA = 86_400_000;
const TOLERANCIA_DIAS = 45;

export interface ResultadoFecha {
  fecha: Date | null;
  correccion?: string;
}

const utc = (a: number, m: number, d: number) => {
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d ? f : null;
};
export const isoDia = (d: Date) => d.toISOString().slice(0, 10);

/** Convierte el valor de una celda en fecha (sin corregir). `anioRef` completa fechas sin año. */
export function leerFechaCelda(v: unknown, anioRef: number): Date | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : utc(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate());
  if (typeof v === "number" && v > 30000 && v < 60000) return new Date(Date.UTC(1899, 11, 30) + v * DIA); // número de serie de Excel
  const t = String(v ?? "").trim();
  let m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(t);
  if (m) return utc(m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]), Number(m[2]), Number(m[1]));
  m = /^(\d{1,2})[-/.](\d{1,2})$/.exec(t);
  if (m) return utc(anioRef, Number(m[2]), Number(m[1]));
  m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return utc(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}

/**
 * Corrige la fecha de una fila usando la fecha válida anterior (`previa`).
 * - Sin fecha: toma la de la fila anterior.
 * - Si se aleja más de 45 días de la anterior, prueba con el año de la anterior (y el siguiente,
 *   por el cambio de año) y usa la que quede cerca.
 */
export function corregirFecha(leida: Date | null, previa: Date | null, textoOriginal: string): ResultadoFecha {
  if (!leida) {
    return previa ? { fecha: previa, correccion: `Fila sin fecha: se usó la de la fila anterior (${isoDia(previa)})` } : { fecha: null };
  }
  const esTexto = textoOriginal !== "" && !/^\d{4}-\d{2}-\d{2}/.test(textoOriginal);
  if (!previa || Math.abs(leida.getTime() - previa.getTime()) <= TOLERANCIA_DIAS * DIA) {
    return esTexto ? { fecha: leida, correccion: `Fecha escrita como texto "${textoOriginal}" → ${isoDia(leida)}` } : { fecha: leida };
  }
  const anioPrevio = previa.getUTCFullYear();
  for (const anio of [anioPrevio, anioPrevio + 1]) {
    const c = utc(anio, leida.getUTCMonth() + 1, leida.getUTCDate());
    if (c && Math.abs(c.getTime() - previa.getTime()) <= TOLERANCIA_DIAS * DIA) {
      return { fecha: c, correccion: `Año corregido: ${isoDia(leida)} → ${isoDia(c)}` };
    }
  }
  return { fecha: leida, correccion: `Fecha fuera de secuencia (revisar): ${isoDia(leida)}` };
}
