"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obtenerConfiguracion, prisma } from "@/lib/db";
import { exigirPermiso } from "@/lib/auth/sesion";
import { erroresDeZod, manejarError, type EstadoFormulario } from "@/lib/acciones";
import { esquemaAtencion } from "@/lib/validaciones/atenciones";
import { monto, z } from "@/lib/validaciones/comun";
import { servicioCosteado } from "@/lib/servicios";
import { construirAtencion, resolverPaciente } from "@/lib/atenciones/registro";
import { METODOS_PAGO } from "@/lib/constantes";
import { redondear } from "@/lib/formato";

function revalidar() {
  revalidatePath("/atenciones");
  revalidatePath("/dashboard");
  revalidatePath("/costos-indirectos");
  revalidatePath("/reportes", "layout");
}

export async function guardarAtencion(id: number | null, _p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  let destino: string;
  try {
    await exigirPermiso("registrarAtenciones");
    const r = esquemaAtencion.safeParse(Object.fromEntries(f));
    if (!r.success) return erroresDeZod(r.error);
    const d = r.data;

    const previa = id ? await prisma.atencion.findUnique({ where: { id } }) : null;
    if (id && !previa) return { ok: false, mensaje: "La atención ya no existe." };

    const [servicio, odontologo, config] = await Promise.all([
      servicioCosteado(d.servicioId),
      prisma.odontologo.findUnique({ where: { id: d.odontologoId } }),
      obtenerConfiguracion(),
    ]);
    // Al crear, el servicio y el odontólogo deben estar activos; al editar se permite conservar los originales.
    if (!servicio || (!servicio.activo && servicio.id !== previa?.servicioId)) {
      return { ok: false, errores: { servicioId: ["Seleccione un servicio activo"] } };
    }
    if (!odontologo || (!odontologo.activo && odontologo.id !== previa?.odontologoId)) {
      return { ok: false, errores: { odontologoId: ["Seleccione un odontólogo activo"] } };
    }

    const c = construirAtencion(d, servicio, config.igvPorcentaje, previa ?? undefined);
    if (!c.ok) {
      return { ok: false, mensaje: "Revise los campos marcados.", errores: Object.fromEntries(Object.entries(c.errores).map(([k, v]) => [k, [v]])) };
    }

    await prisma.$transaction(async (tx) => {
      const pacienteId = await resolverPaciente(tx, d.pacienteNombre, d.pacienteDni);
      if (id) await tx.atencion.update({ where: { id }, data: { ...c.data, pacienteId } });
      else await tx.atencion.create({ data: { ...c.data, pacienteId } });
    });
    revalidar();
    destino = id ? "/atenciones?guardada=1" : f.get("siguiente") === "otra" ? "/atenciones/nueva?registrada=1" : "/atenciones?registrada=1";
  } catch (e) {
    return manejarError(e);
  }
  redirect(destino);
}

export async function eliminarAtencion(id: number): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("eliminarAtenciones");
    await prisma.atencion.delete({ where: { id } });
  } catch (e) {
    return manejarError(e);
  }
  revalidar();
  redirect("/atenciones?eliminada=1");
}

const esquemaPago = z.object({
  monto: monto().refine((v) => v > 0, "Ingrese un monto mayor a 0"),
  metodoPago: z.enum(Object.keys(METODOS_PAGO) as [keyof typeof METODOS_PAGO, ...(keyof typeof METODOS_PAGO)[]]),
});

/** Registra un abono sobre el saldo pendiente de una atención. */
export async function registrarPago(id: number, _p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("registrarAtenciones");
    const r = esquemaPago.safeParse(Object.fromEntries(f));
    if (!r.success) return erroresDeZod(r.error);
    const a = await prisma.atencion.findUnique({ where: { id } });
    if (!a) return { ok: false, mensaje: "La atención no existe." };
    const saldo = redondear(a.precioCobrado - a.montoPagado);
    if (r.data.monto > saldo + 0.001) {
      return { ok: false, errores: { monto: [`El monto supera el saldo pendiente (S/ ${saldo.toFixed(2)})`] } };
    }
    const montoPagado = redondear(a.montoPagado + r.data.monto);
    await prisma.atencion.update({
      where: { id },
      data: { montoPagado, estadoPago: montoPagado >= a.precioCobrado ? "PAGADO" : "PARCIAL", metodoPago: r.data.metodoPago },
    });
    revalidar();
    return { ok: true, mensaje: montoPagado >= a.precioCobrado ? "Pago completado." : "Abono registrado." };
  } catch (e) {
    return manejarError(e);
  }
}
