"use client";
import { useMemo, useState } from "react";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { Campo } from "@/components/ui/campo";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { CANALES, CATEGORIAS, ESTADOS_PAGO, METODOS_PAGO, TURNOS, type CategoriaKey, type EstadoPagoKey } from "@/lib/constantes";
import { formatSoles, redondear } from "@/lib/formato";
import { ingresoNeto, montoIgv } from "@/lib/costeo/igv";
import type { EstadoFormulario } from "@/lib/acciones";

export interface OpcionServicio {
  id: number;
  nombre: string;
  precio: number;
  categoria: CategoriaKey;
  activo: boolean;
}

export interface ValoresAtencion {
  fecha: string;
  pacienteNombre: string;
  pacienteDni: string;
  servicioId: number | "";
  odontologoId: number | "";
  turno: string;
  precioLista: number | "";
  descuento: number;
  incluyeIgv: boolean;
  metodoPago: string;
  estadoPago: EstadoPagoKey;
  montoPagado: number | "";
  canal: string;
  observaciones: string;
}

function Opciones({ mapa }: { mapa: Record<string, string> }) {
  return (
    <>
      {Object.entries(mapa).map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </>
  );
}

export function FormularioAtencion({
  accion,
  servicios,
  odontologos,
  pacientes,
  valores,
  tasaIgv,
  hoy,
  esEdicion = false,
}: {
  accion: (p: EstadoFormulario, f: FormData) => Promise<EstadoFormulario>;
  servicios: OpcionServicio[];
  odontologos: { id: number; nombre: string; activo: boolean }[];
  pacientes: { nombre: string; dni: string | null }[];
  valores: ValoresAtencion;
  tasaIgv: number;
  hoy: string;
  esEdicion?: boolean;
}) {
  const [servicioId, setServicioId] = useState<number | "">(valores.servicioId);
  const [precioLista, setPrecioLista] = useState<number | "">(valores.precioLista);
  const [descuento, setDescuento] = useState<number | "">(valores.descuento);
  const [incluyeIgv, setIncluyeIgv] = useState(valores.incluyeIgv);
  const [estadoPago, setEstadoPago] = useState<EstadoPagoKey>(valores.estadoPago);
  const [nombre, setNombre] = useState(valores.pacienteNombre);
  const [dni, setDni] = useState(valores.pacienteDni);

  const porDni = useMemo(() => new Map(pacientes.filter((p) => p.dni).map((p) => [p.dni!, p.nombre])), [pacientes]);
  const porNombre = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const p of pacientes) m.set(p.nombre, m.has(p.nombre) ? null : p.dni); // null si el nombre es ambiguo
    return m;
  }, [pacientes]);

  const lista = Number(precioLista) || 0;
  const desc = Number(descuento) || 0;
  const cobrado = redondear(Math.max(0, lista - desc));
  const neto = ingresoNeto(cobrado, incluyeIgv, tasaIgv);
  const igv = montoIgv(cobrado, incluyeIgv, tasaIgv);

  const serviciosVisibles = servicios.filter((s) => s.activo || s.id === valores.servicioId);
  const porCategoria = Object.entries(CATEGORIAS)
    .map(([k, v]) => ({ cat: v, items: serviciosVisibles.filter((s) => s.categoria === k) }))
    .filter((g) => g.items.length);

  return (
    <FormularioAccion accion={accion} className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <fieldset className="tarjeta grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <legend className="sr-only">Paciente y servicio</legend>
          <Campo etiqueta="Fecha" htmlFor="fecha" nombre="fecha">
            <input id="fecha" name="fecha" type="date" max={hoy} defaultValue={valores.fecha} required className="input" />
          </Campo>
          <Campo etiqueta="Turno" htmlFor="turno" nombre="turno">
            <select id="turno" name="turno" defaultValue={valores.turno} required className="input">
              <option value="" disabled>
                Seleccione…
              </option>
              <Opciones mapa={TURNOS} />
            </select>
          </Campo>
          <Campo etiqueta="Paciente (nombres y apellidos)" htmlFor="pacienteNombre" nombre="pacienteNombre">
            <input
              id="pacienteNombre"
              name="pacienteNombre"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                const d = porNombre.get(e.target.value);
                if (d && !dni) setDni(d);
              }}
              list="lista-pacientes"
              autoComplete="off"
              required
              maxLength={100}
              className="input"
            />
            <datalist id="lista-pacientes">
              {pacientes.map((p, i) => (
                <option key={i} value={p.nombre}>
                  {p.dni ?? ""}
                </option>
              ))}
            </datalist>
          </Campo>
          <Campo etiqueta="DNI (opcional)" htmlFor="pacienteDni" nombre="pacienteDni" ayuda="Si el DNI ya existe, se completa el nombre.">
            <input
              id="pacienteDni"
              name="pacienteDni"
              value={dni}
              onChange={(e) => {
                const v = e.target.value.trim();
                setDni(v);
                const n = porDni.get(v);
                if (n) setNombre(n);
              }}
              inputMode="numeric"
              maxLength={12}
              className="input"
            />
          </Campo>
          <Campo etiqueta="Servicio" htmlFor="servicioId" nombre="servicioId" className="sm:col-span-2">
            <select
              id="servicioId"
              name="servicioId"
              value={servicioId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setServicioId(id);
                const s = servicios.find((x) => x.id === id);
                if (s) setPrecioLista(s.precio);
              }}
              required
              className="input"
            >
              <option value="" disabled>
                Seleccione un servicio…
              </option>
              {porCategoria.map((g) => (
                <optgroup key={g.cat} label={g.cat}>
                  {g.items.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} — {formatSoles(s.precio)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Odontólogo tratante" htmlFor="odontologoId" nombre="odontologoId">
            <select id="odontologoId" name="odontologoId" defaultValue={valores.odontologoId} required className="input">
              <option value="" disabled>
                Seleccione…
              </option>
              {odontologos
                .filter((o) => o.activo || o.id === valores.odontologoId)
                .map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                  </option>
                ))}
            </select>
          </Campo>
          <Campo etiqueta="Canal de captación" htmlFor="canal" nombre="canal">
            <select id="canal" name="canal" defaultValue={valores.canal} required className="input">
              <option value="" disabled>
                Seleccione…
              </option>
              <Opciones mapa={CANALES} />
            </select>
          </Campo>
        </fieldset>

        <fieldset className="tarjeta grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <legend className="sr-only">Precio y pago</legend>
          <Campo etiqueta="Precio de lista (S/)" htmlFor="precioLista" nombre="precioLista">
            <input
              id="precioLista"
              name="precioLista"
              type="number"
              step="0.01"
              min="0"
              value={precioLista}
              onChange={(e) => setPrecioLista(e.target.value === "" ? "" : Number(e.target.value))}
              required
              className="input"
            />
          </Campo>
          <Campo etiqueta="Descuento (S/)" htmlFor="descuento" nombre="descuento">
            <div className="flex gap-1">
              <input
                id="descuento"
                name="descuento"
                type="number"
                step="0.01"
                min="0"
                value={descuento}
                onChange={(e) => setDescuento(e.target.value === "" ? "" : Number(e.target.value))}
                className="input"
              />
              {[5, 10, 15].map((p) => (
                <button key={p} type="button" className="btn btn-secundario btn-sm" onClick={() => setDescuento(redondear((lista * p) / 100))}>
                  {p}%
                </button>
              ))}
            </div>
          </Campo>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              name="incluyeIgv"
              checked={incluyeIgv}
              onChange={(e) => setIncluyeIgv(e.target.checked)}
              className="h-4 w-4 accent-marca-600"
            />
            El precio incluye IGV ({Math.round(tasaIgv * 100)} %)
          </label>
          <Campo etiqueta="Método de pago" htmlFor="metodoPago" nombre="metodoPago">
            <select id="metodoPago" name="metodoPago" defaultValue={valores.metodoPago} required className="input">
              <option value="" disabled>
                Seleccione…
              </option>
              <Opciones mapa={METODOS_PAGO} />
            </select>
          </Campo>
          <Campo etiqueta="Estado del pago" htmlFor="estadoPago" nombre="estadoPago">
            <select
              id="estadoPago"
              name="estadoPago"
              value={estadoPago}
              onChange={(e) => setEstadoPago(e.target.value as EstadoPagoKey)}
              required
              className="input"
            >
              <Opciones mapa={ESTADOS_PAGO} />
            </select>
          </Campo>
          {estadoPago === "PARCIAL" && (
            <Campo etiqueta="Monto pagado a cuenta (S/)" htmlFor="montoPagado" nombre="montoPagado">
              <input id="montoPagado" name="montoPagado" type="number" step="0.01" min="0" defaultValue={valores.montoPagado} required className="input" />
            </Campo>
          )}
          <Campo etiqueta="Observaciones (opcional)" htmlFor="observaciones" nombre="observaciones" className="sm:col-span-2">
            <textarea id="observaciones" name="observaciones" defaultValue={valores.observaciones} rows={2} maxLength={300} className="input" />
          </Campo>
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="tarjeta p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Resumen</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">Precio de lista</dt>
              <dd className="tabular-nums">{formatSoles(lista)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">Descuento</dt>
              <dd className="tabular-nums text-red-600">−{formatSoles(desc)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
              <dt>Precio cobrado</dt>
              <dd className="tabular-nums text-marca-700">{formatSoles(cobrado)}</dd>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <dt>Valor de venta (sin IGV)</dt>
              <dd className="tabular-nums">{formatSoles(neto)}</dd>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <dt>IGV</dt>
              <dd className="tabular-nums">{formatSoles(igv)}</dd>
            </div>
          </dl>
          {desc > lista && <p className="mt-2 text-xs text-red-600">El descuento supera el precio de lista.</p>}
          <div className="mt-5 flex flex-col gap-2">
            <BotonEnvio>{esEdicion ? "Guardar cambios" : "Registrar atención"}</BotonEnvio>
            {!esEdicion && (
              <button type="submit" name="siguiente" value="otra" className="btn btn-secundario">
                Registrar y agregar otra
              </button>
            )}
          </div>
        </div>
      </aside>
    </FormularioAccion>
  );
}
