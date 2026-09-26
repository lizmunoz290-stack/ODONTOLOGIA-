/**
 * Prorrateo de costos indirectos (gastos fijos mensuales) a las atenciones.
 * La tasa se calcula por mes con TODAS las atenciones de la clínica en ese mes,
 * y luego se aplica a cada atención (aunque el reporte esté filtrado).
 */
import { formatNumero, formatPorcentaje, formatSoles, redondear } from "../formato";

export type MetodoProrrateo = "MINUTOS" | "ATENCIONES" | "INGRESOS";

export const NOMBRE_METODO: Record<MetodoProrrateo, string> = {
  MINUTOS: "Por minutos de sillón",
  ATENCIONES: "Por número de atenciones",
  INGRESOS: "Por porcentaje de ingresos",
};

export const FORMULA_METODO: Record<MetodoProrrateo, { tasa: string; asignacion: string; explicacion: string }> = {
  MINUTOS: {
    tasa: "Tasa (S/ por minuto) = Costos indirectos del mes ÷ Minutos de sillón utilizados en el mes",
    asignacion: "Indirecto de la atención = Tasa × Minutos de sillón del servicio",
    explicacion:
      "Los servicios que ocupan más tiempo el sillón absorben más gastos fijos. Es el método más justo cuando el recurso escaso es el tiempo.",
  },
  ATENCIONES: {
    tasa: "Tasa (S/ por atención) = Costos indirectos del mes ÷ N.º de atenciones del mes",
    asignacion: "Indirecto de la atención = Tasa (igual para todas)",
    explicacion:
      "Todas las atenciones cargan el mismo monto, sin importar su duración o precio. Simple, pero castiga a los servicios baratos y rápidos.",
  },
  INGRESOS: {
    tasa: "Tasa (%) = Costos indirectos del mes ÷ Ingresos netos (sin IGV) del mes",
    asignacion: "Indirecto de la atención = Tasa × Ingreso neto de la atención",
    explicacion:
      "Cada atención carga gastos fijos en proporción a lo que factura. Todos los servicios quedan con el mismo % de indirectos.",
  },
};

export interface BaseMes {
  periodo: string;
  totalIndirectos: number;
  totalMinutos: number;
  totalAtenciones: number;
  totalIngresos: number;
}

export interface TasaProrrateo {
  periodo: string;
  metodo: MetodoProrrateo;
  totalIndirectos: number;
  /** Valor de la base del método (minutos, atenciones o ingresos del mes) */
  base: number;
  /** S/ por minuto, S/ por atención o fracción de ingresos */
  tasa: number;
  /** Fórmula con los números reemplazados */
  formula: string;
}

export function calcularTasa(metodo: MetodoProrrateo, mes: BaseMes): TasaProrrateo {
  const base =
    metodo === "MINUTOS" ? mes.totalMinutos : metodo === "ATENCIONES" ? mes.totalAtenciones : mes.totalIngresos;
  const tasa = base > 0 ? mes.totalIndirectos / base : 0;
  const ind = formatSoles(mes.totalIndirectos);
  let formula: string;
  if (base <= 0) {
    formula = `Sin atenciones en el periodo: los ${ind} de indirectos no se pueden prorratear.`;
  } else if (metodo === "MINUTOS") {
    formula = `${ind} ÷ ${formatNumero(base, 0)} min = S/ ${tasa.toFixed(4)} por minuto`;
  } else if (metodo === "ATENCIONES") {
    formula = `${ind} ÷ ${formatNumero(base, 0)} atenciones = ${formatSoles(tasa)} por atención`;
  } else {
    formula = `${ind} ÷ ${formatSoles(base)} = ${formatPorcentaje(tasa, 2)} de cada sol facturado`;
  }
  return { periodo: mes.periodo, metodo, totalIndirectos: mes.totalIndirectos, base, tasa, formula };
}

export interface DatosAtencionProrrateo {
  minutos: number;
  ingresoNeto: number;
}

/** Costo indirecto asignado a una atención (sin redondear; redondear al mostrar o al sumar). */
export function indirectoAtencion(t: TasaProrrateo, a: DatosAtencionProrrateo): number {
  switch (t.metodo) {
    case "MINUTOS":
      return t.tasa * a.minutos;
    case "ATENCIONES":
      return t.tasa;
    case "INGRESOS":
      return t.tasa * a.ingresoNeto;
  }
}

/** Explicación con números de cómo se obtuvo el indirecto de una atención/servicio. */
export function explicarAsignacion(t: TasaProrrateo, a: DatosAtencionProrrateo): string {
  const r = formatSoles(redondear(indirectoAtencion(t, a)));
  switch (t.metodo) {
    case "MINUTOS":
      return `S/ ${t.tasa.toFixed(4)}/min × ${a.minutos} min = ${r}`;
    case "ATENCIONES":
      return `${formatSoles(t.tasa)} por atención = ${r}`;
    case "INGRESOS":
      return `${formatPorcentaje(t.tasa, 2)} × ${formatSoles(a.ingresoNeto)} = ${r}`;
  }
}

/** Arma la base de cada mes a partir de las atenciones y gastos (agrupados por AAAA-MM). */
export function construirBasesMensuales(
  atenciones: { periodo: string; minutos: number; ingresoNeto: number }[],
  gastos: { periodo: string; monto: number }[],
): Map<string, BaseMes> {
  const bases = new Map<string, BaseMes>();
  const obtener = (periodo: string) => {
    let b = bases.get(periodo);
    if (!b) {
      b = { periodo, totalIndirectos: 0, totalMinutos: 0, totalAtenciones: 0, totalIngresos: 0 };
      bases.set(periodo, b);
    }
    return b;
  };
  for (const g of gastos) obtener(g.periodo).totalIndirectos += g.monto;
  for (const a of atenciones) {
    const b = obtener(a.periodo);
    b.totalMinutos += a.minutos;
    b.totalAtenciones += 1;
    b.totalIngresos += a.ingresoNeto;
  }
  for (const b of bases.values()) {
    b.totalIndirectos = redondear(b.totalIndirectos);
    b.totalIngresos = redondear(b.totalIngresos);
  }
  return bases;
}
