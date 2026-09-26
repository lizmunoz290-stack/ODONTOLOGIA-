import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESION, verificarSesion, type DatosSesion } from "./token";
import { puede, type Permiso } from "./permisos";
import { ErrorPermiso } from "./errores";

export async function obtenerSesion(): Promise<DatosSesion | null> {
  const almacen = await cookies();
  return verificarSesion(almacen.get(COOKIE_SESION)?.value);
}

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
