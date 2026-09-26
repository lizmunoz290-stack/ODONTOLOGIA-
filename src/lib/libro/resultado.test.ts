import { describe, expect, it } from "vitest";
import { avanceMeta, cuotaOrtodoncia, resultadoMes, sumarMeses } from "./resultado";

const gastos = { DIRECTO_ORTODONCIA: 20000, DIRECTO_ODONTOLOGIA: 10000, DIRECTO_COMPARTIDO: 8000, INDIRECTO: 30000, NO_OPERATIVO: 5000 };

describe("estado de resultados por especialidad", () => {
  it("reparte compartidos e indirectos según los ingresos", () => {
    const r = resultadoMes("2026-01", { ORTODONCIA: 60000, ODONTOLOGIA: 40000 }, gastos, { metodo: "INGRESOS", porcentajeOrtodoncia: 0.5 });
    expect(r.cuotaOrtodoncia).toBeCloseTo(0.6);
    expect(r.ORTODONCIA).toMatchObject({ ingresos: 60000, directo: 20000, compartido: 4800, indirecto: 18000, costoTotal: 42800, utilidad: 17200 });
    expect(r.ODONTOLOGIA).toMatchObject({ directo: 10000, compartido: 3200, indirecto: 12000, utilidad: 14800 });
    // la suma de las especialidades es el total de la clínica
    expect(r.ORTODONCIA.utilidad + r.ODONTOLOGIA.utilidad).toBeCloseTo(r.total.utilidad);
    expect(r.total).toMatchObject({ ingresos: 100000, costoTotal: 68000, utilidad: 32000 });
    expect(r.total.margen).toBeCloseTo(0.32);
    // lo no operativo no resta a la utilidad, pero sí al flujo neto
    expect(r.noOperativo).toBe(5000);
    expect(r.flujoNeto).toBe(27000);
  });

  it("métodos 50/50 y porcentaje fijo", () => {
    expect(cuotaOrtodoncia({ metodo: "MITAD", porcentajeOrtodoncia: 0.9 }, 90, 10)).toBe(0.5);
    expect(cuotaOrtodoncia({ metodo: "FIJO", porcentajeOrtodoncia: 0.7 }, 1, 99)).toBe(0.7);
    expect(cuotaOrtodoncia({ metodo: "INGRESOS", porcentajeOrtodoncia: 0 }, 0, 0)).toBe(0.5);
  });

  it("suma varios meses", () => {
    const rep = { metodo: "INGRESOS" as const, porcentajeOrtodoncia: 0.5 };
    const s = sumarMeses([
      resultadoMes("2026-01", { ORTODONCIA: 60000, ODONTOLOGIA: 40000 }, gastos, rep),
      resultadoMes("2026-02", { ORTODONCIA: 50000, ODONTOLOGIA: 50000 }, gastos, rep),
    ]);
    expect(s.total.ingresos).toBe(200000);
    expect(s.total.utilidad).toBe(64000);
    expect(s.ORTODONCIA.utilidad + s.ODONTOLOGIA.utilidad).toBeCloseTo(64000);
    expect(s.flujoNeto).toBe(54000);
  });

  it("avance de metas", () => {
    expect(avanceMeta(57832.1, 50000)).toBeCloseTo(1.1566, 3);
    expect(avanceMeta(100, undefined)).toBeNull();
  });
});

import { estadoPermiso } from "./permisos";
describe("permisos", () => {
  const hoy = new Date("2026-09-26T12:00:00Z");
  it("clasifica por fecha de vencimiento", () => {
    expect(estadoPermiso(new Date("2026-05-26T12:00:00Z"), hoy).estado).toBe("VENCIDO");
    expect(estadoPermiso(new Date("2026-10-30T12:00:00Z"), hoy)).toEqual({ estado: "POR_VENCER", dias: 34 });
    expect(estadoPermiso(new Date("2027-01-30T12:00:00Z"), hoy).estado).toBe("VIGENTE");
    expect(estadoPermiso(null, hoy).estado).toBe("SIN_FECHA");
  });
});
