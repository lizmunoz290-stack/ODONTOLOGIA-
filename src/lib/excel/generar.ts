/**
 * Convierte reportes en un libro Excel con el formato de la clínica:
 * encabezado (clínica, periodo, fecha de emisión), encabezados en negrita con color,
 * columnas autoajustadas, formatos S/ y %, fila de totales con fórmulas SUMA reales,
 * filtros activados y paneles congelados bajo el encabezado.
 */
import ExcelJS from "exceljs";
import type { Hoja, Reporte, TipoDato, Valor } from "../reportes/tipos";
import { calcularTotales } from "../reportes/tipos";
import {
  COLOR_MARCA,
  COLOR_TOTAL,
  estiloEncabezado,
  FORMATO_DECIMAL,
  FORMATO_ENTERO,
  FORMATO_FECHA,
  FORMATO_PORCENTAJE,
  FORMATO_SOLES,
} from "./estilos";
import { formatFecha, formatNumero, formatPorcentaje, formatSoles } from "../formato";

export interface MetaExcel {
  nombreClinica: string;
  ruc?: string | null;
  periodo: string;
  emision: string;
  /** Descripción de filtros aplicados (opcional) */
  filtros?: string;
}

const FORMATOS: Record<TipoDato, string | undefined> = {
  texto: undefined,
  entero: FORMATO_ENTERO,
  decimal: FORMATO_DECIMAL,
  soles: FORMATO_SOLES,
  porcentaje: FORMATO_PORCENTAJE,
  fecha: FORMATO_FECHA,
};

/** Texto aproximado de una celda, para calcular el ancho de la columna. */
function textoParaAncho(v: Valor, tipo: TipoDato): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return formatFecha(v);
  if (typeof v === "number") {
    if (tipo === "soles") return formatSoles(v);
    if (tipo === "porcentaje") return formatPorcentaje(v);
    return formatNumero(v);
  }
  return String(v);
}

/** Excel no admite fechas con zona horaria: se guarda la fecha de Lima como fecha "UTC" sin hora. */
function fechaExcel(d: Date): Date {
  const [dd, mm, aa] = formatFecha(d).split("/").map(Number);
  return new Date(Date.UTC(aa, mm - 1, dd));
}

function nombreHojaUnico(libro: ExcelJS.Workbook, nombre: string): string {
  const base = nombre.replace(/[\\/*?:[\]]/g, "-").slice(0, 31);
  let n = base;
  let i = 2;
  while (libro.getWorksheet(n)) n = `${base.slice(0, 28)} ${i++}`;
  return n;
}

function agregarHoja(libro: ExcelJS.Workbook, reporte: Reporte, hoja: Hoja, meta: MetaExcel) {
  const { columnas, filas } = hoja.tabla;
  const ws = libro.addWorksheet(nombreHojaUnico(libro, hoja.nombre));
  const nCols = columnas.length;

  // Encabezado del reporte
  const lineas: [string, Partial<ExcelJS.Font>][] = [
    [meta.nombreClinica + (meta.ruc ? ` — RUC ${meta.ruc}` : ""), { bold: true, size: 14, color: { argb: COLOR_MARCA } }],
    [hoja.titulo || reporte.titulo, { bold: true, size: 12 }],
    [`Periodo: ${meta.periodo}`, { size: 10 }],
    [`Fecha de emisión: ${meta.emision}`, { size: 10, color: { argb: "FF64748B" } }],
  ];
  if (meta.filtros) lineas.push([`Filtros: ${meta.filtros}`, { size: 10, color: { argb: "FF64748B" } }]);
  for (const n of hoja.notas ?? []) lineas.push([n, { size: 9, italic: true, color: { argb: "FF475569" } }]);
  lineas.forEach(([texto, fuente], i) => {
    const c = ws.getCell(i + 1, 1);
    c.value = texto;
    c.font = fuente;
  });
  const filaEncabezado = lineas.length + 2;

  // Encabezados de columna
  const encabezado = ws.getRow(filaEncabezado);
  columnas.forEach((col, i) => {
    const c = encabezado.getCell(i + 1);
    c.value = col.titulo;
    estiloEncabezado(c);
  });
  encabezado.height = 30;

  // Datos
  const anchos = columnas.map((c) => Math.min(45, Math.max(10, c.titulo.length * 0.9 + 2)));
  filas.forEach((f, j) => {
    const r = ws.getRow(filaEncabezado + 1 + j);
    columnas.forEach((col, i) => {
      let v = col.valor(f as never);
      if (v instanceof Date) v = fechaExcel(v);
      const c = r.getCell(i + 1);
      c.value = v as ExcelJS.CellValue;
      const fmt = FORMATOS[col.tipo];
      if (fmt) c.numFmt = fmt;
      anchos[i] = Math.min(45, Math.max(anchos[i], textoParaAncho(col.valor(f as never), col.tipo).length + 2));
    });
  });

  const primera = filaEncabezado + 1;
  const ultima = filaEncabezado + filas.length;

  // Totales con fórmulas reales
  if (hoja.tabla.totales && filas.length) {
    const filaTotal = ultima + 1;
    const r = ws.getRow(filaTotal);
    const totales = calcularTotales(hoja.tabla);
    const letraDe = new Map(columnas.map((c, i) => [c.clave, ws.getColumn(i + 1).letter]));
    const ref = (clave: string) => `${letraDe.get(clave)}${filaTotal}`;
    columnas.forEach((col, i) => {
      const c = r.getCell(i + 1);
      const letra = ws.getColumn(i + 1).letter;
      if (col.total?.tipo === "suma") {
        c.value = { formula: `SUM(${letra}${primera}:${letra}${ultima})`, result: Number(totales[col.clave]) };
      } else if (col.total?.tipo === "formula") {
        c.value = { formula: col.total.excel(ref), result: Number(totales[col.clave]) };
      } else if (col.total?.tipo === "texto") {
        c.value = col.total.texto;
      }
      const fmt = FORMATOS[col.tipo];
      if (fmt) c.numFmt = fmt;
      c.font = { bold: true };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_TOTAL } };
      c.border = { top: { style: "thin", color: { argb: COLOR_MARCA } }, bottom: { style: "double", color: { argb: COLOR_MARCA } } };
    });
    if (!columnas[0].total) r.getCell(1).value = "TOTAL";
    anchos.forEach((a, i) => (anchos[i] = Math.max(a, textoParaAncho(totales[columnas[i].clave] ?? null, columnas[i].tipo).length + 3)));
  }

  // Ancho de columnas, filtros y paneles congelados
  columnas.forEach((_, i) => (ws.getColumn(i + 1).width = anchos[i]));
  ws.autoFilter = { from: { row: filaEncabezado, column: 1 }, to: { row: Math.max(filaEncabezado, ultima), column: nCols } };
  ws.views = [{ state: "frozen", ySplit: filaEncabezado, xSplit: 0, topLeftCell: `A${filaEncabezado + 1}`, activeCell: `A${filaEncabezado + 1}` }];
  ws.pageSetup = { orientation: nCols > 8 ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
  ws.headerFooter.oddFooter = `&L${meta.nombreClinica}&RPágina &P de &N`;
}

export async function reportesAExcel(reportes: Reporte[], meta: MetaExcel): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = meta.nombreClinica;
  libro.created = new Date();
  for (const rep of reportes) for (const hoja of rep.hojas) agregarHoja(libro, rep, hoja, meta);
  return Buffer.from(await libro.xlsx.writeBuffer());
}
