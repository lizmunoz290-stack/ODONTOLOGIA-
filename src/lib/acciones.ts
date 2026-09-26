/** Tipos y utilidades comunes para las acciones del servidor con formularios. */
import type { ZodError } from "zod";
import { ErrorPermiso } from "./auth/errores";

export interface EstadoFormulario {
  ok?: boolean;
  mensaje?: string;
  errores?: Record<string, string[] | undefined>;
}

export const ESTADO_INICIAL: EstadoFormulario = {};

export function erroresDeZod(e: ZodError): EstadoFormulario {
  return {
    ok: false,
    mensaje: "Revise los campos marcados.",
    errores: e.flatten().fieldErrors as Record<string, string[]>,
  };
}

/** Convierte excepciones conocidas en un mensaje amigable. */
export function manejarError(e: unknown): EstadoFormulario {
  if (e instanceof ErrorPermiso) return { ok: false, mensaje: e.message };
  if (typeof e === "object" && e && "code" in e && (e as { code: string }).code === "P2002") {
    return { ok: false, mensaje: "Ya existe un registro con ese nombre o código." };
  }
  if (typeof e === "object" && e && "code" in e && (e as { code: string }).code === "P2003") {
    return { ok: false, mensaje: "No se puede eliminar: el registro está siendo usado en otros datos." };
  }
  console.error(e);
  return { ok: false, mensaje: "Ocurrió un error inesperado. Intente nuevamente." };
}
