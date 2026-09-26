/** Firma y verificación del token de sesión (JWT HS256). Compatible con el runtime edge del middleware. */
import { jwtVerify, SignJWT } from "jose";
import type { RolKey } from "../constantes";

export const COOKIE_SESION = "sesion";
export const DURACION_SESION_SEG = 60 * 60 * 12; // 12 horas

export interface DatosSesion {
  id: number;
  nombre: string;
  email: string;
  rol: RolKey;
  odontologoId: number | null;
}

function clave() {
  const secreto = process.env.AUTH_SECRET;
  if (!secreto || secreto.length < 32) {
    throw new Error("AUTH_SECRET no está configurado o tiene menos de 32 caracteres (ver .env.example)");
  }
  return new TextEncoder().encode(secreto);
}

export async function firmarSesion(datos: DatosSesion): Promise<string> {
  return new SignJWT({ ...datos })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEG}s`)
    .sign(clave());
}

export async function verificarSesion(token: string | undefined): Promise<DatosSesion | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave());
    return {
      id: payload.id as number,
      nombre: payload.nombre as string,
      email: payload.email as string,
      rol: payload.rol as RolKey,
      odontologoId: (payload.odontologoId as number | null) ?? null,
    };
  } catch {
    return null;
  }
}
