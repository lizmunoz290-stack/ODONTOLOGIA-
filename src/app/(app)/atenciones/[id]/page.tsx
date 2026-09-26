import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { prisma } from "@/lib/db";
import { eliminarAtencion, guardarAtencion, registrarPago } from "@/actions/atenciones";
import { datosFormularioAtencion } from "@/lib/atenciones/datos-formulario";
import { ESTADOS_PAGO, METODOS_PAGO } from "@/lib/constantes";
import { fechaISO, formatFecha, formatSoles, redondear } from "@/lib/formato";
import { Encabezado } from "@/components/ui/encabezado";
import { BotonEliminar } from "@/components/ui/boton-eliminar";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { Campo } from "@/components/ui/campo";
import { Insignia } from "@/components/ui/insignia";
import { FormularioAtencion } from "@/components/atenciones/formulario-atencion";

export const metadata: Metadata = { title: "Editar atención" };

export default async function EditarAtencion({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await requerirSesion("registrarAtenciones");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [a, datos] = await Promise.all([
    prisma.atencion.findUnique({ where: { id }, include: { paciente: true } }),
    datosFormularioAtencion(),
  ]);
  if (!a) notFound();
  const saldo = redondear(a.precioCobrado - a.montoPagado);

  return (
    <>
      <Encabezado
        titulo={`Atención N.º ${a.id}`}
        descripcion={
          <span className="flex flex-wrap items-center gap-2">
            {a.paciente.nombre} · {formatFecha(a.fecha)}
            <Insignia color={a.estadoPago === "PAGADO" ? "verde" : a.estadoPago === "PARCIAL" ? "ambar" : "rojo"}>{ESTADOS_PAGO[a.estadoPago]}</Insignia>
          </span>
        }
        acciones={
          <>
            <Link href="/atenciones" className="btn btn-secundario">
              ← Atenciones
            </Link>
            {puede(sesion.rol, "eliminarAtenciones") && (
              <BotonEliminar accion={eliminarAtencion.bind(null, a.id)} confirmar="¿Eliminar esta atención? Esta acción no se puede deshacer." />
            )}
          </>
        }
      />

      {saldo > 0 && (
        <div className="tarjeta mb-5 border-amber-200 bg-amber-50/60 p-4">
          <h2 className="font-semibold text-amber-900">Registrar pago · saldo pendiente {formatSoles(saldo)}</h2>
          <FormularioAccion accion={registrarPago.bind(null, a.id)} reiniciarAlGuardar className="mt-3 grid gap-3 sm:grid-cols-4">
            <Campo etiqueta="Monto (S/)" htmlFor="p-monto" nombre="monto">
              <input id="p-monto" name="monto" type="number" step="0.01" min="0" max={saldo} defaultValue={saldo} required className="input" />
            </Campo>
            <Campo etiqueta="Método de pago" htmlFor="p-metodo" nombre="metodoPago">
              <select id="p-metodo" name="metodoPago" defaultValue={a.metodoPago} className="input">
                {Object.entries(METODOS_PAGO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Campo>
            <div className="self-end">
              <BotonEnvio>Registrar pago</BotonEnvio>
            </div>
          </FormularioAccion>
        </div>
      )}

      <FormularioAtencion
        accion={guardarAtencion.bind(null, a.id)}
        {...datos}
        hoy={fechaISO(new Date())}
        esEdicion
        valores={{
          fecha: fechaISO(a.fecha),
          pacienteNombre: a.paciente.nombre,
          pacienteDni: a.paciente.dni ?? "",
          servicioId: a.servicioId,
          odontologoId: a.odontologoId,
          turno: a.turno,
          precioLista: a.precioLista,
          descuento: a.descuento,
          incluyeIgv: a.incluyeIgv,
          metodoPago: a.metodoPago,
          estadoPago: a.estadoPago,
          montoPagado: a.montoPagado,
          canal: a.canal,
          observaciones: a.observaciones ?? "",
        }}
      />
    </>
  );
}
