import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { reportesAExcel } from "./generar";
import { FORMATO_PORCENTAJE, FORMATO_SOLES } from "./estilos";
import { columnas, dividir, formulaDividir, type Reporte } from "../reportes/tipos";

type F = { servicio: string; cantidad: number; ingresos: number; utilidad: number };
const filas: F[] = [
  { servicio: "Profilaxis", cantidad: 10, ingresos: 700, utilidad: 70 },
  { servicio: "Corona", cantidad: 2, ingresos: 1500, utilidad: 400 },
];

const reporte: Reporte = {
  tipo: "prueba",
  nombreArchivo: "Prueba",
  titulo: "Reporte de prueba",
  descripcion: "",
  hojas: [
    {
      nombre: "Hoja: con / caracteres*",
      titulo: "Rentabilidad",
      notas: ["Nota de prueba"],
      tabla: {
        totales: true,
        filas,
        columnas: columnas<F>([
          { clave: "servicio", titulo: "Servicio", tipo: "texto", valor: (f) => f.servicio, total: { tipo: "texto", texto: "TOTAL" } },
          { clave: "cantidad", titulo: "Cantidad", tipo: "entero", valor: (f) => f.cantidad, total: { tipo: "suma" } },
          { clave: "ingresos", titulo: "Ingresos", tipo: "soles", valor: (f) => f.ingresos, total: { tipo: "suma" } },
          { clave: "utilidad", titulo: "Utilidad", tipo: "soles", valor: (f) => f.utilidad, total: { tipo: "suma" } },
          {
            clave: "margen",
            titulo: "Margen",
            tipo: "porcentaje",
            valor: (f) => f.utilidad / f.ingresos,
            total: { tipo: "formula", excel: (r) => formulaDividir(r("utilidad"), r("ingresos")), valor: (t) => dividir(t.utilidad, t.ingresos) },
          },
        ]),
      },
    },
  ],
};

describe("generación de Excel", () => {
  it("aplica encabezado, formatos, fórmulas SUMA, filtros y paneles congelados", async () => {
    const buf = await reportesAExcel([reporte], { nombreClinica: "Clínica X", periodo: "01/09/2026 al 26/09/2026", emision: "26/09/2026 10:00" });
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = libro.worksheets[0];
    expect(ws.name).toBe("Hoja- con - caracteres-");
    expect(ws.getCell("A1").value).toBe("Clínica X");
    expect(ws.getCell("A3").value).toBe("Periodo: 01/09/2026 al 26/09/2026");
    expect(ws.getCell("A4").value).toBe("Fecha de emisión: 26/09/2026 10:00");
    // 4 líneas de encabezado + 1 nota + 1 en blanco → encabezados en la fila 7
    const h = 7;
    expect(ws.getCell(`A${h}`).value).toBe("Servicio");
    expect(ws.getCell(`A${h}`).font?.bold).toBe(true);
    expect(ws.getCell(`C${h + 1}`).numFmt).toBe(FORMATO_SOLES);
    expect(ws.getCell(`E${h + 1}`).numFmt).toBe(FORMATO_PORCENTAJE);
    const tot = h + 3;
    expect(ws.getCell(`A${tot}`).value).toBe("TOTAL");
    expect(ws.getCell(`B${tot}`).value).toMatchObject({ formula: `SUM(B${h + 1}:B${h + 2})`, result: 12 });
    expect(ws.getCell(`C${tot}`).value).toMatchObject({ formula: `SUM(C${h + 1}:C${h + 2})`, result: 2200 });
    expect(ws.getCell(`E${tot}`).value).toMatchObject({ formula: `IF(C${tot}=0,0,D${tot}/C${tot})` });
    expect(ws.autoFilter).toBeTruthy();
    expect(ws.views[0]).toMatchObject({ state: "frozen", ySplit: h });
    expect(ws.getColumn(1).width).toBeGreaterThanOrEqual(10);
  });
});
