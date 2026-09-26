import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { requerirSesion } from "@/lib/auth/sesion";
import { prisma } from "@/lib/db";
import { leerRango, periodosDisponibles } from "@/lib/libro/datos";
import { NOMBRE_DESTINO } from "@/lib/libro/normalizar";
import { finDia, formatFecha, formatNumero, formatSoles, inicioDia } from "@/lib/formato";
import type { ParamsBusqueda } from "@/lib/filtros";
import { Encabezado } from "@/components/ui/encabezado";
import { ContenedorTabla, FilaVacia } from "@/components/ui/tabla";
import { FiltroRango } from "@/components/finanzas/filtro-rango";
import { Paginacion } from "@/components/finanzas/paginacion";
import { SelectorTipo } from "@/components/finanzas/selector-tipo";

export const metadata: Metadata = { title: "Gastos" };
const POR_PAGINA = 100;
const ultimoDia = (p: string) => new Date(Date.UTC(Number(p.slice(0, 4)), Number(p.slice(5)), 0)).toISOString().slice(0, 10);
const DESTINOS = Object.keys(NOMBRE_DESTINO) as (keyof typeof NOMBRE_DESTINO)[];

export default async function Gastos({ searchParams }: { searchParams: Promise<ParamsBusqueda> }) {
  await requerirSesion("verCostos");
  const sp = await searchParams;
  const disponibles = await periodosDisponibles();
  const r = leerRango(sp, disponibles);
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const tipo = Number(sp.tipo) || undefined;
  const destino = DESTINOS.includes(sp.destino as never) ? (sp.destino as (typeof DESTINOS)[number]) : undefined;
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const where: Prisma.GastoWhereInput = {
    fecha: { gte: inicioDia(`${r.desde}-01`), lte: finDia(ultimoDia(r.hasta)) },
    ...(tipo ? { tipoGastoId: tipo } : {}),
    ...(destino ? { tipoGasto: { destino } } : {}),
    ...(q ? { descripcion: { contains: q } } : {}),
  };
  const [total, suma, filas, tipos] = await Promise.all([
    prisma.gasto.count({ where }),
    prisma.gasto.aggregate({ where, _sum: { monto: true } }),
    prisma.gasto.findMany({ where, include: { tipoGasto: true }, orderBy: [{ fecha: "desc" }, { id: "desc" }], skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA }),
    prisma.tipoGasto.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);

  return (
    <>
      <Encabezado
        titulo="Gastos (libro de caja)"
        descripcion="Egresos importados del libro contable. Si un gasto quedó en el tipo equivocado, cámbielo en la columna «Tipo»: el estado de resultados se actualiza al instante."
      />
      {disponibles.length > 0 && <FiltroRango desde={r.desde} hasta={r.hasta} disponibles={disponibles} rango={r.rango} />}
      <form className="tarjeta mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input type="hidden" name="desde" value={r.desde} />
        <input type="hidden" name="hasta" value={r.hasta} />
        <label className="text-xs text-slate-500">
          Descripción
          <input name="q" defaultValue={q} className="input mt-0.5" placeholder="Ej. alquiler, Raydent…" />
        </label>
        <label className="text-xs text-slate-500">
          Tipo de gasto
          <select name="tipo" defaultValue={tipo ?? ""} className="input mt-0.5">
            <option value="">Todos</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          Clasificación
          <select name="destino" defaultValue={destino ?? ""} className="input mt-0.5">
            <option value="">Todas</option>
            {DESTINOS.map((d) => (
              <option key={d} value={d}>
                {NOMBRE_DESTINO[d]}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-primario self-end">Filtrar</button>
      </form>
      <p className="mb-2 text-sm text-slate-600">
        <b>{formatNumero(total, 0)}</b> gastos · <b>{formatSoles(suma._sum.monto ?? 0)}</b>
      </p>
      <ContenedorTabla>
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th className="num">Monto</th>
              <th className="min-w-52">Tipo</th>
              <th>Como estaba en el Excel</th>
              <th>Pago / comprobante</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && <FilaVacia columnas={6} mensaje="No hay gastos con estos filtros." />}
            {filas.map((g) => (
              <tr key={g.id}>
                <td className="whitespace-nowrap">{formatFecha(g.fecha)}</td>
                <td>
                  {g.descripcion}
                  {g.correccion && <span className="block text-xs text-slate-500">{g.correccion}</span>}
                </td>
                <td className="num">{formatSoles(g.monto)}</td>
                <td>
                  <SelectorTipo gastoId={g.id} tipoId={g.tipoGastoId} tipos={tipos} />
                  <span className="mt-0.5 block text-[11px] text-slate-500">{NOMBRE_DESTINO[g.tipoGasto.destino]}</span>
                </td>
                <td className="text-xs text-slate-500">{g.tipoOriginal}</td>
                <td className="text-xs">
                  {g.medioPago}
                  <span className="block text-slate-500">
                    {g.comprobante}
                    {g.numero ? ` N.º ${g.numero}` : ""}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ContenedorTabla>
      <Paginacion pagina={pagina} total={total} porPagina={POR_PAGINA} base="/finanzas/gastos" params={sp} />
    </>
  );
}
