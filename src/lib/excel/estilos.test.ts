import { describe, expect, it } from "vitest";
import { nombreArchivo, periodoArchivo } from "./estilos";

describe("nombre de archivo de reportes", () => {
  it("usa AAAA-MM para un mes completo o el mes en curso", () => {
    expect(periodoArchivo("2026-08-01", "2026-08-31", "2026-09-26")).toBe("2026-08");
    expect(periodoArchivo("2026-09-01", "2026-09-26", "2026-09-26")).toBe("2026-09");
    expect(periodoArchivo("2026-04-01", "2026-09-26", "2026-09-26")).toBe("2026-04-01_a_2026-09-26");
    expect(periodoArchivo("2026-08-05", "2026-08-31", "2026-09-26")).toBe("2026-08-05_a_2026-08-31");
  });
  it("Reporte_[tipo]_[periodo].xlsx sin tildes ni espacios", () => {
    expect(nombreArchivo("Servicios más vendidos", "2026-09")).toBe("Reporte_Servicios_mas_vendidos_2026-09.xlsx");
  });
});
