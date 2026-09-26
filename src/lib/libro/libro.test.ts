import { describe, expect, it } from "vitest";
import { claveTexto, destinoPorDefecto, normalizarEspecialidad, normalizarMedioPago, tipoGastoFinal } from "./normalizar";
import { corregirFecha, isoDia, leerFechaCelda } from "./fechas";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("normalización del libro contable", () => {
  it("nombres, medios de pago y especialidades", () => {
    expect(claveTexto("  María  José Pérez ")).toBe("MARIA JOSE PEREZ");
    expect(normalizarMedioPago("Deposito")).toBe("DEPOSITO");
    expect(normalizarMedioPago("EFECTIVO")).toBe("EFECTIVO");
    expect(normalizarMedioPago("CTA CTE")).toBe("CTA CTE");
    expect(normalizarEspecialidad("Ortodoncia")).toBe("ORTODONCIA");
    expect(normalizarEspecialidad("Odontologia")).toBe("ODONTOLOGIA");
    expect(normalizarEspecialidad("")).toBeNull();
  });

  it("unifica variantes de tipos de gasto", () => {
    expect(tipoGastoFinal("Rydent", "")).toBe("RAYDENT");
    expect(tipoGastoFinal("LABORATORIO ORTODONCISTA", "")).toBe("LABORATORIO ORTODONCIA");
    expect(tipoGastoFinal("Técnico de unidades", "")).toBe("SERVICIO TECNICO UNIDADES");
    expect(tipoGastoFinal("Odontologo", "TURNO DR JIMMY")).toBe("ODONTOLOGO");
  });

  it("reclasifica el cajón OTROS por la descripción", () => {
    expect(tipoGastoFinal("Otros", "CANCELACION ALQUILER DICIEMBRE")).toBe("ALQUILER");
    expect(tipoGastoFinal("SERVICIOS OTROS", "ENTEL CORPORATIVO")).toBe("TELEFONIA E INTERNET");
    expect(tipoGastoFinal("Otros", "AC UTILIDAD")).toBe("RETIRO DE UTILIDAD");
    expect(tipoGastoFinal("Otros", "FRACCIONAMIENTO SUNAT WORLD")).toBe("IMPUESTOS");
    expect(tipoGastoFinal("SERVICIOS OTROS", "PUBLICIDAD FACEBOOK")).toBe("PUBLICIDAD");
    expect(tipoGastoFinal("", "1 ERA QUINCENA JUNIO")).toBe("SUELDO");
    expect(tipoGastoFinal("Otros", "DEPOSITO A MOZ")).toBe("OTROS");
  });

  it("destino por defecto de cada tipo", () => {
    expect(destinoPorDefecto("ORTODONCISTA")).toBe("DIRECTO_ORTODONCIA");
    expect(destinoPorDefecto("LABORATORIO ORTODONCIA")).toBe("DIRECTO_ORTODONCIA");
    expect(destinoPorDefecto("COMISION CONTENCION")).toBe("DIRECTO_ORTODONCIA");
    expect(destinoPorDefecto("CIRUJANO")).toBe("DIRECTO_ODONTOLOGIA");
    expect(destinoPorDefecto("COMISION LIMPIEZAS")).toBe("DIRECTO_ODONTOLOGIA");
    expect(destinoPorDefecto("MATERIALES")).toBe("DIRECTO_COMPARTIDO");
    expect(destinoPorDefecto("RAYDENT")).toBe("DIRECTO_COMPARTIDO");
    expect(destinoPorDefecto("MATERIALES ESCRITORIO")).toBe("INDIRECTO");
    expect(destinoPorDefecto("SUELDO")).toBe("INDIRECTO");
    expect(destinoPorDefecto("ALQUILER")).toBe("INDIRECTO");
    expect(destinoPorDefecto("RETIRO DE UTILIDAD")).toBe("NO_OPERATIVO");
    expect(destinoPorDefecto("PRESTAMOS Y LETRAS")).toBe("NO_OPERATIVO");
  });
});

describe("corrección de fechas", () => {
  it("lee fechas de celda, texto y número de serie", () => {
    expect(isoDia(leerFechaCelda(d("2025-01-20"), 2025)!)).toBe("2025-01-20");
    expect(isoDia(leerFechaCelda("22-07", 2025)!)).toBe("2025-07-22");
    expect(isoDia(leerFechaCelda("22/07/2025", 2024)!)).toBe("2025-07-22");
    expect(isoDia(leerFechaCelda(45678, 2025)!)).toBe("2025-01-21");
    expect(leerFechaCelda("31-02", 2025)).toBeNull();
    expect(leerFechaCelda("ANULADO", 2025)).toBeNull();
  });

  it("corrige el año mal escrito según la fila anterior", () => {
    const r = corregirFecha(d("2025-12-02"), d("2024-11-30"), "2025-12-02");
    expect(isoDia(r.fecha!)).toBe("2024-12-02");
    expect(r.correccion).toMatch(/Año corregido/);
    const r2 = corregirFecha(d("2025-01-13"), d("2026-01-12"), "2025-01-13");
    expect(isoDia(r2.fecha!)).toBe("2026-01-13");
  });

  it("respeta el cambio de año real", () => {
    const r = corregirFecha(d("2025-01-02"), d("2024-12-30"), "2025-01-02");
    expect(isoDia(r.fecha!)).toBe("2025-01-02");
    expect(r.correccion).toBeUndefined();
  });

  it("fila sin fecha usa la anterior", () => {
    const r = corregirFecha(null, d("2026-06-14"), "");
    expect(isoDia(r.fecha!)).toBe("2026-06-14");
    expect(r.correccion).toMatch(/sin fecha/);
  });
});
