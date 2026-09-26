import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth/sesion";
import { obtenerConfiguracion, prisma } from "@/lib/db";
import { servicioCosteado } from "@/lib/servicios";
import { CATEGORIAS, ROLES_MANO_OBRA, TIPOS_TERCERIZADO } from "@/lib/constantes";
import { formatNumero, formatPorcentaje, formatSoles } from "@/lib/formato";
import { costoEquipo, costoManoObra, costoMaterial, depreciacionPorMinuto, ingresoNeto, nivelMargen } from "@/lib/costeo";
import {
  actualizarFichaEquipo,
  actualizarFichaManoObra,
  actualizarFichaMaterial,
  actualizarFichaTercerizado,
  agregarFichaEquipo,
  agregarFichaManoObra,
  agregarFichaMaterial,
  agregarFichaTercerizado,
  eliminarServicio,
  guardarEsterilizacion,
  guardarServicio,
  quitarFilaFicha,
} from "@/actions/catalogo";
import { Encabezado } from "@/components/ui/encabezado";
import { Insignia } from "@/components/ui/insignia";
import { Alerta } from "@/components/ui/alerta";
import { BotonEliminar } from "@/components/ui/boton-eliminar";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { FormularioServicio } from "@/components/servicios/formulario-servicio";

export const metadata: Metadata = { title: "Ficha técnica" };

function Seccion({
  titulo,
  subtotal,
  descripcion,
  children,
}: {
  titulo: string;
  subtotal: number;
  descripcion: string;
  children: React.ReactNode;
}) {
  return (
    <section className="tarjeta p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">{titulo}</h2>
          <p className="text-xs text-slate-500">{descripcion}</p>
        </div>
        <span className="whitespace-nowrap rounded-lg bg-marca-50 px-2.5 py-1 text-sm font-semibold text-marca-800 tabular-nums">
          {formatSoles(subtotal)}
        </span>
      </div>
      {children}
    </section>
  );
}

/** Fila editable: el formulario ocupa las columnas con `display: contents` para alinearse a la grilla. */
const filaGrid = "grid grid-cols-2 items-center gap-2 border-t border-slate-100 py-2 text-sm sm:grid-cols-12";
const cabeceraGrid = "hidden text-xs font-semibold uppercase text-slate-500 sm:grid sm:grid-cols-12 sm:gap-2 pb-1";

export default async function PaginaFichaServicio({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creado?: string }>;
}) {
  await requerirSesion("verCostos");
  const { id: idTexto } = await params;
  const { creado } = await searchParams;
  const id = Number(idTexto);
  if (!Number.isInteger(id)) notFound();
  const [s, materiales, equipos, config, nAtenciones] = await Promise.all([
    servicioCosteado(id),
    prisma.material.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.equipo.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    obtenerConfiguracion(),
    prisma.atencion.count({ where: { servicioId: id } }),
  ]);
  if (!s) notFound();

  const cd = s.costoDirecto;
  const neto = ingresoNeto(s.precio, true, config.igvPorcentaje);
  const margenDirecto = neto - cd.total;
  const pctDirecto = neto > 0 ? margenDirecto / neto : 0;
  const materialesDisponibles = materiales.filter((m) => !s.materiales.some((f) => f.materialId === m.id));
  const equiposDisponibles = equipos.filter((e) => !s.equipos.some((f) => f.equipoId === e.id));

  return (
    <>
      <Encabezado
        titulo={s.nombre}
        descripcion={
          <span className="flex flex-wrap items-center gap-2">
            <Insignia color="marca">{CATEGORIAS[s.categoria]}</Insignia>
            {s.activo ? <Insignia color="verde">Activo</Insignia> : <Insignia>Inactivo</Insignia>}
            <span>
              {s.duracionMin} min × {s.sesiones} sesión(es) = {s.minutos} min de sillón
            </span>
          </span>
        }
        acciones={
          <>
            <Link href="/servicios" className="btn btn-secundario">
              ← Servicios
            </Link>
            {nAtenciones === 0 && (
              <BotonEliminar
                accion={eliminarServicio.bind(null, s.id)}
                confirmar={`¿Eliminar el servicio "${s.nombre}" y su ficha técnica?`}
                texto="Eliminar servicio"
              />
            )}
          </>
        }
      />
      {creado && (
        <Alerta tipo="exito" className="mb-4">
          Servicio creado. Ahora registre su ficha técnica para calcular el costo directo.
        </Alerta>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <details className="tarjeta p-4 sm:p-5" open={!!creado}>
            <summary className="cursor-pointer font-semibold text-slate-900">Datos generales del servicio</summary>
            <div className="mt-4">
              <FormularioServicio servicio={s} accion={guardarServicio.bind(null, s.id)} />
            </div>
          </details>

          {/* Materiales */}
          <Seccion
            titulo="1. Materiales e insumos"
            subtotal={cd.materiales}
            descripcion="Cantidad usada por atención × costo unitario del catálogo de materiales."
          >
            <div className={cabeceraGrid}>
              <span className="col-span-4">Material</span>
              <span className="col-span-2 text-right">Cantidad</span>
              <span className="col-span-2 text-right">Costo unit.</span>
              <span className="col-span-2 text-right">Subtotal</span>
            </div>
            {s.materiales.map((f) => (
              <div key={f.id} className={filaGrid}>
                <FormularioAccion accion={actualizarFichaMaterial.bind(null, f.id, s.id)} className="contents" mensajeEnLinea>
                  <span className="col-span-2 font-medium sm:col-span-4">
                    {f.material.nombre} <span className="text-xs font-normal text-slate-500">({f.material.unidad})</span>
                  </span>
                  <input
                    name="cantidad"
                    type="number"
                    step="any"
                    min="0"
                    defaultValue={f.cantidad}
                    aria-label="Cantidad"
                    className="input py-1 text-right sm:col-span-2"
                  />
                  <span className="num text-slate-500 sm:col-span-2">{formatSoles(f.material.costoUnitario)}</span>
                  <span className="num font-medium sm:col-span-2">{formatSoles(costoMaterial({ cantidad: f.cantidad, costoUnitario: f.material.costoUnitario }))}</span>
                  <button className="btn btn-sm btn-secundario sm:col-span-1">Guardar</button>
                </FormularioAccion>
                <div className="text-right sm:col-span-1">
                  <BotonEliminar accion={quitarFilaFicha.bind(null, "material", f.id, s.id)} texto="Quitar" confirmar={`¿Quitar ${f.material.nombre}?`} />
                </div>
              </div>
            ))}
            <FormularioAccion accion={agregarFichaMaterial.bind(null, s.id)} reiniciarAlGuardar mensajeEnLinea className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-12">
              <select name="materialId" required defaultValue="" className="input sm:col-span-7" aria-label="Material">
                <option value="" disabled>
                  Agregar material…
                </option>
                {materialesDisponibles.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre} — {formatSoles(m.costoUnitario)}/{m.unidad}
                  </option>
                ))}
              </select>
              <input name="cantidad" type="number" step="any" min="0" placeholder="Cantidad" required className="input sm:col-span-3" />
              <div className="sm:col-span-2">
                <BotonEnvio className="w-full" pendiente="…">Agregar</BotonEnvio>
              </div>
            </FormularioAccion>
            <p className="mt-2 text-xs text-slate-500">
              ¿Falta un material? Regístrelo en <Link href="/materiales" className="text-marca-700 underline">Materiales</Link>.
            </p>
          </Seccion>

          {/* Mano de obra */}
          <Seccion
            titulo="2. Mano de obra directa"
            subtotal={cd.manoObra}
            descripcion="(Minutos ÷ 60) × costo por hora del odontólogo y del asistente dental."
          >
            <div className={cabeceraGrid}>
              <span className="col-span-3">Rol</span>
              <span className="col-span-2 text-right">Minutos</span>
              <span className="col-span-3 text-right">Costo por hora</span>
              <span className="col-span-2 text-right">Subtotal</span>
            </div>
            {s.manoObra.map((f) => (
              <div key={f.id} className={filaGrid}>
                <FormularioAccion accion={actualizarFichaManoObra.bind(null, f.id, s.id)} className="contents" mensajeEnLinea>
                  <span className="col-span-2 font-medium sm:col-span-3">{ROLES_MANO_OBRA[f.rol]}</span>
                  <input name="minutos" type="number" min="1" step="1" defaultValue={f.minutos} aria-label="Minutos" className="input py-1 text-right sm:col-span-2" />
                  <input name="costoHora" type="number" min="0" step="0.01" defaultValue={f.costoHora} aria-label="Costo por hora" className="input py-1 text-right sm:col-span-3" />
                  <span className="num font-medium sm:col-span-2">{formatSoles(costoManoObra(f))}</span>
                  <button className="btn btn-sm btn-secundario sm:col-span-1">Guardar</button>
                </FormularioAccion>
                <div className="text-right sm:col-span-1">
                  <BotonEliminar accion={quitarFilaFicha.bind(null, "manoObra", f.id, s.id)} texto="Quitar" />
                </div>
              </div>
            ))}
            <FormularioAccion accion={agregarFichaManoObra.bind(null, s.id)} reiniciarAlGuardar mensajeEnLinea className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-12">
              <select name="rol" required defaultValue="" className="input sm:col-span-4" aria-label="Rol">
                <option value="" disabled>
                  Agregar rol…
                </option>
                {Object.entries(ROLES_MANO_OBRA).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <input name="minutos" type="number" min="1" step="1" placeholder="Minutos" required className="input sm:col-span-3" />
              <input name="costoHora" type="number" min="0" step="0.01" placeholder="S/ por hora" required className="input sm:col-span-3" />
              <div className="sm:col-span-2">
                <BotonEnvio className="w-full" pendiente="…">Agregar</BotonEnvio>
              </div>
            </FormularioAccion>
          </Seccion>

          {/* Equipos */}
          <Seccion
            titulo="3. Equipos utilizados (depreciación)"
            subtotal={cd.equipos}
            descripcion="Depreciación por minuto = costo de adquisición ÷ (vida útil en horas × 60). Costo = minutos de uso × depreciación."
          >
            <div className={cabeceraGrid}>
              <span className="col-span-4">Equipo</span>
              <span className="col-span-2 text-right">Min. de uso</span>
              <span className="col-span-2 text-right">S/ por min</span>
              <span className="col-span-2 text-right">Subtotal</span>
            </div>
            {s.equipos.map((f) => (
              <div key={f.id} className={filaGrid}>
                <FormularioAccion accion={actualizarFichaEquipo.bind(null, f.id, s.id)} className="contents" mensajeEnLinea>
                  <span className="col-span-2 font-medium sm:col-span-4">
                    {f.equipo.nombre}
                    <span className="block text-xs font-normal text-slate-500">
                      {formatSoles(f.equipo.costoAdquisicion)} · {formatNumero(f.equipo.vidaUtilHoras, 0)} h de vida útil
                    </span>
                  </span>
                  <input name="minutosUso" type="number" min="1" step="1" defaultValue={f.minutosUso} aria-label="Minutos de uso" className="input py-1 text-right sm:col-span-2" />
                  <span className="num text-slate-500 sm:col-span-2">
                    S/ {depreciacionPorMinuto(f.equipo.costoAdquisicion, f.equipo.vidaUtilHoras).toFixed(4)}
                  </span>
                  <span className="num font-medium sm:col-span-2">{formatSoles(costoEquipo({ ...f.equipo, minutosUso: f.minutosUso }))}</span>
                  <button className="btn btn-sm btn-secundario sm:col-span-1">Guardar</button>
                </FormularioAccion>
                <div className="text-right sm:col-span-1">
                  <BotonEliminar accion={quitarFilaFicha.bind(null, "equipo", f.id, s.id)} texto="Quitar" />
                </div>
              </div>
            ))}
            <FormularioAccion accion={agregarFichaEquipo.bind(null, s.id)} reiniciarAlGuardar mensajeEnLinea className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-12">
              <select name="equipoId" required defaultValue="" className="input sm:col-span-7" aria-label="Equipo">
                <option value="" disabled>
                  Agregar equipo…
                </option>
                {equiposDisponibles.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
              <input name="minutosUso" type="number" min="1" step="1" placeholder="Minutos de uso" required className="input sm:col-span-3" />
              <div className="sm:col-span-2">
                <BotonEnvio className="w-full" pendiente="…">Agregar</BotonEnvio>
              </div>
            </FormularioAccion>
          </Seccion>

          {/* Esterilización */}
          <Seccion
            titulo="4. Esterilización e instrumental"
            subtotal={cd.esterilizacion}
            descripcion="Costo por atención: bolsas de esterilizar, ciclo de autoclave, desgaste de instrumental."
          >
            <FormularioAccion accion={guardarEsterilizacion.bind(null, s.id)} mensajeEnLinea className="grid gap-2 sm:grid-cols-12">
              <input
                name="costoEsterilizacion"
                type="number"
                min="0"
                step="0.01"
                defaultValue={s.costoEsterilizacion}
                aria-label="Costo de esterilización por atención"
                className="input sm:col-span-4"
              />
              <div className="sm:col-span-2">
                <BotonEnvio className="w-full" pendiente="…">Guardar</BotonEnvio>
              </div>
            </FormularioAccion>
          </Seccion>

          {/* Tercerizados */}
          <Seccion
            titulo="5. Servicios tercerizados"
            subtotal={cd.tercerizados}
            descripcion="Laboratorio dental (coronas, prótesis, carillas) y radiografías o tomografías externas."
          >
            <div className={cabeceraGrid}>
              <span className="col-span-3">Tipo</span>
              <span className="col-span-4">Descripción</span>
              <span className="col-span-3 text-right">Costo</span>
            </div>
            {s.tercerizados.map((f) => (
              <div key={f.id} className={filaGrid}>
                <FormularioAccion accion={actualizarFichaTercerizado.bind(null, f.id, s.id)} className="contents" mensajeEnLinea>
                  <span className="col-span-2 font-medium sm:col-span-3">{TIPOS_TERCERIZADO[f.tipo]}</span>
                  <input name="descripcion" defaultValue={f.descripcion} aria-label="Descripción" className="input col-span-2 py-1 sm:col-span-4" />
                  <input name="costo" type="number" min="0" step="0.01" defaultValue={f.costo} aria-label="Costo" className="input py-1 text-right sm:col-span-3" />
                  <button className="btn btn-sm btn-secundario sm:col-span-1">Guardar</button>
                </FormularioAccion>
                <div className="col-span-2 text-right sm:col-span-1">
                  <BotonEliminar accion={quitarFilaFicha.bind(null, "tercerizado", f.id, s.id)} texto="Quitar" />
                </div>
              </div>
            ))}
            <FormularioAccion accion={agregarFichaTercerizado.bind(null, s.id)} reiniciarAlGuardar mensajeEnLinea className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-12">
              <select name="tipo" required defaultValue="" className="input sm:col-span-3" aria-label="Tipo">
                <option value="" disabled>
                  Tipo…
                </option>
                {Object.entries(TIPOS_TERCERIZADO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <input name="descripcion" placeholder="Descripción (ej. corona de zirconio)" required className="input sm:col-span-4" />
              <input name="costo" type="number" min="0" step="0.01" placeholder="Costo S/" required className="input sm:col-span-3" />
              <div className="sm:col-span-2">
                <BotonEnvio className="w-full" pendiente="…">Agregar</BotonEnvio>
              </div>
            </FormularioAccion>
          </Seccion>
        </div>

        {/* Resumen */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="tarjeta p-5">
            <h2 className="mb-3 font-semibold text-slate-900">Costo directo por atención</h2>
            <dl className="space-y-1.5 text-sm">
              {[
                ["Materiales e insumos", cd.materiales],
                ["Mano de obra directa", cd.manoObra],
                ["Equipos (depreciación)", cd.equipos],
                ["Esterilización e instrumental", cd.esterilizacion],
                ["Servicios tercerizados", cd.tercerizados],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-2">
                  <dt className="text-slate-600">{k}</dt>
                  <dd className="tabular-nums">{formatSoles(v as number)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-2 border-t border-slate-200 pt-2 text-base font-bold">
                <dt>COSTO DIRECTO TOTAL</dt>
                <dd className="whitespace-nowrap tabular-nums text-marca-700">{formatSoles(cd.total)}</dd>
              </div>
            </dl>

            <dl className="mt-5 space-y-1.5 border-t border-slate-200 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-600">Precio de venta (con IGV)</dt>
                <dd className="tabular-nums">{formatSoles(s.precio)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-600">Precio sin IGV ({formatPorcentaje(config.igvPorcentaje, 0)})</dt>
                <dd className="tabular-nums">{formatSoles(neto)}</dd>
              </div>
              <div className="flex justify-between font-semibold">
                <dt>Margen de contribución</dt>
                <dd className={margenDirecto < 0 ? "text-right text-red-600 tabular-nums" : "text-right tabular-nums"}>
                  {formatSoles(margenDirecto)} ({formatPorcentaje(pctDirecto)})
                </dd>
              </div>
            </dl>
            {nivelMargen(pctDirecto, config.margenMinimo) !== "OK" && (
              <Alerta tipo={margenDirecto < 0 ? "error" : "aviso"} className="mt-4">
                {margenDirecto < 0
                  ? "El precio no cubre ni siquiera el costo directo."
                  : `El margen de contribución es menor al ${formatPorcentaje(config.margenMinimo, 0)} y aún faltan los costos indirectos.`}
              </Alerta>
            )}
            <p className="mt-4 text-xs text-slate-500">
              A esto se le suman los costos indirectos prorrateados (alquiler, sueldos administrativos, etc.). Vea el costo total y
              la utilidad en <Link href="/costos-indirectos" className="text-marca-700 underline">Costos indirectos</Link> y en el
              Dashboard.
            </p>
            {nAtenciones > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                Los cambios en la ficha aplican a las nuevas atenciones. Las {formatNumero(nAtenciones, 0)} atenciones ya registradas
                conservan el costo vigente cuando se registraron.
              </p>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
