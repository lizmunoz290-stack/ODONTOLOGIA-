import Link from "next/link";
import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth/sesion";
import { obtenerConfiguracion, prisma } from "@/lib/db";
import { NOMBRE_DESTINO, type DestinoGasto } from "@/lib/libro/normalizar";
import { formatNumero, formatSoles } from "@/lib/formato";
import { crearTipoGasto, guardarReparto } from "@/actions/libro";
import { Encabezado } from "@/components/ui/encabezado";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { Campo } from "@/components/ui/campo";
import { SelectorDestino } from "@/components/finanzas/selector-destino";

export const metadata: Metadata = { title: "Clasificación de gastos" };

const AYUDA: Record<DestinoGasto, string> = {
  DIRECTO_ORTODONCIA: "Solo existe por los tratamientos de ortodoncia: ortodoncistas, laboratorio de ortodoncia, comisiones de ortodoncia.",
  DIRECTO_ODONTOLOGIA: "Solo existe por la odontología general y especialidades: odontólogos, cirujano, implantólogo, endodoncista.",
  DIRECTO_COMPARTIDO: "Se usa en la atención de ambas especialidades: materiales, rayos X (Raydent), laboratorio sin especialidad.",
  INDIRECTO: "Gastos fijos de la clínica: sueldos administrativos, alquiler, luz, teléfono, publicidad, impuestos.",
  NO_OPERATIVO: "No es costo de atender pacientes: retiros de utilidad, préstamos, letras. Se muestra aparte.",
};

export default async function Clasificacion() {
  await requerirSesion("verCostos");
  const [tipos, sumas, config] = await Promise.all([
    prisma.tipoGasto.findMany({ orderBy: { nombre: "asc" } }),
    prisma.gasto.groupBy({ by: ["tipoGastoId"], _sum: { monto: true }, _count: { _all: true } }),
    obtenerConfiguracion(),
  ]);
  const suma = new Map(sumas.map((s) => [s.tipoGastoId, { monto: s._sum.monto ?? 0, n: s._count._all }]));
  const grupos = (Object.keys(NOMBRE_DESTINO) as DestinoGasto[]).map((d) => ({
    destino: d,
    tipos: tipos.filter((t) => t.destino === d).sort((a, b) => (suma.get(b.id)?.monto ?? 0) - (suma.get(a.id)?.monto ?? 0)),
  }));

  return (
    <>
      <Encabezado
        titulo="Clasificación de gastos"
        descripcion="Defina a qué va cada tipo de gasto. Así se calcula cuánto le cuesta cada especialidad. Los cambios se aplican de inmediato a todo el historial."
      />

      <section className="tarjeta mb-5 p-4 sm:p-5">
        <h2 className="font-semibold text-slate-900">Reparto de gastos compartidos y fijos</h2>
        <p className="mb-3 text-sm text-slate-500">Cómo se dividen los costos directos compartidos y los gastos fijos entre Ortodoncia y Odontología, mes a mes.</p>
        <FormularioAccion accion={guardarReparto} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <Campo etiqueta="Método" nombre="repartoMetodo" htmlFor="rep-met">
            <select id="rep-met" name="repartoMetodo" defaultValue={config.repartoMetodo} className="input">
              <option value="INGRESOS">Según los ingresos de cada especialidad (recomendado)</option>
              <option value="MITAD">50 % y 50 %</option>
              <option value="FIJO">Porcentaje fijo para Ortodoncia</option>
            </select>
          </Campo>
          <Campo etiqueta="% Ortodoncia (si es fijo)" nombre="repartoOrtodoncia" htmlFor="rep-pct">
            <input id="rep-pct" name="repartoOrtodoncia" type="number" min="0" max="100" step="1" defaultValue={Math.round(config.repartoOrtodoncia * 100)} className="input" />
          </Campo>
          <div className="self-end">
            <BotonEnvio>Guardar</BotonEnvio>
          </div>
        </FormularioAccion>
      </section>

      <div className="space-y-5">
        {grupos.map((g) => {
          const total = g.tipos.reduce((s, t) => s + (suma.get(t.id)?.monto ?? 0), 0);
          return (
            <section key={g.destino} className="tarjeta overflow-hidden">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-4 py-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{NOMBRE_DESTINO[g.destino]}</h2>
                  <p className="text-xs text-slate-500">{AYUDA[g.destino]}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatSoles(total)}</span>
              </div>
              {g.tipos.length === 0 ? (
                <p className="px-4 py-4 text-sm text-slate-500">Ningún tipo de gasto en esta clasificación.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="tabla">
                    <tbody>
                      {g.tipos.map((t) => (
                        <tr key={t.id}>
                          <td className="font-medium">
                            <Link href={`/finanzas/gastos?tipo=${t.id}&rango=todo`} className="text-marca-700 hover:underline">
                              {t.nombre}
                            </Link>
                          </td>
                          <td className="num text-slate-500">{formatNumero(suma.get(t.id)?.n ?? 0, 0)} mov.</td>
                          <td className="num">{formatSoles(suma.get(t.id)?.monto ?? 0)}</td>
                          <td className="w-80">
                            <SelectorDestino tipoId={t.id} destino={t.destino} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <section className="tarjeta mt-5 p-4 sm:p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Nuevo tipo de gasto</h2>
        <FormularioAccion accion={crearTipoGasto} reiniciarAlGuardar className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Campo etiqueta="Nombre" nombre="nombre" htmlFor="nt-nom">
            <input id="nt-nom" name="nombre" required maxLength={60} className="input" placeholder="Ej. PERIODONCISTA" />
          </Campo>
          <Campo etiqueta="Clasificación" nombre="destino" htmlFor="nt-dest">
            <select id="nt-dest" name="destino" defaultValue="INDIRECTO" className="input">
              {(Object.keys(NOMBRE_DESTINO) as DestinoGasto[]).map((d) => (
                <option key={d} value={d}>
                  {NOMBRE_DESTINO[d]}
                </option>
              ))}
            </select>
          </Campo>
          <div className="self-end">
            <BotonEnvio>Crear</BotonEnvio>
          </div>
        </FormularioAccion>
      </section>
    </>
  );
}
