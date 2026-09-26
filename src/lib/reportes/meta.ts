import "server-only";
import { prisma, obtenerConfiguracion } from "../db";
import { CATEGORIAS, TURNOS } from "../constantes";
import { formatFecha, parseFechaISO, ZONA_HORARIA } from "../formato";
import type { Filtros } from "../filtros";
import type { MetaExcel } from "../excel/generar";

export async function metaReporte(f: Filtros): Promise<MetaExcel> {
  const config = await obtenerConfiguracion();
  const partes: string[] = [];
  if (f.odontologoId) {
    const o = await prisma.odontologo.findUnique({ where: { id: f.odontologoId }, select: { nombre: true } });
    if (o) partes.push(`Odontólogo: ${o.nombre}`);
  }
  if (f.servicioId) {
    const s = await prisma.servicio.findUnique({ where: { id: f.servicioId }, select: { nombre: true } });
    if (s) partes.push(`Servicio: ${s.nombre}`);
  }
  if (f.categoria) partes.push(`Categoría: ${CATEGORIAS[f.categoria]}`);
  if (f.turno) partes.push(`Turno: ${TURNOS[f.turno]}`);
  const hora = new Intl.DateTimeFormat("es-PE", { timeZone: ZONA_HORARIA, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  return {
    nombreClinica: config.nombreClinica,
    ruc: config.ruc,
    periodo: `${formatFecha(parseFechaISO(f.desde))} al ${formatFecha(parseFechaISO(f.hasta))}`,
    emision: `${formatFecha(new Date())} ${hora}`,
    filtros: partes.join(" · ") || undefined,
  };
}
