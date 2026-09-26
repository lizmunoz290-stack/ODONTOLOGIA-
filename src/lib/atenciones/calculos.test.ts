import { describe, expect, it } from "vitest";
import { calcularMontos, documentoValido } from "./calculos";

const base = { precioLista: 150, descuento: 0, incluyeIgv: true, estadoPago: "PAGADO" as const, tasaIgv: 0.18 };

describe("montos de una atención", () => {
  it("pagado con IGV incluido", () => {
    const r = calcularMontos({ ...base, descuento: 32 });
    expect(r).toEqual({ ok: true, montos: { precioCobrado: 118, igv: 18, ingresoNeto: 100, montoPagado: 118, saldo: 0 } });
  });
  it("sin IGV el neto es el precio cobrado", () => {
    const r = calcularMontos({ ...base, incluyeIgv: false });
    expect(r.ok && r.montos.ingresoNeto).toBe(150);
    expect(r.ok && r.montos.igv).toBe(0);
  });
  it("pendiente: nada pagado, saldo total", () => {
    const r = calcularMontos({ ...base, estadoPago: "PENDIENTE", montoPagado: 50 });
    expect(r.ok && r.montos).toMatchObject({ montoPagado: 0, saldo: 150 });
  });
  it("parcial válido e inválido", () => {
    const r = calcularMontos({ ...base, estadoPago: "PARCIAL", montoPagado: 50 });
    expect(r.ok && r.montos.saldo).toBe(100);
    const mal = calcularMontos({ ...base, estadoPago: "PARCIAL", montoPagado: 150 });
    expect(mal.ok).toBe(false);
  });
  it("descuento mayor al precio es inválido", () => {
    const r = calcularMontos({ ...base, descuento: 200 });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errores.descuento).toMatch(/mayor al precio/);
  });
  it("valida documentos", () => {
    expect(documentoValido("45678912")).toBe(true);
    expect(documentoValido("4567891")).toBe(false);
    expect(documentoValido("CE0012345")).toBe(true);
  });
});
