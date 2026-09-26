import { describe, expect, it } from "vitest";
import { acumular, agruparPor, participacion } from "../agregados";

const a = (servicio: string, neto: number, directo: number, indirecto: number, minutos = 30) => ({
  servicio,
  precioCobrado: neto * 1.18,
  ingresoNeto: neto,
  costoDirecto: directo,
  costoIndirecto: indirecto,
  minutos,
});

describe("agregados", () => {
  it("acumula ingresos, costos, utilidad, margen y ticket promedio", () => {
    const r = acumular([a("A", 100, 40, 20), a("A", 200, 60, 30)]);
    expect(r.cantidad).toBe(2);
    expect(r.ingresoNeto).toBe(300);
    expect(r.costoTotal).toBe(150);
    expect(r.utilidad).toBe(150);
    expect(r.margen).toBeCloseTo(0.5);
    expect(r.ticketPromedio).toBe(150);
    expect(r.ingresoBruto).toBe(354);
    expect(r.minutos).toBe(60);
  });

  it("lista vacía no divide entre cero", () => {
    const r = acumular([]);
    expect(r.cantidad).toBe(0);
    expect(r.margen).toBe(0);
    expect(r.ticketPromedio).toBe(0);
  });

  it("agrupa por clave", () => {
    const g = agruparPor([a("A", 100, 40, 20), a("B", 50, 45, 10), a("A", 100, 40, 20)], (x) => x.servicio);
    expect(g.get("A")!.cantidad).toBe(2);
    expect(g.get("B")!.utilidad).toBe(-5);
    expect(g.get("B")!.items).toHaveLength(1);
  });

  it("participación", () => {
    expect(participacion(25, 100)).toBe(0.25);
    expect(participacion(5, 0)).toBe(0);
  });
});
