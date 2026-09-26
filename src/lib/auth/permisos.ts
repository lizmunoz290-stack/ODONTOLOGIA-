/** Matriz de permisos por rol. Se usa en el middleware, en las páginas y en cada acción del servidor. */
import type { RolKey } from "../constantes";

export const PERMISOS = {
  /** Ver costos, fichas técnicas, utilidades y márgenes */
  verCostos: ["ADMIN"],
  /** Crear/editar servicios, materiales, equipos, odontólogos y gastos */
  editarCatalogo: ["ADMIN"],
  /** Ver el catálogo de servicios (precios) */
  verCatalogo: ["ADMIN", "CAJA", "ODONTOLOGO"],
  /** Registrar y editar atenciones y pagos */
  registrarAtenciones: ["ADMIN", "CAJA"],
  /** Eliminar atenciones */
  eliminarAtenciones: ["ADMIN"],
  /** Ver atenciones (el odontólogo solo las suyas) */
  verAtenciones: ["ADMIN", "CAJA", "ODONTOLOGO"],
  verDashboard: ["ADMIN", "CAJA", "ODONTOLOGO"],
  verReportes: ["ADMIN", "CAJA", "ODONTOLOGO"],
  gestionarUsuarios: ["ADMIN"],
  configurar: ["ADMIN"],
} as const satisfies Record<string, readonly RolKey[]>;

export type Permiso = keyof typeof PERMISOS;

export function puede(rol: RolKey | undefined | null, permiso: Permiso): boolean {
  return !!rol && (PERMISOS[permiso] as readonly RolKey[]).includes(rol);
}

/** Rutas protegidas: prefijo → permiso requerido (el primer prefijo que coincide gana). */
export const RUTAS_PROTEGIDAS: [string, Permiso][] = [
  ["/servicios/nuevo", "editarCatalogo"],
  ["/servicios", "verCatalogo"],
  ["/materiales", "verCostos"],
  ["/equipos", "verCostos"],
  ["/odontologos", "editarCatalogo"],
  ["/costos-indirectos", "verCostos"],
  ["/atenciones/nueva", "registrarAtenciones"],
  ["/atenciones/importar", "registrarAtenciones"],
  ["/atenciones", "verAtenciones"],
  ["/dashboard", "verDashboard"],
  ["/reportes", "verReportes"],
  ["/api/reportes", "verReportes"],
  ["/api/atenciones", "registrarAtenciones"],
  ["/usuarios", "gestionarUsuarios"],
  ["/configuracion", "configurar"],
];

export function permisoParaRuta(ruta: string): Permiso | null {
  for (const [prefijo, permiso] of RUTAS_PROTEGIDAS) {
    if (ruta === prefijo || ruta.startsWith(prefijo + "/")) return permiso;
  }
  return null;
}
