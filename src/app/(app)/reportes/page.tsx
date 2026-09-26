import Link from "next/link";
import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { REPORTES } from "@/lib/reportes/definiciones";
import { Encabezado } from "@/components/ui/encabezado";

export const metadata: Metadata = { title: "Reportes" };

export default async function PaginaReportes() {
  const sesion = await requerirSesion("verReportes");
  const verCostos = puede(sesion.rol, "verCostos");
  const disponibles = REPORTES.filter((r) => verCostos || !r.soloCostos);
  return (
    <>
      <Encabezado titulo="Reportes" descripcion="Cada reporte se puede ver en pantalla y descargar en Excel con el periodo y filtros elegidos." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {disponibles.map((r, i) => (
          <Link
            key={r.tipo}
            href={`/reportes/${r.tipo}`}
            className="tarjeta group flex flex-col p-5 transition hover:border-marca-300 hover:shadow-md"
          >
            <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-marca-50 text-sm font-bold text-marca-700">{i + 1}</span>
            <h2 className="font-semibold text-slate-900 group-hover:text-marca-700">{r.titulo}</h2>
            <p className="mt-1 flex-1 text-sm text-slate-500">{r.descripcion}</p>
            <span className="mt-3 text-sm font-medium text-marca-700">Ver reporte →</span>
          </Link>
        ))}
      </div>
    </>
  );
}
