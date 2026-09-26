import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { prisma } from "@/lib/db";
import { filtrosAQuery, leerFiltros, type ParamsBusqueda } from "@/lib/filtros";
import { construirReporte, infoReporte } from "@/lib/reportes/definiciones";
import { formatFecha, parseFechaISO } from "@/lib/formato";
import { Encabezado } from "@/components/ui/encabezado";
import { FiltrosPanel } from "@/components/filtros/filtros-panel";
import { TablaReporte } from "@/components/reportes/tabla-reporte";
import { SelectorServicio } from "@/components/reportes/selector-servicio";

export async function generateMetadata({ params }: { params: Promise<{ tipo: string }> }): Promise<Metadata> {
  return { title: infoReporte((await params).tipo)?.titulo ?? "Reporte" };
}

export default async function PaginaReporte({ params, searchParams }: { params: Promise<{ tipo: string }>; searchParams: Promise<ParamsBusqueda> }) {
  const sesion = await requerirSesion("verReportes");
  const info = infoReporte((await params).tipo);
  if (!info) notFound();
  const verCostos = puede(sesion.rol, "verCostos");
  if (info.soloCostos && !verCostos) redirect("/sin-acceso");

  const sp = await searchParams;
  const filtros = leerFiltros(sp, "mes");
  const esOdontologo = sesion.rol === "ODONTOLOGO";
  if (esOdontologo) filtros.odontologoId = sesion.odontologoId ?? -1;

  const [reporte, odontologos, servicios] = await Promise.all([
    construirReporte(info.tipo, filtros, verCostos),
    prisma.odontologo.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    info.tipo === "ficha-tecnica" ? prisma.servicio.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }) : Promise.resolve([]),
  ]);
  const usaPeriodo = info.tipo !== "ficha-tecnica";
  const urlExcel = `/api/reportes/${info.tipo}/excel?${filtrosAQuery(filtros)}`;

  return (
    <>
      <Encabezado
        titulo={info.titulo}
        descripcion={
          <>
            {info.descripcion}
            {usaPeriodo && (
              <>
                {" "}
                Periodo: {formatFecha(parseFechaISO(filtros.desde))} al {formatFecha(parseFechaISO(filtros.hasta))}.
              </>
            )}
          </>
        }
        acciones={
          <>
            <Link href="/reportes" className="btn btn-secundario">
              ← Reportes
            </Link>
            <a href={urlExcel} className="btn btn-excel" download>
              ⬇ Descargar Excel
            </a>
          </>
        }
      />
      {usaPeriodo ? (
        <FiltrosPanel
          desde={filtros.desde}
          hasta={filtros.hasta}
          odontologos={odontologos}
          mostrarOdontologo={!esOdontologo}
          valores={{ odontologo: filtros.odontologoId, categoria: filtros.categoria, turno: filtros.turno }}
        />
      ) : (
        <SelectorServicio servicios={servicios} valor={filtros.servicioId} />
      )}
      {info.tipo === "consolidado" && (
        <p className="mb-4 text-sm text-slate-600">
          El archivo Excel contiene {reporte.hojas.length} hojas: {reporte.hojas.map((h) => h.nombre).join(", ")}.
        </p>
      )}
      {reporte.hojas.map((h) => (
        <TablaReporte key={h.nombre} hoja={h} limite={info.tipo === "consolidado" ? 50 : 300} />
      ))}
    </>
  );
}
