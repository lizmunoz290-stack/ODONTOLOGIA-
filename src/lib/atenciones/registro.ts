/** Construcción de una atención lista para guardar (usada por el formulario y por la importación). */
import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { calcularMontos } from "./calculos";
import { parseFechaISO } from "../formato";
import type { DatosAtencion } from "../validaciones/atenciones";
import type { ServicioCosteado } from "../servicios";

type DatosGuardar = Omit<Prisma.AtencionUncheckedCreateInput, "pacienteId">;

export type ResultadoConstruccion =
  | { ok: true; data: DatosGuardar }
  | { ok: false; errores: Record<string, string> };

/**
 * Calcula montos y toma el costo directo y los minutos de sillón vigentes del servicio (snapshot).
 * Si `snapshotPrevio` se indica y el servicio no cambió, se conserva el costo original.
 */
export function construirAtencion(
  d: DatosAtencion,
  servicio: ServicioCosteado,
  tasaIgv: number,
  snapshotPrevio?: { servicioId: number; costoDirectoSnapshot: number; minutosSnapshot: number },
): ResultadoConstruccion {
  const r = calcularMontos({
    precioLista: d.precioLista,
    descuento: d.descuento,
    incluyeIgv: d.incluyeIgv,
    estadoPago: d.estadoPago,
    montoPagado: d.montoPagado,
    tasaIgv,
  });
  if (!r.ok) return r;
  const mismoServicio = snapshotPrevio && snapshotPrevio.servicioId === servicio.id;
  return {
    ok: true,
    data: {
      fecha: parseFechaISO(d.fecha),
      servicioId: servicio.id,
      odontologoId: d.odontologoId,
      turno: d.turno,
      precioLista: d.precioLista,
      descuento: d.descuento,
      precioCobrado: r.montos.precioCobrado,
      incluyeIgv: d.incluyeIgv,
      ingresoNeto: r.montos.ingresoNeto,
      metodoPago: d.metodoPago,
      estadoPago: d.estadoPago,
      montoPagado: r.montos.montoPagado,
      canal: d.canal,
      observaciones: d.observaciones ?? null,
      costoDirectoSnapshot: mismoServicio ? snapshotPrevio.costoDirectoSnapshot : servicio.costoDirecto.total,
      minutosSnapshot: mismoServicio ? snapshotPrevio.minutosSnapshot : servicio.minutos,
    },
  };
}

type Tx = Prisma.TransactionClient | PrismaClient;

/** Busca el paciente por DNI (o por nombre exacto si no hay DNI); si no existe, lo crea. */
export async function resolverPaciente(tx: Tx, nombre: string, dni?: string | null): Promise<number> {
  const limpio = nombre.trim().replace(/\s+/g, " ");
  if (dni) {
    const p = await tx.paciente.upsert({ where: { dni }, create: { nombre: limpio, dni }, update: {} });
    return p.id;
  }
  const existente = await tx.paciente.findFirst({ where: { nombre: limpio, dni: null } });
  if (existente) return existente.id;
  return (await tx.paciente.create({ data: { nombre: limpio } })).id;
}
