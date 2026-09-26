import Link from "next/link";
import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { obtenerConfiguracion } from "@/lib/db";
import { serviciosCosteados } from "@/lib/servicios";
import { CATEGORIAS, type CategoriaKey } from "@/lib/constantes";
import { formatPorcentaje, formatSoles } from "@/lib/formato";
import { ingresoNeto, nivelMargen } from "@/lib/costeo";
import { Encabezado } from "@/components/ui/encabezado";
import { ContenedorTabla, FilaVacia } from "@/components/ui/tabla";
import { Insignia } from "@/components/ui/insignia";

export const metadata: Metadata = { title: "Servicios" };

export default async function PaginaServicios({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; estado?: string; q?: string }>;
}) {
  const sesion = await requerirSesion("verCatalogo");
  const verCostos = puede(sesion.rol, "verCostos");
  const editar = puede(sesion.rol, "editarCatalogo");
  const { categoria, estado = "activos", q } = await searchParams;
  const config = await obtenerConfiguracion();

  const servicios = await serviciosCosteados({
    ...(categoria && categoria in CATEGORIAS ? { categoria: categoria as CategoriaKey } : {}),
    ...(estado === "activos" ? { activo: true } : estado === "inactivos" ? { activo: false } : {}),
    ...(q ? { nombre: { contains: q } } : {}),
  });

  return (
    <>
      <Encabezado
        titulo="Catálogo de servicios"
        descripcion={
          verCostos
            ? "Precio de venta, duración y costo directo según la ficha técnica de cada servicio."
            : "Servicios y precios de lista vigentes."
        }
        acciones={
          editar && (
            <Link href="/servicios/nuevo" className="btn btn-primario">
              + Nuevo servicio
            </Link>
          )
        }
      />

      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <input name="q" defaultValue={q} placeholder="Buscar por nombre…" className="input" />
        <select name="categoria" defaultValue={categoria ?? ""} className="input">
          <option value="">Todas las categorías</option>
          {Object.entries(CATEGORIAS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select name="estado" defaultValue={estado} className="input">
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="todos">Todos</option>
        </select>
        <button className="btn btn-secundario">Filtrar</button>
      </form>

      <ContenedorTabla>
        <table className="tabla">
          <thead>
            <tr>
              <th>Servicio</th>
              <th>Categoría</th>
              <th className="num">Precio</th>
              <th className="num">Duración</th>
              <th className="num">Sesiones</th>
              {verCostos && (
                <>
                  <th className="num">Costo directo</th>
                  <th className="num" title="(Precio sin IGV − costo directo) ÷ precio sin IGV">
                    Margen directo
                  </th>
                </>
              )}
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {servicios.length === 0 && <FilaVacia columnas={verCostos ? 8 : 6} mensaje="No se encontraron servicios." />}
            {servicios.map((s) => {
              const neto = ingresoNeto(s.precio, true, config.igvPorcentaje);
              const margen = neto > 0 ? (neto - s.costoDirecto.total) / neto : 0;
              const nivel = nivelMargen(margen, config.margenMinimo);
              return (
                <tr key={s.id}>
                  <td className="font-medium">
                    {verCostos ? (
                      <Link href={`/servicios/${s.id}`} className="text-marca-700 hover:underline">
                        {s.nombre}
                      </Link>
                    ) : (
                      s.nombre
                    )}
                  </td>
                  <td>{CATEGORIAS[s.categoria]}</td>
                  <td className="num">{formatSoles(s.precio)}</td>
                  <td className="num">{s.duracionMin} min</td>
                  <td className="num">{s.sesiones}</td>
                  {verCostos && (
                    <>
                      <td className="num">
                        {s.costoDirecto.total > 0 ? formatSoles(s.costoDirecto.total) : <Insignia color="ambar">Sin ficha</Insignia>}
                      </td>
                      <td className="num">
                        <span className={nivel === "NEGATIVO" ? "text-red-600" : nivel === "BAJO" ? "text-amber-600" : ""}>
                          {formatPorcentaje(margen)}
                        </span>
                      </td>
                    </>
                  )}
                  <td>{s.activo ? <Insignia color="verde">Activo</Insignia> : <Insignia>Inactivo</Insignia>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ContenedorTabla>
      {verCostos && (
        <p className="mt-3 text-xs text-slate-500">
          El margen directo no incluye costos indirectos; vea la rentabilidad completa en el Dashboard. Precios con IGV.
        </p>
      )}
    </>
  );
}
