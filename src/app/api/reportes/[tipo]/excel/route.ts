import type { NextRequest } from "next/server";
import { obtenerSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { leerFiltros } from "@/lib/filtros";
import { construirReporte, infoReporte } from "@/lib/reportes/definiciones";
import { metaReporte } from "@/lib/reportes/meta";
import { reportesAExcel } from "@/lib/excel/generar";
import { nombreArchivo, periodoArchivo } from "@/lib/excel/estilos";
import { fechaISO } from "@/lib/formato";

export async function GET(req: NextRequest, { params }: { params: Promise<{ tipo: string }> }) {
  const sesion = await obtenerSesion();
  if (!sesion || !puede(sesion.rol, "verReportes")) return new Response("No autorizado", { status: 401 });
  const info = infoReporte((await params).tipo);
  if (!info) return new Response("Reporte no encontrado", { status: 404 });
  const verCostos = puede(sesion.rol, "verCostos");
  if (info.soloCostos && !verCostos) return new Response("Sin permiso", { status: 403 });

  const filtros = leerFiltros(Object.fromEntries(req.nextUrl.searchParams), "mes");
  if (sesion.rol === "ODONTOLOGO") filtros.odontologoId = sesion.odontologoId ?? -1;

  const [reporte, meta] = await Promise.all([construirReporte(info.tipo, filtros, verCostos), metaReporte(filtros)]);
  const buffer = await reportesAExcel([reporte], meta);
  const archivo = nombreArchivo(info.archivo, periodoArchivo(filtros.desde, filtros.hasta, fechaISO(new Date())));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${archivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
