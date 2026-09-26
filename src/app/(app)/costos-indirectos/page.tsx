import type { Metadata } from "next";
import clsx from "clsx";
import { requerirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { obtenerConfiguracion, prisma } from "@/lib/db";
import { analizar } from "@/lib/analisis";
import { CATEGORIAS_GASTO } from "@/lib/constantes";
import { fechaISO, formatNumero, formatPorcentaje, formatSoles, nombrePeriodo, periodoDe, redondear } from "@/lib/formato";
import {
  agruparPor,
  explicarAsignacion,
  FORMULA_METODO,
  NOMBRE_METODO,
  nivelMargen,
  type MetodoProrrateo,
} from "@/lib/costeo";
import { copiarMesAnterior, eliminarGasto, guardarGasto, guardarMetodoProrrateo } from "@/actions/costos";
import { Encabezado } from "@/components/ui/encabezado";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { BotonEliminar } from "@/components/ui/boton-eliminar";
import { BotonAccion } from "@/components/ui/boton-accion";
import { Campo } from "@/components/ui/campo";
import { ContenedorTabla, FilaVacia } from "@/components/ui/tabla";
import { SelectorPeriodo } from "@/components/filtros/selector-periodo";
import { Alerta } from "@/components/ui/alerta";

export const metadata: Metadata = { title: "Costos indirectos" };

const METODOS: MetodoProrrateo[] = ["MINUTOS", "ATENCIONES", "INGRESOS"];

function ultimosPeriodos(desdeBD: string | undefined, n = 18): string[] {
  const actual = periodoDe(new Date());
  let [a, m] = actual.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = `${a}-${String(m).padStart(2, "0")}`;
    out.push(p);
    if (desdeBD && p <= desdeBD && i >= 5) break;
    m--;
    if (m === 0) { m = 12; a--; }
  }
  return out;
}

export default async function PaginaCostosIndirectos({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const sesion = await requerirSesion("verCostos");
  const editar = puede(sesion.rol, "editarCatalogo");
  const cambiarMetodo = puede(sesion.rol, "configurar");
  const sp = await searchParams;
  const primero = await prisma.gastoIndirecto.findFirst({ orderBy: { periodo: "asc" }, select: { periodo: true } });
  const opciones = ultimosPeriodos(primero?.periodo);
  const periodo = sp.periodo && /^\d{4}-\d{2}$/.test(sp.periodo) ? sp.periodo : opciones[0];
  if (!opciones.includes(periodo)) opciones.push(periodo);
  opciones.sort().reverse();

  const [a, m] = periodo.split("-").map(Number);
  const filtrosMes = { desde: `${periodo}-01`, hasta: fechaISO(new Date(Date.UTC(a, m, 0, 12))) };
  const config = await obtenerConfiguracion();
  const [gastos, ...analisis] = await Promise.all([
    prisma.gastoIndirecto.findMany({ where: { periodo }, orderBy: [{ categoria: "asc" }, { descripcion: "asc" }] }),
    ...METODOS.map((metodo) => analizar(filtrosMes, metodo)),
  ]);
  const porMetodo = Object.fromEntries(METODOS.map((mt, i) => [mt, analisis[i]])) as Record<MetodoProrrateo, (typeof analisis)[number]>;
  const actual = porMetodo[config.metodoProrrateo];
  const tasa = actual.tasas.get(periodo)!;
  const totalGastos = redondear(gastos.reduce((s, g) => s + g.monto, 0));

  const porCategoria = new Map<string, number>();
  for (const g of gastos) porCategoria.set(g.categoria, (porCategoria.get(g.categoria) ?? 0) + g.monto);

  const grupos = [...agruparPor(actual.atenciones, (x) => x.servicioId).values()].sort((x, y) => y.costoIndirecto - x.costoIndirecto);
  const gruposPorMetodo = Object.fromEntries(
    METODOS.map((mt) => [mt, agruparPor(porMetodo[mt].atenciones, (x) => x.servicioId)]),
  ) as Record<MetodoProrrateo, ReturnType<typeof agruparPor<(typeof actual.atenciones)[number], number>>>;
  const totalAsignado = redondear(grupos.reduce((s, g) => s + g.costoIndirecto, 0));

  return (
    <>
      <Encabezado
        titulo="Costos indirectos y prorrateo"
        descripcion="Gastos fijos mensuales de la clínica y cómo se reparten entre los servicios."
        acciones={<SelectorPeriodo periodo={periodo} opciones={opciones} />}
      />

      <div className="grid gap-5 2xl:grid-cols-5">
        {/* Gastos del mes */}
        <section className="tarjeta p-4 sm:p-5 2xl:col-span-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900">Gastos de {nombrePeriodo(periodo)}</h2>
            <span className="rounded-lg bg-marca-50 px-3 py-1 font-bold text-marca-800 tabular-nums">Total {formatSoles(totalGastos)}</span>
          </div>

          {gastos.length === 0 && (
            <Alerta tipo="aviso" className="mb-3" titulo="Este mes no tiene gastos registrados">
              {editar && (
                <div className="mt-2">
                  <BotonAccion accion={copiarMesAnterior.bind(null, periodo)}>Copiar gastos del mes anterior</BotonAccion>
                </div>
              )}
            </Alerta>
          )}

          <div className="hidden text-xs font-semibold uppercase text-slate-500 sm:grid sm:grid-cols-12 sm:gap-2 sm:pb-1">
            <span className="col-span-4">Categoría</span>
            <span className="col-span-4">Descripción</span>
            <span className="col-span-2 text-right">Monto</span>
          </div>
          {gastos.map((g) => (
            <div key={g.id} className="grid grid-cols-2 items-center gap-2 border-t border-slate-100 py-2 text-sm sm:grid-cols-12">
              <FormularioAccion accion={guardarGasto.bind(null, g.id)} className="contents" mensajeEnLinea>
                <input type="hidden" name="periodo" value={periodo} />
                <select name="categoria" defaultValue={g.categoria} disabled={!editar} className="input col-span-2 py-1 sm:col-span-4" aria-label="Categoría">
                  {Object.entries(CATEGORIAS_GASTO).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <input name="descripcion" defaultValue={g.descripcion} disabled={!editar} className="input col-span-2 py-1 sm:col-span-4" aria-label="Descripción" />
                <input name="monto" type="number" step="0.01" min="0" defaultValue={g.monto} disabled={!editar} className="input py-1 text-right sm:col-span-2" aria-label="Monto" />
                {editar && <button className="btn btn-sm btn-secundario sm:col-span-1">Guardar</button>}
              </FormularioAccion>
              {editar && (
                <div className="col-span-2 text-right sm:col-span-1">
                  <BotonEliminar accion={eliminarGasto.bind(null, g.id)} texto="Quitar" confirmar={`¿Quitar "${g.descripcion}"?`} />
                </div>
              )}
            </div>
          ))}

          {editar && (
            <FormularioAccion accion={guardarGasto.bind(null, null)} reiniciarAlGuardar className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-12">
              <input type="hidden" name="periodo" value={periodo} />
              <Campo etiqueta="Categoría" nombre="categoria" htmlFor="g-cat" className="sm:col-span-4">
                <select id="g-cat" name="categoria" defaultValue="" required className="input">
                  <option value="" disabled>
                    Seleccione…
                  </option>
                  {Object.entries(CATEGORIAS_GASTO).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo etiqueta="Descripción" nombre="descripcion" htmlFor="g-desc" className="sm:col-span-4">
                <input id="g-desc" name="descripcion" required maxLength={120} className="input" placeholder="Ej. Sueldo recepcionista" />
              </Campo>
              <Campo etiqueta="Monto (S/)" nombre="monto" htmlFor="g-monto" className="sm:col-span-2">
                <input id="g-monto" name="monto" type="number" step="0.01" min="0" required className="input" />
              </Campo>
              <div className="self-end sm:col-span-2">
                <BotonEnvio className="w-full">Agregar</BotonEnvio>
              </div>
            </FormularioAccion>
          )}
        </section>

        {/* Resumen por categoría */}
        <section className="tarjeta p-4 sm:p-5 2xl:col-span-2">
          <h2 className="mb-3 font-semibold text-slate-900">Resumen por categoría</h2>
          <table className="tabla">
            <tbody>
              {Object.entries(CATEGORIAS_GASTO)
                .filter(([k]) => porCategoria.has(k))
                .map(([k, v]) => (
                  <tr key={k}>
                    <td>{v}</td>
                    <td className="num">{formatSoles(porCategoria.get(k)!)}</td>
                    <td className="num text-slate-500">{formatPorcentaje(porCategoria.get(k)! / totalGastos)}</td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td className="num">{formatSoles(totalGastos)}</td>
                <td className="num">100 %</td>
              </tr>
            </tfoot>
          </table>
        </section>
      </div>

      {/* Método de prorrateo */}
      <section className="tarjeta mt-5 p-4 sm:p-5">
        <h2 className="font-semibold text-slate-900">Método de prorrateo</h2>
        <p className="mb-4 text-sm text-slate-500">Define cómo se reparten los gastos fijos entre los servicios. Se aplica al dashboard y a los reportes.</p>
        <FormularioAccion accion={guardarMetodoProrrateo} className="grid gap-3 md:grid-cols-3">
          {METODOS.map((mt) => (
            <label
              key={mt}
              className={clsx(
                "cursor-pointer rounded-xl border-2 p-4 text-sm transition has-[:checked]:border-marca-500 has-[:checked]:bg-marca-50",
                "border-slate-200 hover:border-slate-300",
              )}
            >
              <span className="flex items-center gap-2 font-semibold text-slate-900">
                <input type="radio" name="metodoProrrateo" value={mt} defaultChecked={config.metodoProrrateo === mt} disabled={!cambiarMetodo} className="accent-marca-600" />
                {NOMBRE_METODO[mt]}
                {mt === "MINUTOS" && <span className="text-xs font-normal text-slate-500">(recomendado)</span>}
              </span>
              <span className="mt-2 block text-slate-600">{FORMULA_METODO[mt].explicacion}</span>
              <code className="mt-2 block rounded bg-white/70 p-2 text-xs text-slate-700">
                {FORMULA_METODO[mt].tasa}
                <br />
                {FORMULA_METODO[mt].asignacion}
              </code>
            </label>
          ))}
          {cambiarMetodo && (
            <div className="md:col-span-3">
              <BotonEnvio>Aplicar método</BotonEnvio>
            </div>
          )}
        </FormularioAccion>
      </section>

      {/* Cálculo del mes */}
      <section className="mt-5">
        <h2 className="mb-2 text-lg font-semibold text-slate-900">
          Prorrateo de {nombrePeriodo(periodo)} — {NOMBRE_METODO[config.metodoProrrateo].toLowerCase()}
        </h2>
        <div className="tarjeta mb-4 grid gap-4 p-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-slate-500">Costos indirectos del mes</p>
            <p className="text-lg font-bold tabular-nums">{formatSoles(tasa.totalIndirectos)}</p>
          </div>
          <div>
            <p className="text-slate-500">
              {config.metodoProrrateo === "MINUTOS" ? "Minutos de sillón" : config.metodoProrrateo === "ATENCIONES" ? "Atenciones" : "Ingresos netos (sin IGV)"}
            </p>
            <p className="text-lg font-bold tabular-nums">
              {config.metodoProrrateo === "INGRESOS" ? formatSoles(tasa.base) : formatNumero(tasa.base, 0)}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-slate-500">Fórmula aplicada</p>
            <p className="font-mono text-sm font-semibold text-marca-800">{tasa.formula}</p>
          </div>
        </div>

        <ContenedorTabla>
          <table className="tabla">
            <thead>
              <tr>
                <th>Servicio</th>
                <th className="num">Atenciones</th>
                <th>Cálculo del indirecto por atención</th>
                <th className="num">Indirecto unit.</th>
                <th className="num">Directo unit.</th>
                <th className="num">Costo total unit.</th>
                <th className="num">Precio neto prom.</th>
                <th className="num">Utilidad unit.</th>
                <th className="num">Margen</th>
                <th className="num">Indirecto asignado</th>
              </tr>
            </thead>
            <tbody>
              {grupos.length === 0 && <FilaVacia columnas={10} mensaje="No hay atenciones registradas en este mes." />}
              {grupos.map((g) => {
                const n = g.cantidad;
                const unit = (v: number) => v / n;
                const ejemplo = { minutos: g.items[0].minutos, ingresoNeto: unit(g.ingresoNeto) };
                const nivel = nivelMargen(g.margen, config.margenMinimo);
                return (
                  <tr key={g.items[0].servicioId}>
                    <td className="font-medium">{g.items[0].servicio}</td>
                    <td className="num">{n}</td>
                    <td className="font-mono text-xs text-slate-600">{explicarAsignacion(tasa, ejemplo)}</td>
                    <td className="num">{formatSoles(unit(g.costoIndirecto))}</td>
                    <td className="num">{formatSoles(unit(g.costoDirecto))}</td>
                    <td className="num">{formatSoles(unit(g.costoTotal))}</td>
                    <td className="num">{formatSoles(unit(g.ingresoNeto))}</td>
                    <td className={clsx("num", g.utilidad < 0 && "text-red-600")}>{formatSoles(unit(g.utilidad))}</td>
                    <td className={clsx("num font-semibold", nivel === "NEGATIVO" ? "text-red-600" : nivel === "BAJO" ? "text-amber-600" : "text-emerald-700")}>
                      {formatPorcentaje(g.margen)}
                    </td>
                    <td className="num">{formatSoles(g.costoIndirecto)}</td>
                  </tr>
                );
              })}
            </tbody>
            {grupos.length > 0 && (
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="num">{actual.atenciones.length}</td>
                  <td colSpan={7} className="text-xs font-normal text-slate-500">
                    La suma de lo asignado a todos los servicios es igual al total de costos indirectos del mes.
                  </td>
                  <td className="num">{formatSoles(totalAsignado)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </ContenedorTabla>
      </section>

      {/* Comparación de métodos */}
      {grupos.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-1 text-lg font-semibold text-slate-900">Comparación de métodos</h2>
          <p className="mb-3 text-sm text-slate-500">
            Indirecto por atención y margen neto de cada servicio según el método elegido. Úselo para ver qué tan sensible es la rentabilidad al criterio de reparto.
          </p>
          <ContenedorTabla>
            <table className="tabla">
              <thead>
                <tr>
                  <th rowSpan={2}>Servicio</th>
                  {METODOS.map((mt) => (
                    <th key={mt} colSpan={2} className={clsx("text-center", mt === config.metodoProrrateo && "bg-marca-100")}>
                      {NOMBRE_METODO[mt]}
                    </th>
                  ))}
                </tr>
                <tr>
                  {METODOS.map((mt) => (
                    <FragmentoCabecera key={mt} activo={mt === config.metodoProrrateo} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => {
                  const id = g.items[0].servicioId;
                  return (
                    <tr key={id}>
                      <td className="font-medium">{g.items[0].servicio}</td>
                      {METODOS.map((mt) => {
                        const x = gruposPorMetodo[mt].get(id)!;
                        const nivel = nivelMargen(x.margen, config.margenMinimo);
                        return (
                          <FragmentoCeldas
                            key={mt}
                            indirecto={x.costoIndirecto / x.cantidad}
                            margen={x.margen}
                            nivel={nivel}
                            activo={mt === config.metodoProrrateo}
                          />
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ContenedorTabla>
        </section>
      )}
    </>
  );
}

function FragmentoCabecera({ activo }: { activo: boolean }) {
  return (
    <>
      <th className={clsx("num", activo && "bg-marca-100")}>Indirecto unit.</th>
      <th className={clsx("num", activo && "bg-marca-100")}>Margen</th>
    </>
  );
}

function FragmentoCeldas({ indirecto, margen, nivel, activo }: { indirecto: number; margen: number; nivel: string; activo: boolean }) {
  return (
    <>
      <td className={clsx("num", activo && "bg-marca-50")}>{formatSoles(indirecto)}</td>
      <td className={clsx("num", activo && "bg-marca-50", nivel === "NEGATIVO" ? "text-red-600" : nivel === "BAJO" ? "text-amber-600" : "")}>
        {formatPorcentaje(margen)}
      </td>
    </>
  );
}
