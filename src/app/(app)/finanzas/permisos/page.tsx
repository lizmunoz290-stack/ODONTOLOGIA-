import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth/sesion";
import { prisma } from "@/lib/db";
import { estadoPermiso, DIAS_AVISO } from "@/lib/libro/permisos";
import { fechaISO, formatFecha } from "@/lib/formato";
import { eliminarPermiso, guardarPermiso } from "@/actions/libro";
import { Encabezado } from "@/components/ui/encabezado";
import { Insignia } from "@/components/ui/insignia";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { BotonEliminar } from "@/components/ui/boton-eliminar";
import { Campo } from "@/components/ui/campo";

export const metadata: Metadata = { title: "Permisos y licencias" };

const ORDEN = { VENCIDO: 0, POR_VENCER: 1, SIN_FECHA: 2, VIGENTE: 3 };

export default async function Permisos() {
  await requerirSesion("verCostos");
  const permisos = (await prisma.permiso.findMany()).map((p) => ({ ...p, ...estadoPermiso(p.vencimiento) }));
  permisos.sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado] || (a.dias ?? 9e9) - (b.dias ?? 9e9));
  return (
    <>
      <Encabezado
        titulo="Permisos y licencias"
        descripcion={`Vencimientos de licencias y certificados. Se avisa en el dashboard ${DIAS_AVISO} días antes de que venzan.`}
      />
      <div className="tarjeta overflow-hidden">
        <div className="hidden bg-slate-100 px-3 py-2 text-xs font-semibold uppercase text-slate-600 sm:grid sm:grid-cols-12 sm:gap-2">
          <span className="col-span-4">Permiso</span>
          <span className="col-span-2">Vence</span>
          <span className="col-span-2">Notas</span>
          <span className="col-span-2">Estado</span>
        </div>
        {permisos.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No hay permisos registrados.</p>}
        {permisos.map((p) => (
          <div key={p.id} className="grid grid-cols-2 items-center gap-2 border-t border-slate-100 px-3 py-2 text-sm sm:grid-cols-12">
            <FormularioAccion accion={guardarPermiso.bind(null, p.id)} className="contents" mensajeEnLinea>
              <input name="detalle" defaultValue={p.detalle} aria-label="Permiso" className="input col-span-2 py-1 sm:col-span-4" />
              <input name="vencimiento" type="date" defaultValue={p.vencimiento ? fechaISO(p.vencimiento) : ""} aria-label="Vencimiento" className="input py-1 sm:col-span-2" />
              <input name="notas" defaultValue={p.notas ?? ""} aria-label="Notas" className="input py-1 sm:col-span-2" placeholder="Ej. indeterminado" />
              <span className="sm:col-span-2">
                {p.estado === "VENCIDO" && <Insignia color="rojo">⛔ Vencido hace {-p.dias!} días</Insignia>}
                {p.estado === "POR_VENCER" && <Insignia color="ambar">⚠ Vence en {p.dias} días</Insignia>}
                {p.estado === "VIGENTE" && <Insignia color="verde">Vigente · {formatFecha(p.vencimiento!)}</Insignia>}
                {p.estado === "SIN_FECHA" && <Insignia>Sin fecha</Insignia>}
              </span>
              <button className="btn btn-sm btn-secundario sm:col-span-1">Guardar</button>
            </FormularioAccion>
            <div className="text-right sm:col-span-1">
              <BotonEliminar accion={eliminarPermiso.bind(null, p.id)} confirmar={`¿Eliminar "${p.detalle}"?`} texto="Quitar" />
            </div>
          </div>
        ))}
      </div>
      <section className="tarjeta mt-5 p-4 sm:p-5">
        <h2 className="mb-3 font-semibold">Agregar permiso</h2>
        <FormularioAccion accion={guardarPermiso.bind(null, null)} reiniciarAlGuardar className="grid gap-3 sm:grid-cols-4">
          <Campo etiqueta="Permiso o licencia" nombre="detalle" htmlFor="np-det" className="sm:col-span-2">
            <input id="np-det" name="detalle" required className="input" placeholder="Ej. Certificado de fumigación" />
          </Campo>
          <Campo etiqueta="Vence" nombre="vencimiento" htmlFor="np-venc">
            <input id="np-venc" name="vencimiento" type="date" className="input" />
          </Campo>
          <div className="self-end">
            <BotonEnvio>Agregar</BotonEnvio>
          </div>
        </FormularioAccion>
      </section>
    </>
  );
}
