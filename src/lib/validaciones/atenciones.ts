import { casilla, id, monto, texto, textoOpcional, z } from "./comun";
import { CANALES, ESTADOS_PAGO, METODOS_PAGO, TURNOS } from "../constantes";
import { documentoValido } from "../atenciones/calculos";
import { fechaISO } from "../formato";

const enumDe = <T extends Record<string, string>>(m: T) => z.enum(Object.keys(m) as [keyof T & string, ...(keyof T & string)[]]);

export const esquemaAtencion = z.object({
  fecha: z
    .string({ required_error: "Ingrese la fecha" })
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida")
    .refine((f) => !isNaN(Date.parse(f)), "Fecha inválida")
    .refine((f) => f <= fechaISO(new Date()), "La fecha no puede ser futura")
    .refine((f) => f >= "2000-01-01", "Fecha demasiado antigua"),
  pacienteNombre: texto(100),
  pacienteDni: textoOpcional(12).refine((v) => !v || documentoValido(v), "DNI de 8 dígitos o carné de extranjería (9 a 12 caracteres)"),
  servicioId: id(),
  odontologoId: id(),
  turno: enumDe(TURNOS),
  precioLista: monto().refine((v) => v > 0, "El precio debe ser mayor a 0"),
  descuento: monto().default(0),
  incluyeIgv: casilla(),
  metodoPago: enumDe(METODOS_PAGO),
  estadoPago: enumDe(ESTADOS_PAGO),
  montoPagado: monto().optional(),
  canal: enumDe(CANALES),
  observaciones: textoOpcional(300),
});

export type DatosAtencion = z.infer<typeof esquemaAtencion>;
