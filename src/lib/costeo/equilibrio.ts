/**
 * Punto de equilibrio: cuántas atenciones se necesitan para cubrir los costos fijos del mes.
 * Margen de contribución unitario = ingreso neto por atención − costo directo por atención.
 */
import { redondear } from "../formato";

export interface EquilibrioIndividual {
  margenContribucion: number;
  /** Atenciones necesarias si solo se vendiera este servicio (null si el margen de contribución ≤ 0) */
  atenciones: number | null;
}

/** PE = Costos fijos ÷ (Precio neto − Costo directo), redondeado hacia arriba. */
export function equilibrioIndividual(
  costosFijos: number,
  precioNeto: number,
  costoDirecto: number,
): EquilibrioIndividual {
  const margenContribucion = redondear(precioNeto - costoDirecto);
  if (margenContribucion <= 0) return { margenContribucion, atenciones: null };
  return { margenContribucion, atenciones: Math.ceil(costosFijos / margenContribucion - 1e-9) };
}

export interface ItemMezcla {
  id: number;
  precioNeto: number;
  costoDirecto: number;
  /** Atenciones vendidas en el periodo (define la participación en la mezcla) */
  cantidad: number;
}

export interface EquilibrioMezcla {
  /** Margen de contribución promedio ponderado por la mezcla de ventas */
  mcPonderado: number;
  /** Total de atenciones necesarias en el mes (null si mcPonderado ≤ 0) */
  totalAtenciones: number | null;
  porServicio: { id: number; participacion: number; atenciones: number | null }[];
}

/**
 * PE con la mezcla actual:
 *   MC ponderado = Σ (participación_i × MC_i)
 *   Total = Costos fijos ÷ MC ponderado
 *   Atenciones_i = Total × participación_i
 */
export function equilibrioMezcla(costosFijos: number, items: ItemMezcla[]): EquilibrioMezcla {
  const total = items.reduce((s, i) => s + i.cantidad, 0);
  if (total === 0) {
    return { mcPonderado: 0, totalAtenciones: null, porServicio: items.map((i) => ({ id: i.id, participacion: 0, atenciones: null })) };
  }
  const mcPonderado = items.reduce((s, i) => s + (i.cantidad / total) * (i.precioNeto - i.costoDirecto), 0);
  if (mcPonderado <= 0) {
    return {
      mcPonderado: redondear(mcPonderado),
      totalAtenciones: null,
      porServicio: items.map((i) => ({ id: i.id, participacion: i.cantidad / total, atenciones: null })),
    };
  }
  const totalAtenciones = costosFijos / mcPonderado;
  return {
    mcPonderado: redondear(mcPonderado),
    totalAtenciones: Math.ceil(totalAtenciones - 1e-9),
    porServicio: items.map((i) => ({
      id: i.id,
      participacion: i.cantidad / total,
      atenciones: Math.ceil((totalAtenciones * i.cantidad) / total - 1e-9),
    })),
  };
}
