import Link from "next/link";
import type { Metadata } from "next";
import clsx from "clsx";
import { requerirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { prisma } from "@/lib/db";
import { leerFiltros, type ParamsBusqueda } from "@/lib/filtros";
import { datosDashboard, type FilaServicio } from "@/lib/dashboard";
import { NOMBRE_METODO } from "@/lib/costeo";
import { CATEGORIAS, TURNOS } from "@/lib/constantes";
import { formatFecha, formatNumero, formatPorcentaje, formatSoles, parseFechaISO } from "@/lib/formato";
import { SERIES } from "@/lib/graficos";
import { Encabezado } from "@/components/ui/encabezado";
import { Insignia } from "@/components/ui/insignia";
import { ContenedorTabla, FilaVacia } from "@/components/ui/tabla";
import { FiltrosPanel } from "@/components/filtros/filtros-panel";
import { TarjetaKpi } from "@/components/dashboard/tarjeta-kpi";
import { LineaEvolucion } from "@/components/charts/linea-evolucion";
import { DonaCategorias } from "@/components/charts/dona-categorias";
import { BarrasRanking } from "@/components/charts/barras-ranking";

export const metadata: Metadata = { title: "Dashboard" };

const ORDENES = {
  utilidad: (a: FilaServicio, b: FilaServicio) => b.utilidad - a.utilidad,
  margen: (a: FilaServicio, b: FilaServicio) => b.margen - a.margen,
  cantidad: (a: FilaServicio, b: FilaServicio) => b.cantidad - a.cantidad,
  ingresos: (a: FilaServicio, b: FilaServicio) => b.ingresoNeto - a.ingresoNeto,
} as const;

function Tarjeta({ titulo, subtitulo, children, className }: { titulo: string; subtitulo?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx("tarjeta min-w-0 p-4 sm:p-5", className)}>
      <h2 className="font-semibold text-slate-900">{titulo}</h2>
      {subtitulo && <p className="mb-3 text-xs text-slate-500">{subtitulo}</p>}
      {!subtitulo && <div className="mb-3" />}
      {children}
    </section>
  );
}

function InsigniaMargen({ fila }: { fila: FilaServicio }) {
  if (fila.nivel === "NEGATIVO") return <Insignia color="rojo">⛔ Margen negativo</Insignia>;
  if (fila.nivel === "BAJO") return <Insignia color="ambar">⚠ Margen bajo</Insignia>;
  return null;
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<ParamsBusqueda> }) {
  const sesion = await requerirSesion("verDashboard");
  const verCostos = puede(sesion.rol, "verCostos");
  const esOdontologo = sesion.rol === "ODONTOLOGO";
  const sp = await searchParams;
  const filtros = leerFiltros(sp, "mes");
  if (esOdontologo) filtros.odontologoId = sesion.odontologoId ?? -1;

  const [d, odontologos] = await Promise.all([
    datosDashboard(filtros),
    prisma.odontologo.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);
  const { total } = d;
  const orden = typeof sp.orden === "string" && sp.orden in ORDENES ? (sp.orden as keyof typeof ORDENES) : "utilidad";
  const tabla = [...d.servicios].sort(ORDENES[orden]);
  const enlaceOrden = (o: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string") q.set(k, v);
    q.set("orden", o);
    return `/dashboard?${q.toString()}#rentabilidad`;
  };
  const masVendido = [...d.servicios].sort(ORDENES.cantidad)[0];
  const top = (fn: (a: FilaServicio, b: FilaServicio) => number) => [...d.servicios].sort(fn).slice(0, 10);

  return (
    <>
      <Encabezado
        titulo={esOdontologo ? "Mi productividad" : "Dashboard"}
        descripcion={
          <>
            Del {formatFecha(parseFechaISO(filtros.desde))} al {formatFecha(parseFechaISO(filtros.hasta))} · {formatNumero(total.cantidad, 0)} atenciones
            {verCostos && <> · Indirectos prorrateados {NOMBRE_METODO[d.analisis.metodo].toLowerCase()}</>}
          </>
        }
        acciones={
          <Link href="/reportes" className="btn btn-secundario">
            Ver reportes
          </Link>
        }
      />
      <FiltrosPanel
        desde={filtros.desde}
        hasta={filtros.hasta}
        odontologos={odontologos}
        mostrarOdontologo={!esOdontologo}
        valores={{ odontologo: filtros.odontologoId, categoria: filtros.categoria, turno: filtros.turno }}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <TarjetaKpi etiqueta="Ingresos del periodo" valor={formatSoles(total.ingresoNeto)} detalle={`${formatSoles(total.ingresoBruto)} cobrado con IGV`} destacado />
        {verCostos ? (
          <TarjetaKpi
            etiqueta="Utilidad del periodo"
            valor={formatSoles(total.utilidad)}
            detalle={`Margen neto ${formatPorcentaje(total.margen)}`}
            tono={total.utilidad < 0 ? "critico" : total.margen < d.margenMinimo ? "aviso" : "bueno"}
          />
        ) : (
          <TarjetaKpi etiqueta="Atenciones" valor={formatNumero(total.cantidad, 0)} detalle={`${formatNumero(total.minutos / 60, 0)} horas de sillón`} />
        )}
        <TarjetaKpi etiqueta="Ticket promedio" valor={formatSoles(total.ticketPromedio)} detalle="Ingreso neto por atención" />
        {verCostos ? (
          <>
            <TarjetaKpi
              etiqueta="Servicio estrella"
              valor={d.estrella?.servicio ?? "—"}
              detalle={d.estrella ? `Aporta ${formatSoles(d.estrella.utilidad)} de utilidad` : undefined}
              texto
            />
            <TarjetaKpi
              etiqueta="Servicio con menor margen"
              valor={d.menorMargen?.servicio ?? "—"}
              detalle={d.menorMargen ? `Margen ${formatPorcentaje(d.menorMargen.margen)}` : undefined}
              tono={d.menorMargen && d.menorMargen.nivel !== "OK" ? (d.menorMargen.nivel === "NEGATIVO" ? "critico" : "aviso") : undefined}
              texto
            />
          </>
        ) : (
          <>
            <TarjetaKpi etiqueta="Servicio más vendido" valor={masVendido?.servicio ?? "—"} detalle={masVendido ? `${masVendido.cantidad} atenciones` : undefined} texto />
            <TarjetaKpi etiqueta="Saldo por cobrar" valor={formatSoles(d.pendienteCobro)} detalle="Pendientes y parciales" />
          </>
        )}
      </div>

      {/* Alertas */}
      {verCostos && d.alertas.length > 0 && (
        <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4" role="status">
          <h2 className="font-semibold text-amber-900">
            ⚠ {d.alertas.length} servicio(s) con margen negativo o menor al {formatPorcentaje(d.margenMinimo, 0)}
          </h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {d.alertas.map((s) => (
              <li key={s.servicioId} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                <span>
                  <Link href={`/servicios/${s.servicioId}`} className="font-medium text-slate-900 hover:underline">
                    {s.servicio}
                  </Link>
                  <span className="block text-xs text-slate-500">
                    Utilidad por atención {formatSoles(s.unit.utilidad)} · {s.cantidad} atenciones
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className={clsx("font-bold tabular-nums", s.nivel === "NEGATIVO" ? "text-red-700" : "text-amber-700")}>{formatPorcentaje(s.margen)}</span>
                  <InsigniaMargen fila={s} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Evolución y categorías */}
      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <Tarjeta
          titulo={verCostos ? "Evolución mensual de ventas y utilidad" : "Evolución mensual de ventas"}
          subtitulo="Últimos 6 meses hasta la fecha final del filtro. Montos sin IGV."
          className="lg:col-span-3"
        >
          <LineaEvolucion datos={d.evolucion} mostrarUtilidad={verCostos} />
        </Tarjeta>
        <Tarjeta titulo="Ingresos por categoría" subtitulo="Participación en los ingresos del periodo." className="lg:col-span-2">
          <DonaCategorias datos={d.categorias} />
        </Tarjeta>
      </div>

      {/* Rankings */}
      <div className={clsx("mt-5 grid gap-5", verCostos ? "xl:grid-cols-3" : "lg:grid-cols-2")}>
        <Tarjeta titulo="Servicios más vendidos" subtitulo="Por número de atenciones.">
          <BarrasRanking
            formato="numero"
            datos={top(ORDENES.cantidad).map((s) => ({
              nombre: s.servicio,
              valor: s.cantidad,
              detalle: [{ etiqueta: "Participación", valor: formatPorcentaje(s.participacionCantidad) }],
            }))}
          />
        </Tarjeta>
        <Tarjeta titulo="Servicios con mayores ingresos" subtitulo="Ingresos sin IGV.">
          <BarrasRanking
            formato="soles"
            datos={top(ORDENES.ingresos).map((s) => ({
              nombre: s.servicio,
              valor: s.ingresoNeto,
              detalle: [{ etiqueta: "Participación", valor: formatPorcentaje(s.participacionIngresos) }],
            }))}
          />
        </Tarjeta>
        {verCostos && (
          <Tarjeta titulo="Servicios más rentables" subtitulo="Utilidad neta total (después de directos e indirectos).">
            <BarrasRanking
              formato="soles"
              color={SERIES[2]}
              datos={top(ORDENES.utilidad).map((s) => ({
                nombre: s.servicio,
                valor: s.utilidad,
                detalle: [
                  { etiqueta: "Margen", valor: formatPorcentaje(s.margen) },
                  { etiqueta: "Por atención", valor: formatSoles(s.unit.utilidad) },
                ],
              }))}
            />
          </Tarjeta>
        )}
      </div>

      {/* Rentabilidad por servicio */}
      {verCostos && (
        <section id="rentabilidad" className="mt-5">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Rentabilidad por servicio</h2>
          <p className="mb-3 text-sm text-slate-500">
            Valores por atención (promedio del periodo). Ordenar por:{" "}
            {(
              [
                ["utilidad", "utilidad total"],
                ["margen", "margen %"],
                ["cantidad", "cantidad"],
                ["ingresos", "ingresos"],
              ] as const
            ).map(([k, v], i) => (
              <span key={k}>
                {i > 0 && " · "}
                <Link href={enlaceOrden(k)} className={clsx("hover:underline", orden === k ? "font-semibold text-marca-700" : "text-slate-600")}>
                  {v}
                </Link>
              </span>
            ))}
          </p>
          <ContenedorTabla>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th className="num">Cant.</th>
                  <th className="num">Precio neto</th>
                  <th className="num">Costo directo</th>
                  <th className="num">Costo indirecto</th>
                  <th className="num">Costo total</th>
                  <th className="num">Utilidad</th>
                  <th className="num">Margen</th>
                  <th className="num">Utilidad total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tabla.length === 0 && <FilaVacia columnas={10} mensaje="No hay atenciones en el periodo." />}
                {tabla.map((s) => (
                  <tr key={s.servicioId} className={clsx(s.nivel === "NEGATIVO" && "bg-red-50/60", s.nivel === "BAJO" && "bg-amber-50/60")}>
                    <td>
                      <span className="font-medium">{s.servicio}</span>
                      <span className="block text-xs text-slate-500">{CATEGORIAS[s.categoria]}</span>
                    </td>
                    <td className="num">{s.cantidad}</td>
                    <td className="num">{formatSoles(s.unit.ingresoNeto)}</td>
                    <td className="num">{formatSoles(s.unit.costoDirecto)}</td>
                    <td className="num">{formatSoles(s.unit.costoIndirecto)}</td>
                    <td className="num">{formatSoles(s.unit.costoTotal)}</td>
                    <td className={clsx("num font-medium", s.unit.utilidad < 0 && "text-red-700")}>{formatSoles(s.unit.utilidad)}</td>
                    <td className={clsx("num font-semibold", s.nivel === "NEGATIVO" ? "text-red-700" : s.nivel === "BAJO" ? "text-amber-700" : "text-emerald-700")}>
                      {formatPorcentaje(s.margen)}
                    </td>
                    <td className={clsx("num", s.utilidad < 0 && "text-red-700")}>{formatSoles(s.utilidad)}</td>
                    <td>
                      <InsigniaMargen fila={s} />
                    </td>
                  </tr>
                ))}
              </tbody>
              {tabla.length > 0 && (
                <tfoot>
                  <tr>
                    <td>Total</td>
                    <td className="num">{total.cantidad}</td>
                    <td className="num">{formatSoles(total.ticketPromedio)}</td>
                    <td className="num">{formatSoles(total.costoDirecto / total.cantidad)}</td>
                    <td className="num">{formatSoles(total.costoIndirecto / total.cantidad)}</td>
                    <td className="num">{formatSoles(total.costoTotal / total.cantidad)}</td>
                    <td className="num">{formatSoles(total.utilidad / total.cantidad)}</td>
                    <td className="num">{formatPorcentaje(total.margen)}</td>
                    <td className="num">{formatSoles(total.utilidad)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </ContenedorTabla>
        </section>
      )}

      {/* Punto de equilibrio */}
      {verCostos && (
        <section className="mt-5">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Punto de equilibrio mensual</h2>
          <p className="mb-3 text-sm text-slate-500">
            Costos fijos promedio: <strong>{formatSoles(d.equilibrio.costosFijosMes)}</strong> al mes. Margen de contribución = precio neto − costo
            directo. <em>Solo este servicio</em>: atenciones necesarias si fuera lo único que vende la clínica (costos fijos ÷ margen de
            contribución). <em>Con la mezcla actual</em>: reparto del equilibrio según su participación en ventas
            {d.equilibrio.totalMezcla !== null && (
              <>
                {" "}
                (total <strong>{formatNumero(d.equilibrio.totalMezcla, 0)}</strong> atenciones/mes; margen de contribución ponderado{" "}
                {formatSoles(d.equilibrio.mcPonderado)})
              </>
            )}
            .
          </p>
          <ContenedorTabla>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th className="num">Precio neto</th>
                  <th className="num">Costo directo</th>
                  <th className="num">Margen contrib.</th>
                  <th className="num">Solo este servicio</th>
                  <th className="num">Con la mezcla actual</th>
                  <th className="num">Vendidas / mes</th>
                </tr>
              </thead>
              <tbody>
                {d.equilibrio.filas.map((f) => (
                  <tr key={f.servicioId}>
                    <td className="font-medium">{f.servicio}</td>
                    <td className="num">{formatSoles(f.precioNeto)}</td>
                    <td className="num">{formatSoles(f.costoDirecto)}</td>
                    <td className={clsx("num", f.margenContribucion <= 0 && "text-red-700")}>{formatSoles(f.margenContribucion)}</td>
                    <td className="num">{f.individual === null ? <Insignia color="rojo">No cubre costos</Insignia> : `${formatNumero(f.individual, 0)} atenciones`}</td>
                    <td className="num">{f.mezcla === null ? "—" : formatNumero(f.mezcla, 0)}</td>
                    <td className="num">{formatNumero(f.vendidasMes, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ContenedorTabla>
        </section>
      )}

      {/* Productividad */}
      <div className="mt-5 grid gap-5 2xl:grid-cols-2">
        {!esOdontologo && (
          <Tarjeta titulo="Productividad por odontólogo">
            <div className="overflow-x-auto">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Odontólogo</th>
                    <th className="num">Atenciones</th>
                    <th className="num">Horas sillón</th>
                    <th className="num">Ingresos</th>
                    <th className="num">S/ por hora</th>
                    {verCostos && <th className="num">Utilidad</th>}
                    {verCostos && <th className="num">Margen</th>}
                  </tr>
                </thead>
                <tbody>
                  {d.odontologos.length === 0 && <FilaVacia columnas={7} />}
                  {d.odontologos.map((o) => (
                    <tr key={o.odontologoId}>
                      <td className="font-medium">{o.odontologo}</td>
                      <td className="num">{o.cantidad}</td>
                      <td className="num">{formatNumero(o.horas, 1)}</td>
                      <td className="num">{formatSoles(o.ingresoNeto)}</td>
                      <td className="num">{formatSoles(o.ingresoPorHora)}</td>
                      {verCostos && <td className={clsx("num", o.utilidad < 0 && "text-red-700")}>{formatSoles(o.utilidad)}</td>}
                      {verCostos && <td className="num">{formatPorcentaje(o.margen)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tarjeta>
        )}
        <Tarjeta titulo="Productividad por turno">
          <div className="overflow-x-auto">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Turno</th>
                  <th className="num">Atenciones</th>
                  <th className="num">Horas sillón</th>
                  <th className="num">Ingresos</th>
                  <th className="num">Ticket prom.</th>
                  <th className="num">S/ por hora</th>
                  {verCostos && <th className="num">Utilidad</th>}
                </tr>
              </thead>
              <tbody>
                {d.turnos.length === 0 && <FilaVacia columnas={7} />}
                {d.turnos.map((t) => (
                  <tr key={t.turno}>
                    <td className="font-medium">{TURNOS[t.turno]}</td>
                    <td className="num">{t.cantidad}</td>
                    <td className="num">{formatNumero(t.horas, 1)}</td>
                    <td className="num">{formatSoles(t.ingresoNeto)}</td>
                    <td className="num">{formatSoles(t.ticketPromedio)}</td>
                    <td className="num">{formatSoles(t.ingresoPorHora)}</td>
                    {verCostos && <td className="num">{formatSoles(t.utilidad)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Tarjeta>
        {esOdontologo && (
          <Tarjeta titulo="Mis servicios">
            <div className="overflow-x-auto">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Servicio</th>
                    <th className="num">Atenciones</th>
                    <th className="num">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {[...d.servicios].sort(ORDENES.cantidad).map((s) => (
                    <tr key={s.servicioId}>
                      <td>{s.servicio}</td>
                      <td className="num">{s.cantidad}</td>
                      <td className="num">{formatSoles(s.ingresoNeto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tarjeta>
        )}
      </div>
    </>
  );
}
