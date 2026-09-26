import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { leerLibro } from "./leer";

async function libroDePrueba() {
  const wb = new ExcelJS.Workbook();
  const ing = wb.addWorksheet("INGRESOS 2024");
  ing.addRow([]);
  ing.addRow([null, "MES", "FECHA", "TICKET", "NOMBRE Y APELLIDO", "MONTO", "M_PAGO", "ESPECIALIDAD", null, "M_PAGO", "ESPECIALIDAD"]);
  const f = (s: string) => new Date(`${s}T00:00:00Z`);
  ing.addRow([null, "Diciembre", f("2024-12-20"), 100, "Ana Pérez", 150, "Efectivo", "Ortodoncia", null, "Tarjeta", "Odontologia"]);
  ing.addRow([null, "Diciembre", f("2025-12-21"), 101, "Luis Díaz", 80, "Deposito", "Odontologia"]); // año mal escrito
  ing.addRow([null, "Diciembre", f("2024-12-21"), 102, "ANULADO"]);
  ing.addRow([null, "Diciembre", "FECHA", "TICKET", "NOMBRE Y APELLIDO", "MONTO"]); // encabezado repetido
  ing.addRow([null, "Diciembre", f("2024-12-22"), 101, "Luis Díaz", 80, "Deposito", "Odontologia"]); // mismo ticket
  const gas = wb.addWorksheet("GASTOS 2024");
  gas.addRow([null, "COSTO OPERATIVO 2024"]);
  gas.addRow([null, "MES", "FECHA", "DESCRIPCION", "MONTO", "TIPO DE GASTO", "ME_PAGO", "TIPO DE RECIBO", "N ª RECIBO"]);
  gas.addRow([null, "Dic", f("2024-12-20"), "CANCELACION ALQUILER DICIEMBRE", 4500, "Otros", "Deposito", "Recibo", 1]);
  gas.addRow([null, "Dic", "21-12", "TURNO DR JIMMY", 100, "Odontologo", "Efectivo", "Recibo", 2]);
  gas.addRow([null, "Dic", null, "1ERA QUINCENA DICIEMBRE", 900, null, "Efectivo", "Recibo", 3]);
  const ini = wb.addWorksheet("INICIOS 2026");
  ini.addRow([null, "INICIOS - ENERO - 2026", "INICIOS - ENERO - 2026", "INICIOS - ENERO - 2026", "INICIOS - ENERO - 2026"]);
  ini.addRow([null, "FECHA", "NOMBRE", "CANTIDAD", "ASESORA"]);
  ini.addRow([null, f("2026-01-03"), "Carlos Pampa", 1, "Karla"]);
  ini.addRow([null, "INICIOS - FEBRERO - 2026", "INICIOS - FEBRERO - 2026", "INICIOS - FEBRERO - 2026", "INICIOS - FEBRERO - 2026"]);
  ini.addRow([null, "FECHA", "NOMBRE", "CANTIDAD", "ASESORA"]);
  ini.addRow([null, f("2026-02-02"), "Ana Mamani", 1, "Diana"]);
  const rep = wb.addWorksheet("REPORTE MENSUAL - 2026");
  rep.addRow([null, "CIERRE ENERO - 2026"]);
  rep.addRow([null, null, "META", "VA", "FALTO"]);
  rep.addRow([null, "ORTODONCIA", 50000, 57832.1]);
  rep.addRow([null, "INICIOS", 30, 65]);
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

describe("lectura del libro contable", () => {
  it("lee ingresos, gastos, inicios y metas con sus correcciones", async () => {
    const l = await leerLibro(await libroDePrueba());
    expect(l.error).toBeUndefined();
    expect(l.ingresos.map((i) => [i.fecha.toISOString().slice(0, 10), i.paciente, i.monto, i.especialidad, i.medioPago])).toEqual([
      ["2024-12-20", "Ana Pérez", 150, "ORTODONCIA", "EFECTIVO"],
      ["2024-12-21", "Luis Díaz", 80, "ODONTOLOGIA", "DEPOSITO"],
      ["2024-12-22", "Luis Díaz", 80, "ODONTOLOGIA", "DEPOSITO"],
    ]);
    expect(l.ingresos[1].correccion).toMatch(/Año corregido/);
    expect(l.hojas.find((h) => h.hoja === "INGRESOS 2024")).toMatchObject({ filas: 3, anulados: 1 });
    expect(new Set(l.ingresos.map((i) => i.huella)).size).toBe(3);

    expect(l.gastos.map((g) => [g.fecha.toISOString().slice(0, 10), g.tipo, g.monto])).toEqual([
      ["2024-12-20", "ALQUILER", 4500],
      ["2024-12-21", "ODONTOLOGO", 100],
      ["2024-12-21", "SUELDO", 900],
    ]);
    expect(l.gastos[2].correccion).toMatch(/sin fecha/);

    expect(l.inicios.map((i) => [i.paciente, i.asesora])).toEqual([
      ["Carlos Pampa", "KARLA"],
      ["Ana Mamani", "DIANA"],
    ]);
    expect(l.metas).toEqual([
      { periodo: "2026-01", indicador: "ORTODONCIA", valor: 50000 },
      { periodo: "2026-01", indicador: "INICIOS", valor: 30 },
    ]);
  });

  it("archivo inválido", async () => {
    const l = await leerLibro(new TextEncoder().encode("no es excel").buffer as ArrayBuffer);
    expect(l.error).toMatch(/No se pudo leer/);
  });
});
