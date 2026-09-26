import { describe, expect, it } from "vitest";
import { esquemaEquipo, esquemaFichaMaterial, esquemaServicio } from "./catalogo";

describe("validaciones del catálogo", () => {
  it("acepta un servicio válido y convierte números y casillas", () => {
    const r = esquemaServicio.parse({
      nombre: " Profilaxis ", categoria: "PREVENTIVA", precio: "80,50", duracionMin: "30", sesiones: "1", activo: "on",
    });
    expect(r).toMatchObject({ nombre: "Profilaxis", precio: 80.5, duracionMin: 30, sesiones: 1, activo: true, costoEsterilizacion: 0 });
  });

  it("rechaza datos inválidos con mensajes en español", () => {
    const r = esquemaServicio.safeParse({ nombre: "", categoria: "OTRA", precio: "0", duracionMin: "2.5", sesiones: "0" });
    expect(r.success).toBe(false);
    const e = r.error!.flatten().fieldErrors;
    expect(e.nombre?.[0]).toBe("Este campo es obligatorio");
    expect(e.categoria?.[0]).toBe("Seleccione una opción válida");
    expect(e.precio?.[0]).toBe("El precio debe ser mayor a 0");
    expect(e.duracionMin?.[0]).toBe("Debe ser un número entero");
    expect(e.sesiones?.[0]).toBe("Mínimo 1 sesión");
  });

  it("valida cantidades y vida útil", () => {
    expect(esquemaFichaMaterial.safeParse({ materialId: "3", cantidad: "0" }).success).toBe(false);
    expect(esquemaFichaMaterial.safeParse({ materialId: "3", cantidad: "abc" }).error?.flatten().fieldErrors.cantidad?.[0]).toBe(
      "Debe ser un número",
    );
    expect(esquemaEquipo.safeParse({ nombre: "Autoclave", costoAdquisicion: "8000", vidaUtilHoras: "0" }).success).toBe(false);
  });
});
