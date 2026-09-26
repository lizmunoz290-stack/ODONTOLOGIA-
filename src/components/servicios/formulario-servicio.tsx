"use client";
import type { Servicio } from "@prisma/client";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { Campo } from "@/components/ui/campo";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { CATEGORIAS } from "@/lib/constantes";
import type { EstadoFormulario } from "@/lib/acciones";

export function FormularioServicio({
  servicio,
  accion,
}: {
  servicio?: Servicio;
  accion: (p: EstadoFormulario, f: FormData) => Promise<EstadoFormulario>;
}) {
  return (
    <FormularioAccion accion={accion} className="grid gap-4 sm:grid-cols-2">
      {({ errores: e }) => (
        <>
          <Campo etiqueta="Nombre del servicio" htmlFor="nombre" error={e?.nombre} className="sm:col-span-2">
            <input id="nombre" name="nombre" defaultValue={servicio?.nombre} required maxLength={80} className="input" />
          </Campo>
          <Campo etiqueta="Categoría" htmlFor="categoria" error={e?.categoria}>
            <select id="categoria" name="categoria" defaultValue={servicio?.categoria ?? ""} required className="input">
              <option value="" disabled>
                Seleccione…
              </option>
              {Object.entries(CATEGORIAS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Precio de venta (S/, con IGV)" htmlFor="precio" error={e?.precio}>
            <input id="precio" name="precio" type="number" step="0.01" min="0.01" defaultValue={servicio?.precio} required className="input" />
          </Campo>
          <Campo etiqueta="Duración por sesión (minutos)" htmlFor="duracionMin" error={e?.duracionMin}>
            <input id="duracionMin" name="duracionMin" type="number" step="1" min="5" defaultValue={servicio?.duracionMin ?? 30} required className="input" />
          </Campo>
          <Campo
            etiqueta="Número de sesiones"
            htmlFor="sesiones"
            error={e?.sesiones}
            ayuda="El precio cubre todas las sesiones del tratamiento."
          >
            <input id="sesiones" name="sesiones" type="number" step="1" min="1" defaultValue={servicio?.sesiones ?? 1} required className="input" />
          </Campo>
          {!servicio && (
            <Campo
              etiqueta="Esterilización e instrumental por atención (S/)"
              htmlFor="costoEsterilizacion"
              error={e?.costoEsterilizacion}
            >
              <input id="costoEsterilizacion" name="costoEsterilizacion" type="number" step="0.01" min="0" defaultValue={0} className="input" />
            </Campo>
          )}
          {servicio && <input type="hidden" name="costoEsterilizacion" value={servicio.costoEsterilizacion} />}
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <input type="checkbox" name="activo" defaultChecked={servicio?.activo ?? true} className="h-4 w-4 accent-marca-600" />
            Servicio activo (disponible para nuevas atenciones)
          </label>
          <div className="sm:col-span-2">
            <BotonEnvio>{servicio ? "Guardar cambios" : "Crear servicio"}</BotonEnvio>
          </div>
        </>
      )}
    </FormularioAccion>
  );
}
