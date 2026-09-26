import { describe, expect, it } from "vitest";
import {
  calcularCostoDirecto,
  costoEquipo,
  costoManoObra,
  costoMaterial,
  depreciacionPorMinuto,
  minutosSillon,
} from "../directo";

describe("costeo directo", () => {
  it("depreciación por minuto = costo ÷ (vida útil h × 60)", () => {
    expect(depreciacionPorMinuto(24000, 20000)).toBeCloseTo(0.02, 10);
    expect(depreciacionPorMinuto(1000, 0)).toBe(0);
  });

  it("costo de material, mano de obra y equipo", () => {
    expect(costoMaterial({ cantidad: 2, costoUnitario: 0.7 })).toBeCloseTo(1.4);
    expect(costoManoObra({ minutos: 45, costoHora: 40 })).toBeCloseTo(30);
    expect(costoEquipo({ minutosUso: 30, costoAdquisicion: 24000, vidaUtilHoras: 20000 })).toBeCloseTo(0.6);
  });

  it("suma todos los componentes del costo directo", () => {
    const r = calcularCostoDirecto({
      materiales: [
        { cantidad: 1, costoUnitario: 2.5 }, // anestesia
        { cantidad: 2, costoUnitario: 0.7 }, // guantes
        { cantidad: 0.5, costoUnitario: 12 }, // resina
      ],
      manoObra: [
        { minutos: 30, costoHora: 40 },
        { minutos: 30, costoHora: 10 },
      ],
      equipos: [{ minutosUso: 30, costoAdquisicion: 24000, vidaUtilHoras: 20000 }],
      tercerizados: [{ costo: 15 }],
      costoEsterilizacion: 4,
    });
    expect(r).toEqual({
      materiales: 9.9,
      manoObra: 25,
      equipos: 0.6,
      esterilizacion: 4,
      tercerizados: 15,
      total: 54.5,
    });
  });

  it("el total cuadra con la suma de componentes redondeados", () => {
    const r = calcularCostoDirecto({
      materiales: [{ cantidad: 1, costoUnitario: 0.335 }],
      manoObra: [{ minutos: 7, costoHora: 33 }],
      equipos: [{ minutosUso: 13, costoAdquisicion: 1234, vidaUtilHoras: 777 }],
      tercerizados: [],
      costoEsterilizacion: 0.005,
    });
    expect(r.total).toBeCloseTo(r.materiales + r.manoObra + r.equipos + r.esterilizacion + r.tercerizados, 10);
  });

  it("ficha vacía cuesta cero", () => {
    expect(
      calcularCostoDirecto({ materiales: [], manoObra: [], equipos: [], tercerizados: [], costoEsterilizacion: 0 }).total,
    ).toBe(0);
  });

  it("minutos de sillón = duración × sesiones (mínimo 1 sesión)", () => {
    expect(minutosSillon(60, 2)).toBe(120);
    expect(minutosSillon(30, 0)).toBe(30);
  });
});
