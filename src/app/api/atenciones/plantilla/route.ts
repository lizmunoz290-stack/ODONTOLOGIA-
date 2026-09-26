import { obtenerConfiguracion, prisma } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { generarPlantilla } from "@/lib/importacion/plantilla";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!puede(sesion?.rol, "registrarAtenciones")) return new Response("Sin permiso", { status: 403 });
  const [config, servicios, odontologos] = await Promise.all([
    obtenerConfiguracion(),
    prisma.servicio.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { nombre: true, precio: true } }),
    prisma.odontologo.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { nombre: true } }),
  ]);
  const buffer = await generarPlantilla({
    nombreClinica: config.nombreClinica,
    servicios,
    odontologos: odontologos.map((o) => o.nombre),
  });
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="Plantilla_Importacion_Atenciones.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
