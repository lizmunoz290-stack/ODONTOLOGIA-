import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { prisma } from "@/lib/db";
import { depreciacionPorMinuto } from "@/lib/costeo";
import { eliminarEquipo, guardarEquipo } from "@/actions/catalogo";
import { Encabezado } from "@/components/ui/encabezado";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { BotonEliminar } from "@/components/ui/boton-eliminar";
import { Campo } from "@/components/ui/campo";

export const metadata: Metadata = { title: "Equipos" };

const fila = "grid grid-cols-2 items-center gap-2 border-t border-slate-100 px-3 py-2 text-sm sm:grid-cols-12";

export default async function PaginaEquipos() {
  const sesion = await requerirSesion("verCostos");
  const editar = puede(sesion.rol, "editarCatalogo");
  const equipos = await prisma.equipo.findMany({
    include: { _count: { select: { fichas: true } } },
    orderBy: { nombre: "asc" },
  });

  return (
    <>
      <Encabezado
        titulo="Equipos"
        descripcion={
          <>
            Depreciación por minuto = costo de adquisición ÷ (vida útil en horas × 60). Se carga a cada servicio según los minutos de uso
            de su ficha técnica.
          </>
        }
      />

      {editar && (
        <div className="tarjeta mb-5 p-4">
          <h2 className="mb-3 font-semibold">Agregar equipo</h2>
          <FormularioAccion accion={guardarEquipo.bind(null, null)} reiniciarAlGuardar className="grid gap-3 sm:grid-cols-12">
            <>
                <Campo etiqueta="Nombre del equipo" htmlFor="n-nombre" nombre="nombre" className="sm:col-span-5">
                  <input id="n-nombre" name="nombre" required maxLength={80} className="input" />
                </Campo>
                <Campo etiqueta="Costo de adquisición (S/)" htmlFor="n-costo" nombre="costoAdquisicion" className="sm:col-span-3">
                  <input id="n-costo" name="costoAdquisicion" type="number" step="0.01" min="0" required className="input" />
                </Campo>
                <Campo etiqueta="Vida útil (horas de uso)" htmlFor="n-vida" nombre="vidaUtilHoras" className="sm:col-span-2">
                  <input id="n-vida" name="vidaUtilHoras" type="number" step="1" min="1" required className="input" />
                </Campo>
                <input type="hidden" name="activo" value="on" />
                <div className="self-end sm:col-span-2">
                  <BotonEnvio className="w-full">Agregar</BotonEnvio>
                </div>
              </>
          </FormularioAccion>
          <p className="mt-2 text-xs text-slate-500">
            Referencia: un sillón que se usa 8 h/día, 26 días/mes durante 8 años ≈ 20,000 horas.
          </p>
        </div>
      )}

      <div className="tarjeta overflow-hidden">
        <div className="hidden bg-slate-100 px-3 py-2 text-xs font-semibold uppercase text-slate-600 sm:grid sm:grid-cols-12 sm:gap-2">
          <span className="col-span-4">Equipo</span>
          <span className="col-span-2 text-right">Costo adquisición</span>
          <span className="col-span-2 text-right">Vida útil (h)</span>
          <span className="col-span-1 text-right">S/ por min</span>
          <span className="col-span-1 text-center">Activo</span>
        </div>
        {equipos.map((e) => (
          <div key={e.id} className={fila}>
            <FormularioAccion accion={guardarEquipo.bind(null, e.id)} className="contents" mensajeEnLinea>
              <input name="nombre" defaultValue={e.nombre} disabled={!editar} aria-label="Nombre" className="input col-span-2 py-1 sm:col-span-4" />
              <input name="costoAdquisicion" type="number" step="0.01" min="0" defaultValue={e.costoAdquisicion} disabled={!editar} aria-label="Costo de adquisición" className="input py-1 text-right sm:col-span-2" />
              <input name="vidaUtilHoras" type="number" step="1" min="1" defaultValue={e.vidaUtilHoras} disabled={!editar} aria-label="Vida útil en horas" className="input py-1 text-right sm:col-span-2" />
              <span className="num text-slate-600 sm:col-span-1" title={`Usado en ${e._count.fichas} fichas`}>
                {depreciacionPorMinuto(e.costoAdquisicion, e.vidaUtilHoras).toFixed(4)}
              </span>
              <label className="flex items-center justify-center gap-1 text-xs sm:col-span-1">
                <input type="checkbox" name="activo" defaultChecked={e.activo} disabled={!editar} className="h-4 w-4 accent-marca-600" />
                <span className="sm:hidden">Activo</span>
              </label>
              {editar && <button className="btn btn-sm btn-secundario sm:col-span-1">Guardar</button>}
            </FormularioAccion>
            {editar && (
              <div className="text-right sm:col-span-1">
                <BotonEliminar accion={eliminarEquipo.bind(null, e.id)} confirmar={`¿Eliminar "${e.nombre}"?`} />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
