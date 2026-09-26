/**
 * Agregación de atenciones ya costeadas (directo + indirecto asignado).
 * Funciones puras usadas por el dashboard y los reportes.
 */
import { redondear } from "../formato";
import { calcularRentabilidad, type ResultadoRentabilidad } from "./rentabilidad";

export interface AtencionCosteada {
  precioCobrado: number;
  ingresoNeto: number;
  costoDirecto: number;
  costoIndirecto: number;
  minutos: number;
}

export interface Acumulado extends ResultadoRentabilidad {
  cantidad: number;
  /** Suma de precios cobrados (con IGV cuando corresponde) */
  ingresoBruto: number;
  minutos: number;
  /** Ingreso neto promedio por atención */
  ticketPromedio: number;
}

export function acumular(items: AtencionCosteada[]): Acumulado {
  let ingresoBruto = 0, ingresoNeto = 0, costoDirecto = 0, costoIndirecto = 0, minutos = 0;
  for (const a of items) {
    ingresoBruto += a.precioCobrado;
    ingresoNeto += a.ingresoNeto;
    costoDirecto += a.costoDirecto;
    costoIndirecto += a.costoIndirecto;
    minutos += a.minutos;
  }
  const r = calcularRentabilidad({ ingresoNeto, costoDirecto, costoIndirecto });
  return {
    ...r,
    cantidad: items.length,
    ingresoBruto: redondear(ingresoBruto),
    minutos,
    ticketPromedio: items.length ? redondear(r.ingresoNeto / items.length) : 0,
  };
}

/** Agrupa por una clave y acumula cada grupo. */
export function agruparPor<T extends AtencionCosteada, K>(items: T[], clave: (a: T) => K): Map<K, Acumulado & { items: T[] }> {
  const grupos = new Map<K, T[]>();
  for (const a of items) {
    const k = clave(a);
    const g = grupos.get(k);
    if (g) g.push(a);
    else grupos.set(k, [a]);
  }
  const out = new Map<K, Acumulado & { items: T[] }>();
  for (const [k, g] of grupos) out.set(k, { ...acumular(g), items: g });
  return out;
}

/** Participación de cada valor sobre el total (0 si el total es 0). */
export function participacion(valor: number, total: number): number {
  return total ? valor / total : 0;
}
