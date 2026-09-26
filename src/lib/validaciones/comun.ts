import { z } from "zod";

// Mensajes de error genéricos en español
z.setErrorMap((issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === "undefined" || issue.received === "null") return { message: "Este campo es obligatorio" };
      if (issue.expected === "number") return { message: "Debe ser un número" };
      return { message: "Valor inválido" };
    case z.ZodIssueCode.too_small:
      if (issue.type === "string") return { message: issue.minimum === 1 ? "Este campo es obligatorio" : `Mínimo ${issue.minimum} caracteres` };
      if (issue.type === "number") return { message: issue.inclusive ? `Debe ser mayor o igual a ${issue.minimum}` : `Debe ser mayor a ${issue.minimum}` };
      return { message: "Valor demasiado pequeño" };
    case z.ZodIssueCode.too_big:
      if (issue.type === "string") return { message: `Máximo ${issue.maximum} caracteres` };
      if (issue.type === "number") return { message: `Debe ser menor o igual a ${issue.maximum}` };
      return { message: "Valor demasiado grande" };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: "Seleccione una opción válida" };
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === "email") return { message: "Correo electrónico inválido" };
      return { message: "Formato inválido" };
    default:
      return { message: ctx.defaultError };
  }
});

/** Convierte "12,5" / "12.5" / "" a número (o undefined si está vacío). */
function aNumero(v: unknown) {
  if (v === "" || v === null || v === undefined) return undefined;
  if (typeof v === "number") return v;
  return Number(String(v).trim().replace(/^S\/\s*/i, "").replace(",", "."));
}

export const numero = () => z.preprocess(aNumero, z.number().finite());
export const entero = () => z.preprocess(aNumero, z.number().int("Debe ser un número entero"));
export const monto = () => z.preprocess(aNumero, z.number().finite().min(0).max(1_000_000));
export const texto = (max = 120) => z.string().trim().min(1).max(max);
export const textoOpcional = (max = 200) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());
/** Checkbox HTML: "on" cuando está marcado, ausente cuando no */
export const casilla = () => z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
export const id = () => z.preprocess(aNumero, z.number().int().positive());

export { z };
