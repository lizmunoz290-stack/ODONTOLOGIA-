import Link from "next/link";
import type { Metadata } from "next";
import clsx from "clsx";
import { requerirSesion } from "@/lib/auth/sesion";
import { comparativoAnual, datosFinanzas, leerRango, periodosDisponibles } from "@/lib/libro/datos";
import { avanceMeta } from "@/lib/libro/resultado";
import { NOMBRE_DESTINO, type DestinoGasto } from "@/lib/libro/normalizar";
import { formatNumero, formatPorcentaje, formatSoles, nombrePeriodo, periodoCorto } from "@/lib/formato";
import { SERIES } from "@/lib/graficos";
import type { ParamsBusqueda } from "@/lib/filtros";
import { Encabezado } from "@/components/ui/encabezado";
import { Alerta } from "@/components/ui/alerta";
import { Insignia, type ColorInsignia } from "@/components/ui/insignia";
import { TarjetaKpi } from "@/components/dashboard/tarjeta-kpi";
import { FiltroRango } from "@/components/finanzas/filtro-rango";
import { LineasSeries } from "@/components/charts/lineas-series";
import { BarrasRanking } from "@/components/charts/barras-ranking";

export const metadata: Metadata = { title: "Estado de resultados" };

const COLOR_DESTINO: Record<DestinoGasto, ColorInsignia> = {
  DIRECTO_ORTODONCIA: "azul",
  DIRECTO_ODONTOLOGIA: "marca",
  DIRECTO_COMPARTIDO: "gris",
  INDIRECTO: "ambar",
  NO_OPERATIVO: "rojo",
};
const REPARTO = { INGRESOS: "según los ingresos de cada especialidad", MITAD: "50 % y 50 %", FIJO: "con porcentaje fijo" };

function Avance({ valor, meta }: { valor: number; meta?: number }) {
  const a = avanceMeta(valor, meta);
  if (a === null) return <span className="text-slate-400">—</span>;
  return <span className={clsx("font-semibold", a >= 1 ? "text-emerald-700" : a >= 0.9 ? "text-amber-700" : "text-red-700")}>{formatPorcentaje(a, 0)}</span>;
}

export default async function EstadoResultados({ searchParams }: { searchParams: Promise<ParamsBusqueda> }) {
  await requerirSesion("verCostos");
  const disponibles = await periodosDisponibles();
  if (!disponibles.length) {
    return (
      <>
        <Encabezado titulo="Estado de resultados" />
        <Alerta tipo="info" titulo="Todavía no hay datos del libro contable">
          Importe su Excel de ingresos y gastos en{" "}
          <Link href="/finanzas/importar" className="font-semibold underline">
            Importar libro
          </Link>
          .
        </Alerta>
      </>
    );
  }
  const sp = await searchParams;
  const r = leerRango(sp, disponibles);
  const [d, anual] = await Promise.all([datosFinanzas(r), comparativoAnual()]);
  const t = d.total;
  const ticket = d.cobros ? t.total.ingresos / d.cobros : 0;
  const crecen = d.tipos.filter((x) => x.anterior > 0 && x.monto > x.anterior * 1.2 && x.monto - x.anterior > 1000 && x.destino !== "NO_OPERATIVO").slice(0, 5);
  const anios = anual.map((a) => a.anio);
  const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];
  const datosAnual = MESES_CORTOS.map((etiqueta, i) => ({
    etiqueta,
    ...Object.fromEntries(anual.map((a) => [a.anio, a.meses.find((m) => m.mes === i + 1)?.ingresos])),
  })) as Record<string, number | string>[];
  const [ah, mh] = r.hasta.split("-").map(Number);
  const qs = new URLSearchParams({ desde: `${r.desde}-01`, hasta: new Date(Date.UTC(ah, mh, 0)).toISOString().slice(0, 10) }).toString();

  return (
    <>
      <Encabezado
        titulo="Estado de resultados"
        descripcion={`${nombrePeriodo(r.desde)} a ${nombrePeriodo(r.hasta)} · datos del libro contable (ingresos y gastos reales)`}
        acciones={
          <a href={`/api/reportes/estado-resultados/excel?${qs}`} className="btn btn-excel" download>
            ⬇ Descargar Excel
          </a>
        }
      />
      <FiltroRango desde={r.desde} hasta={r.hasta} disponibles={disponibles} rango={r.rango} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <TarjetaKpi etiqueta="Ingresos" valor={formatSoles(t.total.ingresos)} detalle={`${formatNumero(d.cobros, 0)} cobros`} destacado />
        <TarjetaKpi etiqueta="Gastos operativos" valor={formatSoles(t.total.costoTotal)} detalle={`${formatPorcentaje(t.total.ingresos ? t.total.costoTotal / t.total.ingresos : 0)} de los ingresos`} />
        <TarjetaKpi
          etiqueta="Utilidad operativa"
          valor={formatSoles(t.total.utilidad)}
          detalle={`Margen ${formatPorcentaje(t.total.margen)}`}
          tono={t.total.utilidad < 0 ? "critico" : t.total.margen < 0.2 ? "aviso" : "bueno"}
        />
        <TarjetaKpi etiqueta="Flujo neto de caja" valor={formatSoles(t.flujoNeto)} detalle={`Tras ${formatSoles(t.noOperativo)} no operativos`} />
        <TarjetaKpi etiqueta="Pacientes que pagaron" valor={formatNumero(d.pacientesUnicos, 0)} detalle={`Ticket promedio ${formatSoles(ticket)}`} />
      </div>

      {/* Por especialidad */}
      <section className="mt-5">
        <h2 className="text-lg font-semibold text-slate-900">¿Qué especialidad es más rentable?</h2>
        <p className="mb-3 text-sm text-slate-500">
          Costos directos propios de cada especialidad, más su parte de los compartidos (materiales, rayos X) y de los gastos fijos, repartidos {REPARTO[d.reparto.metodo]}.{" "}
          <Link href="/finanzas/clasificacion" className="text-marca-700 underline">
            Cambiar clasificación o reparto
          </Link>
        </p>
        <div className="tarjeta overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th />
                <th className="num">Ortodoncia</th>
                <th className="num">Odontología</th>
                <th className="num">Total clínica</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["Ingresos", "ingresos"],
                  ["Costo directo propio", "directo"],
                  ["Directo compartido asignado", "compartido"],
                  ["Gastos fijos asignados", "indirecto"],
                  ["Costo total", "costoTotal"],
                ] as const
              ).map(([n, k]) => (
                <tr key={k} className={k === "costoTotal" ? "font-medium" : ""}>
                  <td>{n}</td>
                  <td className="num">{formatSoles(t.ORTODONCIA[k])}</td>
                  <td className="num">{formatSoles(t.ODONTOLOGIA[k])}</td>
                  <td className="num">{formatSoles(t.total[k])}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Utilidad operativa</td>
                {[t.ORTODONCIA, t.ODONTOLOGIA, t.total].map((x, i) => (
                  <td key={i} className={clsx("num", x.utilidad < 0 && "text-red-700")}>
                    {formatSoles(x.utilidad)}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Margen</td>
                {[t.ORTODONCIA, t.ODONTOLOGIA, t.total].map((x, i) => (
                  <td key={i} className={clsx("num", x.margen < 0 ? "text-red-700" : x.margen < 0.2 ? "text-amber-700" : "text-emerald-700")}>
                    {formatPorcentaje(x.margen)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          No operativos ({formatSoles(t.noOperativo)}): retiros de utilidad, préstamos y letras. No restan a la utilidad operativa, pero sí al flujo neto de caja.
        </p>
      </section>

      {/* Evolución */}
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="tarjeta min-w-0 p-4 sm:p-5">
          <h2 className="font-semibold text-slate-900">Ingresos, gastos y utilidad por mes</h2>
          <p className="mb-3 text-xs text-slate-500">Gastos operativos (sin retiros ni préstamos)</p>
          <LineasSeries
            series={[
              { clave: "ingresos", nombre: "Ingresos", color: SERIES[0] },
              { clave: "gastos", nombre: "Gastos operativos", color: SERIES[1] },
              { clave: "utilidad", nombre: "Utilidad operativa", color: SERIES[2] },
            ]}
            datos={d.meses.map((m) => ({ etiqueta: periodoCorto(m.periodo), ingresos: m.total.ingresos, gastos: m.total.costoTotal, utilidad: m.total.utilidad }))}
          />
        </section>
        <section className="tarjeta min-w-0 p-4 sm:p-5">
          <h2 className="font-semibold text-slate-900">Ingresos: comparación entre años</h2>
          <p className="mb-3 text-xs text-slate-500">Todo el libro, mes a mes</p>
          <LineasSeries series={anios.map((a, i) => ({ clave: a, nombre: a, color: SERIES[i % SERIES.length] }))} datos={datosAnual} />
        </section>
      </div>

      {/* Tabla mensual */}
      <section className="mt-5">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Detalle mensual</h2>
        <div className="tarjeta overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th>Mes</th>
                <th className="num">Ortodoncia</th>
                <th className="num">Meta</th>
                <th className="num">Odontología</th>
                <th className="num">Meta</th>
                <th className="num">Ingresos</th>
                <th className="num">Directos</th>
                <th className="num">Compartidos</th>
                <th className="num">Gastos fijos</th>
                <th className="num">Utilidad</th>
                <th className="num">Margen</th>
                <th className="num">No operativo</th>
                <th className="num">Flujo neto</th>
                <th className="num">Inicios</th>
              </tr>
            </thead>
            <tbody>
              {d.meses.map((m) => {
                const meta = d.metas.get(m.periodo) ?? {};
                const ini = d.inicios.get(m.periodo);
                return (
                  <tr key={m.periodo}>
                    <td className="whitespace-nowrap font-medium">{nombrePeriodo(m.periodo)}</td>
                    <td className="num">{formatSoles(m.ORTODONCIA.ingresos)}</td>
                    <td className="num">
                      <Avance valor={m.ORTODONCIA.ingresos} meta={meta.ORTODONCIA} />
                    </td>
                    <td className="num">{formatSoles(m.ODONTOLOGIA.ingresos)}</td>
                    <td className="num">
                      <Avance valor={m.ODONTOLOGIA.ingresos} meta={meta.ODONTOLOGIA} />
                    </td>
                    <td className="num font-medium">{formatSoles(m.total.ingresos)}</td>
                    <td className="num">{formatSoles(m.total.directo)}</td>
                    <td className="num">{formatSoles(m.total.compartido)}</td>
                    <td className="num">{formatSoles(m.total.indirecto)}</td>
                    <td className={clsx("num font-medium", m.total.utilidad < 0 && "text-red-700")}>{formatSoles(m.total.utilidad)}</td>
                    <td className="num">{formatPorcentaje(m.total.margen)}</td>
                    <td className="num text-slate-500">{m.noOperativo ? formatSoles(m.noOperativo) : "—"}</td>
                    <td className={clsx("num", m.flujoNeto < 0 && "text-red-700")}>{formatSoles(m.flujoNeto)}</td>
                    <td className="num">
                      {ini ?? "—"}
                      {ini !== undefined && meta.INICIOS ? <span className="block text-[11px] text-slate-500">meta {meta.INICIOS}</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="num">{formatSoles(t.ORTODONCIA.ingresos)}</td>
                <td />
                <td className="num">{formatSoles(t.ODONTOLOGIA.ingresos)}</td>
                <td />
                <td className="num">{formatSoles(t.total.ingresos)}</td>
                <td className="num">{formatSoles(t.total.directo)}</td>
                <td className="num">{formatSoles(t.total.compartido)}</td>
                <td className="num">{formatSoles(t.total.indirecto)}</td>
                <td className="num">{formatSoles(t.total.utilidad)}</td>
                <td className="num">{formatPorcentaje(t.total.margen)}</td>
                <td className="num">{formatSoles(t.noOperativo)}</td>
                <td className="num">{formatSoles(t.flujoNeto)}</td>
                <td className="num">{[...d.inicios.values()].reduce((s, v) => s + v, 0) || "—"}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-1 text-xs text-slate-500">Meta = avance contra la meta del mes (verde ≥ 100 %, ámbar ≥ 90 %). Las metas se editan en Metas e inicios.</p>
      </section>

      {/* Gastos por tipo y medios de pago */}
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <section className="tarjeta min-w-0 p-4 sm:p-5 xl:col-span-2">
          <h2 className="font-semibold text-slate-900">¿En qué se gasta?</h2>
          <p className="mb-3 text-xs text-slate-500">Por tipo de gasto, comparado con el periodo anterior de igual duración.</p>
          {crecen.length > 0 && (
            <Alerta tipo="aviso" className="mb-3" titulo="Gastos que crecieron más de 20 %">
              {crecen.map((x) => `${x.nombre} (${formatSoles(x.anterior)} → ${formatSoles(x.monto)})`).join(" · ")}
            </Alerta>
          )}
          <div className="max-h-[480px] overflow-auto">
            <table className="tabla">
              <thead className="sticky top-0">
                <tr>
                  <th>Tipo de gasto</th>
                  <th>Clasificación</th>
                  <th className="num">Monto</th>
                  <th className="num">% ingresos</th>
                  <th className="num">Periodo anterior</th>
                </tr>
              </thead>
              <tbody>
                {d.tipos.map((x) => (
                  <tr key={x.id}>
                    <td>
                      <Link href={`/finanzas/gastos?tipo=${x.id}&desde=${r.desde}&hasta=${r.hasta}`} className="font-medium text-marca-700 hover:underline">
                        {x.nombre}
                      </Link>
                      <span className="block text-xs text-slate-500">{x.cantidad} movimientos</span>
                    </td>
                    <td>
                      <Insignia color={COLOR_DESTINO[x.destino]}>{NOMBRE_DESTINO[x.destino]}</Insignia>
                    </td>
                    <td className="num">{formatSoles(x.monto)}</td>
                    <td className="num">{formatPorcentaje(t.total.ingresos ? x.monto / t.total.ingresos : 0)}</td>
                    <td className="num text-slate-500">{x.anterior ? formatSoles(x.anterior) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="tarjeta min-w-0 p-4 sm:p-5">
          <h2 className="font-semibold text-slate-900">Ingresos por medio de pago</h2>
          <p className="mb-3 text-xs text-slate-500">Monto cobrado en el periodo</p>
          <BarrasRanking
            formato="soles"
            datos={d.medios.map((m) => ({
              nombre: m.medio,
              valor: m.monto,
              detalle: [
                { etiqueta: "Participación", valor: formatPorcentaje(m.monto / (t.total.ingresos || 1)) },
                { etiqueta: "Cobros", valor: formatNumero(m.cantidad, 0) },
              ],
            }))}
          />
        </section>
      </div>
    </>
  );
}
