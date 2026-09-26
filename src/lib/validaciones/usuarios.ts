import { id, texto, textoOpcional, z } from "./comun";
import { ROLES } from "../constantes";

const rol = z.enum(Object.keys(ROLES) as [keyof typeof ROLES, ...(keyof typeof ROLES)[]]);
const password = z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72);

const vinculo = <T extends { rol: string; odontologoId?: number }>(d: T, ctx: z.RefinementCtx) => {
  if (d.rol === "ODONTOLOGO" && !d.odontologoId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["odontologoId"], message: "Vincule el usuario a un odontólogo" });
  }
};

export const esquemaNuevoUsuario = z
  .object({
    nombre: texto(80),
    email: z.string().trim().toLowerCase().email(),
    password,
    rol,
    odontologoId: z.preprocess((v) => (v === "" ? undefined : v), id().optional()),
  })
  .superRefine(vinculo);

export const esquemaEditarUsuario = z
  .object({
    nombre: texto(80),
    email: z.string().trim().toLowerCase().email(),
    rol,
    odontologoId: z.preprocess((v) => (v === "" ? undefined : v), id().optional()),
    activo: z.preprocess((v) => v === "on", z.boolean()),
    password: z.preprocess((v) => (v === "" ? undefined : v), password.optional()),
  })
  .superRefine(vinculo);

export const esquemaCambioPassword = z
  .object({
    actual: z.string().min(1),
    nueva: password,
    confirmar: z.string(),
  })
  .refine((d) => d.nueva === d.confirmar, { path: ["confirmar"], message: "Las contraseñas no coinciden" });

export const esquemaConfiguracion = z.object({
  nombreClinica: texto(80),
  ruc: textoOpcional(11).refine((v) => !v || /^(10|15|17|20)\d{9}$/.test(v), "RUC inválido (11 dígitos, empieza con 10, 15, 17 o 20)"),
  direccion: textoOpcional(150),
  igvPorcentaje: z.preprocess((v) => Number(String(v).replace(",", ".")) / 100, z.number().min(0, "Mínimo 0 %").max(0.5, "Máximo 50 %")),
  margenMinimo: z.preprocess((v) => Number(String(v).replace(",", ".")) / 100, z.number().min(0, "Mínimo 0 %").max(0.9, "Máximo 90 %")),
});
