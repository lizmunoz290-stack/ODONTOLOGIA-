import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { calcularCostoDirecto, minutosSillon, type DesgloseCostoDirecto, type FichaTecnica } from "./costeo";

export const incluirFicha = {
  materiales: { include: { material: true }, orderBy: { material: { nombre: "asc" } } },
  manoObra: { orderBy: { rol: "asc" } },
  equipos: { include: { equipo: true }, orderBy: { equipo: { nombre: "asc" } } },
  tercerizados: true,
} satisfies Prisma.ServicioInclude;

export type ServicioConFicha = Prisma.ServicioGetPayload<{ include: typeof incluirFicha }>;

/** Convierte un servicio con su ficha (de la BD) en la estructura del motor de costeo. */
export function fichaDe(s: ServicioConFicha): FichaTecnica {
  return {
    materiales: s.materiales.map((m) => ({ cantidad: m.cantidad, costoUnitario: m.material.costoUnitario })),
    manoObra: s.manoObra.map((m) => ({ minutos: m.minutos, costoHora: m.costoHora })),
    equipos: s.equipos.map((e) => ({
      minutosUso: e.minutosUso,
      costoAdquisicion: e.equipo.costoAdquisicion,
      vidaUtilHoras: e.equipo.vidaUtilHoras,
    })),
    tercerizados: s.tercerizados.map((t) => ({ costo: t.costo })),
    costoEsterilizacion: s.costoEsterilizacion,
  };
}

export interface ServicioCosteado extends ServicioConFicha {
  costoDirecto: DesgloseCostoDirecto;
  minutos: number;
}

/** Servicios con su costo directo actual según ficha técnica. */
export async function serviciosCosteados(where?: Prisma.ServicioWhereInput): Promise<ServicioCosteado[]> {
  const servicios = await prisma.servicio.findMany({ where, include: incluirFicha, orderBy: [{ categoria: "asc" }, { nombre: "asc" }] });
  return servicios.map((s) => ({
    ...s,
    costoDirecto: calcularCostoDirecto(fichaDe(s)),
    minutos: minutosSillon(s.duracionMin, s.sesiones),
  }));
}

export async function servicioCosteado(id: number): Promise<ServicioCosteado | null> {
  const [s] = await serviciosCosteados({ id });
  return s ?? null;
}
