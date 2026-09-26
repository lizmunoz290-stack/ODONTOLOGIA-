import "server-only";
import { obtenerConfiguracion, prisma } from "../db";

/** Listas que necesita el formulario de atención. */
export async function datosFormularioAtencion() {
  const [servicios, odontologos, pacientes, config] = await Promise.all([
    prisma.servicio.findMany({
      select: { id: true, nombre: true, precio: true, categoria: true, activo: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.odontologo.findMany({ select: { id: true, nombre: true, activo: true }, orderBy: { nombre: "asc" } }),
    prisma.paciente.findMany({ select: { nombre: true, dni: true }, orderBy: { createdAt: "desc" }, take: 3000 }),
    obtenerConfiguracion(),
  ]);
  return { servicios, odontologos, pacientes, tasaIgv: config.igvPorcentaje };
}
