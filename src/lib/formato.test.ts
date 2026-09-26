import { describe, expect, it } from "vitest";
import { NBSP, formatFecha, formatPorcentaje, formatSoles, parseFechaPeru, periodoDe, periodosEntre, redondear } from "./formato";

describe("formato", () => {
  it("soles", () => {
    expect(formatSoles(1234.5)).toBe(`S/${NBSP}1,234.50`);
    expect(formatSoles(-12)).toBe(`-S/${NBSP}12.00`);
    expect(formatSoles(0.005)).toBe(`S/${NBSP}0.01`);
  });
  it("redondeo", () => {
    expect(redondear(1.005)).toBe(1.01);
    expect(redondear(2.675)).toBe(2.68);
  });
  it("porcentaje", () => {
    expect(formatPorcentaje(0.1234)).toBe("12.3 %");
    expect(formatPorcentaje(NaN)).toBe("—");
  });
  it("fechas en hora de Lima dd/mm/aaaa", () => {
    // 02:00 UTC del 1 de mayo = 21:00 del 30 de abril en Lima
    expect(formatFecha(new Date("2026-05-01T02:00:00Z"))).toBe("30/04/2026");
    expect(periodoDe(new Date("2026-05-01T02:00:00Z"))).toBe("2026-04");
  });
  it("parsea dd/mm/aaaa y rechaza fechas inválidas", () => {
    expect(formatFecha(parseFechaPeru("05/03/2026")!)).toBe("05/03/2026");
    expect(parseFechaPeru("31/02/2026")).toBeNull();
    expect(parseFechaPeru("2026-03-05")).toBeNull();
  });
  it("periodos entre fechas", () => {
    expect(periodosEntre("2025-11-15", "2026-02-01")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});
