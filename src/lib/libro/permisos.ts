/** Estado de un permiso o licencia según su fecha de vencimiento. */
export type EstadoPermiso = "VENCIDO" | "POR_VENCER" | "VIGENTE" | "SIN_FECHA";

export const DIAS_AVISO = 60;

export function estadoPermiso(vencimiento: Date | null, hoy = new Date()): { estado: EstadoPermiso; dias: number | null } {
  if (!vencimiento) return { estado: "SIN_FECHA", dias: null };
  const dias = Math.floor((vencimiento.getTime() - hoy.getTime()) / 86_400_000);
  if (dias < 0) return { estado: "VENCIDO", dias };
  if (dias <= DIAS_AVISO) return { estado: "POR_VENCER", dias };
  return { estado: "VIGENTE", dias };
}
