import { monto, texto, z } from "./comun";
import { CATEGORIAS_GASTO } from "../constantes";

export const esquemaPeriodo = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Periodo inválido (AAAA-MM)");

export const esquemaGasto = z.object({
  periodo: esquemaPeriodo,
  categoria: z.enum(Object.keys(CATEGORIAS_GASTO) as [keyof typeof CATEGORIAS_GASTO, ...(keyof typeof CATEGORIAS_GASTO)[]]),
  descripcion: texto(120),
  monto: monto().refine((v) => v > 0, "El monto debe ser mayor a 0"),
});

export const esquemaMetodo = z.object({
  metodoProrrateo: z.enum(["MINUTOS", "ATENCIONES", "INGRESOS"]),
});
