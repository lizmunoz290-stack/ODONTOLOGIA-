/** Estilos y formatos comunes para todos los archivos Excel generados. */
import type ExcelJS from "exceljs";

export const FORMATO_SOLES = '"S/ "#,##0.00;[Red]-"S/ "#,##0.00';
export const FORMATO_PORCENTAJE = "0.0%";
export const FORMATO_ENTERO = "#,##0";
export const FORMATO_DECIMAL = "#,##0.00";
export const FORMATO_FECHA = "dd/mm/yyyy";

export const COLOR_MARCA = "FF147F71";
export const COLOR_MARCA_CLARO = "FFD7F2ED";
export const COLOR_TOTAL = "FFEFFAF8";

export function estiloEncabezado(celda: ExcelJS.Cell) {
  celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
  celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_MARCA } };
  celda.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  celda.border = { bottom: { style: "thin", color: { argb: "FF0F5F55" } } };
}

/** Nombre del archivo: Reporte_[tipo]_[periodo].xlsx (sin espacios ni caracteres especiales) */
export function nombreArchivo(tipo: string, periodo: string): string {
  const limpiar = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9-]+/g, "_").replace(/^_+|_+$/g, "");
  return `Reporte_${limpiar(tipo)}_${limpiar(periodo)}.xlsx`;
}

/**
 * Periodo para el nombre del archivo: "2026-09" si el rango es un mes calendario completo
 * (o el mes en curso hasta hoy); si no, "2026-04-01_a_2026-09-26".
 */
export function periodoArchivo(desde: string, hasta: string, hoy: string): string {
  const [a, m] = desde.split("-").map(Number);
  const ultimoDia = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  const mesCompleto = desde.endsWith("-01") && (hasta === ultimoDia || (hasta === hoy && hoy.slice(0, 7) === desde.slice(0, 7)));
  return mesCompleto ? desde.slice(0, 7) : `${desde}_a_${hasta}`;
}
