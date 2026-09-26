import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "../db";
import { redirect } from "next/navigation";
import { COOKIE_SESION, verificarSesion, type DatosSesion } from "./token";
import { puede, type Permiso } from "./permisos";
import { ErrorPermiso } from "./errores";

/**
 * Sesión actual. Además de verificar la firma del token, confirma en la base de datos que el
 * usuario sigue activo y toma su rol vigente (así, desactivar o cambiar de rol surte efecto de inmediato).
 */
export const obtenerSesion = cache(async (): Promise<DatosSesion | null> => {
  const almacen = await cookies();
  const token = await verificarSesion(almacen.get(COOKIE_SESION)?.value);
  if (!token) return null;
  const u = await prisma.usuario.findUnique({
    where: { id: token.id },
    select: { id: true, nombre: true, email: true, rol: true, odontologoId: true, activo: true },
  });
  if (!u || !u.activo) return null;
  return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, odontologoId: u.odontologoId };
});

/** Para páginas: exige sesión (y opcionalmente un permiso); si no, redirige. */
export async function requerirSesion(permiso?: Permiso): Promise<DatosSesion> {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  if (permiso && !puede(sesion.rol, permiso)) redirect("/sin-acceso");
  return sesion;
}

export { ErrorPermiso };

/** Para acciones del servidor y rutas API: lanza ErrorPermiso si no corresponde. */
export async function exigirPermiso(permiso: Permiso): Promise<DatosSesion> {
  const sesion = await obtenerSesion();
  if (!sesion || !puede(sesion.rol, permiso)) throw new ErrorPermiso();
  return sesion;
}
