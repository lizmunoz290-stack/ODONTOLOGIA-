import { describe, expect, it } from "vitest";
import { normalizar, validarFila, type Catalogos } from "./validar";

const cat: Catalogos = {
  servicios: new Map([
    [normalizar("Resina simple"), { id: 3, precio: 120, activo: true }],
    [normalizar("Servicio viejo"), { id: 9, precio: 50, activo: false }],
  ]),
  odontologos: new Map([[normalizar("Dra. Ana Torres Salazar"), { id: 1, activo: true }]]),
};

const fila = {
  fecha: "15/03/2026",
  paciente: "Juan Pérez",
  dni: 45678912,
  servicio: "resina SIMPLE",
  odontologo: "Dra. Ana Torres Salazar",
  turno: "manana",
  precioLista: "",
  descuento: 10,
  incluyeIgv: "Sí",
  metodoPago: "Yape/Plin",
  estadoPago: "",
  montoPagado: null,
  canal: "Pasante / walk-in",
  observaciones: "",
};

describe("validación de filas importadas", () => {
  it("acepta etiquetas en español sin distinguir tildes ni mayúsculas y completa valores por defecto", () => {
    const r = validarFila(fila, cat);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.datos).toMatchObject({
      fecha: "2026-03-15",
      pacienteDni: "45678912",
      servicioId: 3,
      odontologoId: 1,
      turno: "MANANA",
      precioLista: 120,
      descuento: 10,
      incluyeIgv: true,
      metodoPago: "YAPE_PLIN",
      estadoPago: "PAGADO",
      canal: "PASANTE",
    });
  });

  it("acepta fechas como Date de Excel", () => {
    const r = validarFila({ ...fila, fecha: new Date(Date.UTC(2026, 2, 15)) }, cat);
    expect(r.ok && r.datos.fecha).toBe("2026-03-15");
  });

  it("reporta todos los errores de la fila", () => {
    const r = validarFila(
      { ...fila, fecha: "31/02/2026", servicio: "Servicio viejo", odontologo: "Dr. X", turno: "noche", metodoPago: "cheque", incluyeIgv: "quizá" },
      cat,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errores).toEqual([
      "Fecha vacía o inválida (use dd/mm/aaaa)",
      'El servicio "Servicio viejo" está inactivo',
      'Odontólogo "Dr. X" no existe',
      'Turno inválido (use "Mañana" o "Tarde")',
      "Método de pago inválido",
      'Incluye IGV debe ser "Sí" o "No"',
    ]);
  });

  it("valida el DNI y el nombre con el esquema del formulario", () => {
    const r = validarFila({ ...fila, dni: "123", paciente: "" }, cat);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errores.join(" | ")).toMatch(/Paciente: Este campo es obligatorio.*DNI: DNI de 8 dígitos/);
  });
});
