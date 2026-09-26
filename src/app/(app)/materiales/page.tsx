import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { prisma } from "@/lib/db";
import { eliminarMaterial, guardarMaterial } from "@/actions/catalogo";
import { Encabezado } from "@/components/ui/encabezado";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { BotonEliminar } from "@/components/ui/boton-eliminar";
import { Campo } from "@/components/ui/campo";

export const metadata: Metadata = { title: "Materiales e insumos" };

const fila = "grid grid-cols-2 items-center gap-2 border-t border-slate-100 px-3 py-2 text-sm sm:grid-cols-12";

export default async function PaginaMateriales({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sesion = await requerirSesion("verCostos");
  const editar = puede(sesion.rol, "editarCatalogo");
  const { q } = await searchParams;
  const materiales = await prisma.material.findMany({
    where: q ? { nombre: { contains: q } } : undefined,
    include: { _count: { select: { fichas: true } } },
    orderBy: { nombre: "asc" },
  });

  return (
    <>
      <Encabezado
        titulo="Materiales e insumos"
        descripcion="Catálogo de materiales con su costo unitario. Un cambio de costo actualiza el costo directo de todos los servicios que lo usan."
      />

      {editar && (
        <div className="tarjeta mb-5 p-4">
          <h2 className="mb-3 font-semibold">Agregar material</h2>
          <FormularioAccion accion={guardarMaterial.bind(null, null)} reiniciarAlGuardar className="grid gap-3 sm:grid-cols-12">
            <>
                <Campo etiqueta="Nombre" htmlFor="n-nombre" nombre="nombre" className="sm:col-span-5">
                  <input id="n-nombre" name="nombre" required maxLength={80} className="input" placeholder="Ej. Resina compuesta A2" />
                </Campo>
                <Campo etiqueta="Unidad de medida" htmlFor="n-unidad" nombre="unidad" className="sm:col-span-2">
                  <input id="n-unidad" name="unidad" required maxLength={20} className="input" placeholder="g, ml, unidad…" list="unidades" />
                </Campo>
                <Campo etiqueta="Costo unitario (S/)" htmlFor="n-costo" nombre="costoUnitario" className="sm:col-span-3">
                  <input id="n-costo" name="costoUnitario" type="number" step="0.0001" min="0" required className="input" />
                </Campo>
                <input type="hidden" name="activo" value="on" />
                <div className="self-end sm:col-span-2">
                  <BotonEnvio className="w-full">Agregar</BotonEnvio>
                </div>
              </>
          </FormularioAccion>
          <datalist id="unidades">
            {["unidad", "par", "g", "ml", "cm", "carpule", "juego", "kit", "caja"].map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>
      )}

      <form className="mb-3 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar material…" className="input max-w-sm" />
        <button className="btn btn-secundario">Buscar</button>
      </form>

      <div className="tarjeta overflow-hidden">
        <div className="hidden bg-slate-100 px-3 py-2 text-xs font-semibold uppercase text-slate-600 sm:grid sm:grid-cols-12 sm:gap-2">
          <span className="col-span-4">Material</span>
          <span className="col-span-2">Unidad</span>
          <span className="col-span-2 text-right">Costo unitario</span>
          <span className="col-span-1 text-center">Activo</span>
          <span className="col-span-1 text-center">Fichas</span>
        </div>
        {materiales.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No hay materiales.</p>}
        {materiales.map((m) => (
          <div key={m.id} className={fila}>
            <FormularioAccion accion={guardarMaterial.bind(null, m.id)} className="contents" mensajeEnLinea>
              <input name="nombre" defaultValue={m.nombre} disabled={!editar} aria-label="Nombre" className="input col-span-2 py-1 sm:col-span-4" />
              <input name="unidad" defaultValue={m.unidad} disabled={!editar} aria-label="Unidad" className="input py-1 sm:col-span-2" list="unidades" />
              <input name="costoUnitario" type="number" step="0.0001" min="0" defaultValue={m.costoUnitario} disabled={!editar} aria-label="Costo unitario" className="input py-1 text-right sm:col-span-2" />
              <label className="flex items-center justify-center gap-1 text-xs sm:col-span-1">
                <input type="checkbox" name="activo" defaultChecked={m.activo} disabled={!editar} className="h-4 w-4 accent-marca-600" />
                <span className="sm:hidden">Activo</span>
              </label>
              <span className="text-center text-xs text-slate-500 sm:col-span-1" title="Servicios que lo usan">
                {m._count.fichas} <span className="sm:hidden">fichas</span>
              </span>
              {editar && <button className="btn btn-sm btn-secundario sm:col-span-1">Guardar</button>}
            </FormularioAccion>
            {editar && (
              <div className="text-right sm:col-span-1">
                <BotonEliminar accion={eliminarMaterial.bind(null, m.id)} confirmar={`¿Eliminar "${m.nombre}"?`} />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
