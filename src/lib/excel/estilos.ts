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
