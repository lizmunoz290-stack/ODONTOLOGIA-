import type { Metadata } from "next";
import clsx from "clsx";
import { requerirSesion } from "@/lib/auth/sesion";
import { prisma } from "@/lib/db";
import { datosFinanzas, leerRango, periodosDisponibles } from "@/lib/libro/datos";
import { avanceMeta } from "@/lib/libro/resultado";
import { finDia, formatNumero, formatPorcentaje, formatSoles, inicioDia, nombrePeriodo, periodoDe } from "@/lib/formato";
import { guardarMetas } from "@/actions/libro";
import type { ParamsBusqueda } from "@/lib/filtros";
import { Encabezado } from "@/components/ui/encabezado";
import { Alerta } from "@/components/ui/alerta";
import { FiltroRango } from "@/components/finanzas/filtro-rango";
import { FormularioAccion } from "@/components/ui/formulario-accion";

export const metadata: Metadata = { title: "Metas e inicios" };
const ultimoDia = (p: string) => new Date(Date.UTC(Number(p.slice(0, 4)), Number(p.slice(5)), 0)).toISOString().slice(0, 10);
/** Nombre + primer apellido: permite enlazar "ANGELI ALEGRIA TAYPE" (inicio) con "ANGELI ALEGRIA" (cobro) */
const clave2 = (s: string) => s.split(" ").slice(0, 2).join(" ");

function Avance({ a }: { a: number | null }) {
  if (a === null) return <span className="text-slate-400">—</span>;
  return <span className={clsx("font-semibold tabular-nums", a >= 1 ? "text-emerald-700" : a >= 0.9 ? "text-amber-700" : "text-red-700")}>{formatPorcentaje(a, 0)}</span>;
}

export default async function MetasInicios({ searchParams }: { searchParams: Promise<ParamsBusqueda> }) {
  await requerirSesion("verCostos");
  const disponibles = await periodosDisponibles();
  if (!disponibles.length) {
    return (
      <>
        <Encabezado titulo="Metas e inicios" />
        <Alerta tipo="info">Importe primero su libro contable.</Alerta>
      </>
    );
  }
  const sp = await searchParams;
  const r = leerRango(sp, disponibles);
  const [d, inicios, ingresos] = await Promise.all([
    datosFinanzas(r),
    prisma.inicio.findMany({ where: { fecha: { gte: inicioDia(`${r.desde}-01`), lte: finDia(ultimoDia(r.hasta)) } }, orderBy: { fecha: "asc" } }),
    prisma.ingreso.findMany({ select: { pacienteClave: true, fecha: true, monto: true } }),
  ]);

  // Enlace inicios ↔ cobros: lo que pagó cada paciente nuevo desde su inicio
  const cobrosPorPaciente = new Map<string, { fecha: number; monto: number }[]>();
  for (const x of ingresos) {
    const k = clave2(x.pacienteClave);
    if (!cobrosPorPaciente.has(k)) cobrosPorPaciente.set(k, []);
    cobrosPorPaciente.get(k)!.push({ fecha: x.fecha.getTime(), monto: x.monto });
  }
  const porAsesora = new Map<string, { inicios: number; pagaron: number; ingresos: number; porMes: Map<string, number> }>();
  for (const i of inicios) {
    const a = porAsesora.get(i.asesora) ?? { inicios: 0, pagaron: 0, ingresos: 0, porMes: new Map() };
    a.inicios += i.cantidad;
    const p = periodoDe(i.fecha);
    a.porMes.set(p, (a.porMes.get(p) ?? 0) + i.cantidad);
    const desde = i.fecha.getTime() - 7 * 86_400_000;
    const cobros = (cobrosPorPaciente.get(clave2(i.pacienteClave)) ?? []).filter((c) => c.fecha >= desde);
    if (cobros.length) {
      a.pagaron++;
      a.ingresos += cobros.reduce((s, c) => s + c.monto, 0);
    }
    porAsesora.set(i.asesora, a);
  }
  const asesoras = [...porAsesora].sort((a, b) => b[1].inicios - a[1].inicios);

  return (
    <>
      <Encabezado titulo="Metas e inicios" descripcion="Metas mensuales por especialidad, inicios (pacientes nuevos) y utilidad, con su avance real." />
      <FiltroRango desde={r.desde} hasta={r.hasta} disponibles={disponibles} rango={r.rango} />

      <section>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Metas del mes</h2>
        <p className="mb-3 text-sm text-slate-500">Escriba la meta y pulse Guardar en la fila. Verde: meta cumplida · ámbar: ≥ 90 % · rojo: menos.</p>
        <div className="tarjeta overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[130px_repeat(4,1fr)_90px] gap-2 bg-slate-100 px-3 py-2 text-xs font-semibold uppercase text-slate-600">
              <span>Mes</span>
              <span>Ortodoncia</span>
              <span>Odontología</span>
              <span>Inicios</span>
              <span>Utilidad</span>
              <span />
            </div>
            {[...d.meses].reverse().map((m) => {
              const meta = d.metas.get(m.periodo) ?? {};
              const ini = d.inicios.get(m.periodo) ?? 0;
              const celdas: [keyof typeof meta, number, (v: number) => string][] = [
                ["ORTODONCIA", m.ORTODONCIA.ingresos, formatSoles],
                ["ODONTOLOGIA", m.ODONTOLOGIA.ingresos, formatSoles],
                ["INICIOS", ini, (v) => formatNumero(v, 0)],
                ["UTILIDAD", m.total.utilidad, formatSoles],
              ];
              return (
                <FormularioAccion key={m.periodo} accion={guardarMetas} mensajeEnLinea className="grid grid-cols-[130px_repeat(4,1fr)_90px] items-start gap-2 border-t border-slate-100 px-3 py-2 text-sm">
                  <input type="hidden" name="periodo" value={m.periodo} />
                  <span className="pt-1.5 font-medium">{nombrePeriodo(m.periodo)}</span>
                  {celdas.map(([k, logrado, fmt]) => (
                    <div key={k}>
                      <input name={k} type="number" min="0" step="any" defaultValue={meta[k] ?? ""} placeholder="Meta" aria-label={`Meta ${k}`} className="input py-1" />
                      <p className="mt-0.5 text-xs text-slate-500">
                        Real {fmt(logrado)} · <Avance a={avanceMeta(logrado, meta[k])} />
                      </p>
                    </div>
                  ))}
                  <button className="btn btn-sm btn-secundario">Guardar</button>
                </FormularioAccion>
              );
            })}
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-500">La utilidad real es la utilidad operativa del estado de resultados (ingresos − gastos operativos).</p>
      </section>

      <section className="mt-6">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Inicios por asesora</h2>
        <p className="mb-3 text-sm text-slate-500">
          Pacientes nuevos captados y lo que han pagado desde su inicio, cruzando la hoja INICIOS con los cobros del libro (por nombre y primer apellido).
        </p>
        {asesoras.length === 0 ? (
          <Alerta tipo="info">No hay inicios registrados en este periodo.</Alerta>
        ) : (
          <div className="tarjeta overflow-x-auto">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Asesora</th>
                  {d.periodos.map((p) => (
                    <th key={p} className="num">
                      {nombrePeriodo(p).slice(0, 3)} {p.slice(2, 4)}
                    </th>
                  ))}
                  <th className="num">Inicios</th>
                  <th className="num">Pagaron</th>
                  <th className="num">Conversión</th>
                  <th className="num">Ingresos generados</th>
                  <th className="num">Por inicio</th>
                </tr>
              </thead>
              <tbody>
                {asesoras.map(([nombre, a]) => (
                  <tr key={nombre}>
                    <td className="font-medium">{nombre}</td>
                    {d.periodos.map((p) => (
                      <td key={p} className="num">
                        {a.porMes.get(p) ?? "—"}
                      </td>
                    ))}
                    <td className="num font-semibold">{a.inicios}</td>
                    <td className="num">{a.pagaron}</td>
                    <td className="num">{formatPorcentaje(a.inicios ? a.pagaron / a.inicios : 0, 0)}</td>
                    <td className="num">{formatSoles(a.ingresos)}</td>
                    <td className="num">{formatSoles(a.inicios ? a.ingresos / a.inicios : 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  {d.periodos.map((p) => (
                    <td key={p} className="num">
                      {d.inicios.get(p) ?? "—"}
                    </td>
                  ))}
                  <td className="num">{asesoras.reduce((s, [, a]) => s + a.inicios, 0)}</td>
                  <td className="num">{asesoras.reduce((s, [, a]) => s + a.pagaron, 0)}</td>
                  <td />
                  <td className="num">{formatSoles(asesoras.reduce((s, [, a]) => s + a.ingresos, 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
