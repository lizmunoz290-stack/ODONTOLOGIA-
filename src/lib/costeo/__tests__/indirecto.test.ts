import { describe, expect, it } from "vitest";
import { calcularTasa, construirBasesMensuales, explicarAsignacion, indirectoAtencion } from "../indirecto";

const mes = { periodo: "2026-04", totalIndirectos: 10000, totalMinutos: 5000, totalAtenciones: 200, totalIngresos: 50000 };

describe("prorrateo de indirectos", () => {
  it("por minutos de sillón", () => {
    const t = calcularTasa("MINUTOS", mes);
    expect(t.tasa).toBe(2);
    expect(indirectoAtencion(t, { minutos: 45, ingresoNeto: 100 })).toBe(90);
    expect(t.formula).toBe("S/ 10,000.00 ÷ 5,000 min = S/ 2.0000 por minuto");
    expect(explicarAsignacion(t, { minutos: 45, ingresoNeto: 100 })).toBe("S/ 2.0000/min × 45 min = S/ 90.00");
  });

  it("por número de atenciones", () => {
    const t = calcularTasa("ATENCIONES", mes);
    expect(t.tasa).toBe(50);
    expect(indirectoAtencion(t, { minutos: 999, ingresoNeto: 1 })).toBe(50);
  });

  it("por porcentaje de ingresos", () => {
    const t = calcularTasa("INGRESOS", mes);
    expect(t.tasa).toBe(0.2);
    expect(indirectoAtencion(t, { minutos: 30, ingresoNeto: 300 })).toBeCloseTo(60);
  });

  it("la suma de lo asignado a todas las atenciones del mes = total de indirectos", () => {
    const atenciones = [
      { periodo: "2026-05", minutos: 30, ingresoNeto: 67.8 },
      { periodo: "2026-05", minutos: 120, ingresoNeto: 508.47 },
      { periodo: "2026-05", minutos: 45, ingresoNeto: 127.12 },
    ];
    const bases = construirBasesMensuales(atenciones, [
      { periodo: "2026-05", monto: 1000 },
      { periodo: "2026-05", monto: 500 },
    ]);
    const base = bases.get("2026-05")!;
    expect(base.totalIndirectos).toBe(1500);
    expect(base.totalMinutos).toBe(195);
    expect(base.totalAtenciones).toBe(3);
    for (const m of ["MINUTOS", "ATENCIONES", "INGRESOS"] as const) {
      const t = calcularTasa(m, base);
      const suma = atenciones.reduce((s, a) => s + indirectoAtencion(t, a), 0);
      expect(suma).toBeCloseTo(1500, 6);
    }
  });

  it("mes sin atenciones: tasa 0 y fórmula explicativa", () => {
    const t = calcularTasa("MINUTOS", { ...mes, totalMinutos: 0 });
    expect(t.tasa).toBe(0);
    expect(t.formula).toContain("no se pueden prorratear");
  });
});
