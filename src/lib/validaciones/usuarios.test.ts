import { describe, expect, it } from "vitest";
import { esquemaCambioPassword, esquemaConfiguracion, esquemaNuevoUsuario } from "./usuarios";

describe("validaciones de usuarios y configuración", () => {
  it("un odontólogo debe estar vinculado", () => {
    const r = esquemaNuevoUsuario.safeParse({ nombre: "Dr. X", email: "x@clinica.pe", password: "12345678", rol: "ODONTOLOGO", odontologoId: "" });
    expect(r.error?.flatten().fieldErrors.odontologoId?.[0]).toBe("Vincule el usuario a un odontólogo");
  });
  it("contraseña mínima y correo válido", () => {
    const e = esquemaNuevoUsuario.safeParse({ nombre: "A", email: "no-es-correo", password: "123", rol: "CAJA" }).error!.flatten().fieldErrors;
    expect(e.email?.[0]).toBe("Correo electrónico inválido");
    expect(e.password?.[0]).toMatch(/al menos 8/);
  });
  it("confirmación de contraseña", () => {
    expect(esquemaCambioPassword.safeParse({ actual: "x", nueva: "abcdefgh", confirmar: "abcdefgX" }).success).toBe(false);
  });
  it("configuración: porcentajes y RUC", () => {
    expect(esquemaConfiguracion.parse({ nombreClinica: "Sonrisa", igvPorcentaje: "18", margenMinimo: "20", ruc: "20601234567" })).toMatchObject({
      igvPorcentaje: 0.18,
      margenMinimo: 0.2,
    });
    expect(esquemaConfiguracion.safeParse({ nombreClinica: "S", igvPorcentaje: "18", margenMinimo: "20", ruc: "123" }).success).toBe(false);
  });
});
