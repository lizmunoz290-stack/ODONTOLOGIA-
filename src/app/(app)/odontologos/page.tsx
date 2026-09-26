import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth/sesion";
import { prisma } from "@/lib/db";
import { eliminarOdontologo, guardarOdontologo } from "@/actions/catalogo";
import { Encabezado } from "@/components/ui/encabezado";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { BotonEliminar } from "@/components/ui/boton-eliminar";
import { Campo } from "@/components/ui/campo";

export const metadata: Metadata = { title: "Odontólogos" };

const fila = "grid grid-cols-2 items-center gap-2 border-t border-slate-100 px-3 py-2 text-sm sm:grid-cols-12";

export default async function PaginaOdontologos() {
  await requerirSesion("editarCatalogo");
  const odontologos = await prisma.odontologo.findMany({
    include: { _count: { select: { atenciones: true } }, usuario: { select: { email: true } } },
    orderBy: { nombre: "asc" },
  });

  return (
    <>
      <Encabezado
        titulo="Odontólogos"
        descripcion="Profesionales tratantes. Para que un odontólogo vea su productividad, cree un usuario con rol Odontólogo y vincúlelo en Usuarios."
      />
      <div className="tarjeta mb-5 p-4">
        <h2 className="mb-3 font-semibold">Agregar odontólogo</h2>
        <FormularioAccion accion={guardarOdontologo.bind(null, null)} reiniciarAlGuardar className="grid gap-3 sm:grid-cols-12">
          <>
              <Campo etiqueta="Nombre completo" htmlFor="n-nombre" nombre="nombre" className="sm:col-span-4">
                <input id="n-nombre" name="nombre" required maxLength={80} className="input" placeholder="Dr./Dra. …" />
              </Campo>
              <Campo etiqueta="Especialidad" htmlFor="n-esp" nombre="especialidad" className="sm:col-span-4">
                <input id="n-esp" name="especialidad" required maxLength={60} className="input" />
              </Campo>
              <Campo etiqueta="N.º COP (opcional)" htmlFor="n-cop" nombre="cop" className="sm:col-span-2">
                <input id="n-cop" name="cop" maxLength={20} className="input" />
              </Campo>
              <input type="hidden" name="activo" value="on" />
              <div className="self-end sm:col-span-2">
                <BotonEnvio className="w-full">Agregar</BotonEnvio>
              </div>
            </>
        </FormularioAccion>
      </div>

      <div className="tarjeta overflow-hidden">
        <div className="hidden bg-slate-100 px-3 py-2 text-xs font-semibold uppercase text-slate-600 sm:grid sm:grid-cols-12 sm:gap-2">
          <span className="col-span-4">Nombre</span>
          <span className="col-span-3">Especialidad</span>
          <span className="col-span-2">COP</span>
          <span className="col-span-1 text-center">Activo</span>
        </div>
        {odontologos.map((o) => (
          <div key={o.id} className={fila}>
            <FormularioAccion accion={guardarOdontologo.bind(null, o.id)} className="contents" mensajeEnLinea>
              <div className="col-span-2 sm:col-span-4">
                <input name="nombre" defaultValue={o.nombre} aria-label="Nombre" className="input py-1" />
                <p className="mt-0.5 text-xs text-slate-500">
                  {o._count.atenciones} atenciones{o.usuario ? ` · usuario ${o.usuario.email}` : " · sin usuario"}
                </p>
              </div>
              <input name="especialidad" defaultValue={o.especialidad} aria-label="Especialidad" className="input py-1 sm:col-span-3" />
              <input name="cop" defaultValue={o.cop ?? ""} aria-label="COP" className="input py-1 sm:col-span-2" />
              <label className="flex items-center justify-center gap-1 text-xs sm:col-span-1">
                <input type="checkbox" name="activo" defaultChecked={o.activo} className="h-4 w-4 accent-marca-600" />
                <span className="sm:hidden">Activo</span>
              </label>
              <button className="btn btn-sm btn-secundario sm:col-span-1">Guardar</button>
            </FormularioAccion>
            <div className="text-right sm:col-span-1">
              {o._count.atenciones === 0 && <BotonEliminar accion={eliminarOdontologo.bind(null, o.id)} confirmar={`¿Eliminar a ${o.nombre}?`} />}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
