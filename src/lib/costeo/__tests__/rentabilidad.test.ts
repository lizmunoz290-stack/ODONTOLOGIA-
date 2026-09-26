import { describe, expect, it } from "vitest";
import { calcularRentabilidad, nivelMargen } from "../rentabilidad";
import { ingresoNeto, montoIgv } from "../igv";
import { equilibrioIndividual, equilibrioMezcla } from "../equilibrio";

describe("IGV", () => {
  it("quita el 18 % cuando el precio lo incluye", () => {
    expect(ingresoNeto(118, true)).toBe(100);
    expect(ingresoNeto(80, true)).toBe(67.8);
    expect(montoIgv(80, true)).toBe(12.2);
  });
  it("no modifica el precio si no incluye IGV", () => {
    expect(ingresoNeto(80, false)).toBe(80);
    expect(montoIgv(80, false)).toBe(0);
  });
});

describe("rentabilidad", () => {
  it("utilidad y margen", () => {
    const r = calcularRentabilidad({ ingresoNeto: 200, costoDirecto: 80, costoIndirecto: 40 });
    expect(r.costoTotal).toBe(120);
    expect(r.utilidad).toBe(80);
    expect(r.margen).toBeCloseTo(0.4);
  });
  it("margen 0 si no hay ingreso", () => {
    expect(calcularRentabilidad({ ingresoNeto: 0, costoDirecto: 10, costoIndirecto: 0 }).margen).toBe(0);
  });
  it("clasifica alertas de margen", () => {
    expect(nivelMargen(-0.01)).toBe("NEGATIVO");
    expect(nivelMargen(0)).toBe("BAJO");
    expect(nivelMargen(0.1999)).toBe("BAJO");
    expect(nivelMargen(0.2)).toBe("OK");
    expect(nivelMargen(0.25, 0.3)).toBe("BAJO");
  });
});

describe("punto de equilibrio", () => {
  it("individual: costos fijos ÷ margen de contribución (hacia arriba)", () => {
    expect(equilibrioIndividual(10000, 150, 50)).toEqual({ margenContribucion: 100, atenciones: 100 });
    expect(equilibrioIndividual(10000, 150, 53).atenciones).toBe(104); // 10000/97 = 103.09
  });
  it("individual: sin margen de contribución no hay equilibrio", () => {
    expect(equilibrioIndividual(10000, 50, 60).atenciones).toBeNull();
  });
  it("con mezcla de ventas", () => {
    const r = equilibrioMezcla(9000, [
      { id: 1, precioNeto: 100, costoDirecto: 40, cantidad: 30 }, // MC 60, 75 %
      { id: 2, precioNeto: 500, costoDirecto: 200, cantidad: 10 }, // MC 300, 25 %
    ]);
    // MC ponderado = 0.75×60 + 0.25×300 = 120 → 9000/120 = 75 atenciones
    expect(r.mcPonderado).toBe(120);
    expect(r.totalAtenciones).toBe(75);
    expect(r.porServicio.map((s) => s.atenciones)).toEqual([57, 19]); // 56.25→57, 18.75→19
  });
  it("sin ventas no hay mezcla", () => {
    expect(equilibrioMezcla(1000, [{ id: 1, precioNeto: 10, costoDirecto: 5, cantidad: 0 }]).totalAtenciones).toBeNull();
  });
});
