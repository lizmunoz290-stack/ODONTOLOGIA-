import { redondear } from "../formato";

export interface ResultadoRentabilidad {
  ingresoNeto: number;
  costoDirecto: number;
  costoIndirecto: number;
  costoTotal: number;
  utilidad: number;
  /** utilidad ÷ ingreso neto (0 si no hay ingreso) */
  margen: number;
}

export function calcularRentabilidad(p: {
  ingresoNeto: number;
  costoDirecto: number;
  costoIndirecto: number;
}): ResultadoRentabilidad {
  const ingresoNeto = redondear(p.ingresoNeto);
  const costoDirecto = redondear(p.costoDirecto);
  const costoIndirecto = redondear(p.costoIndirecto);
  const costoTotal = redondear(costoDirecto + costoIndirecto);
  const utilidad = redondear(ingresoNeto - costoTotal);
  const margen = ingresoNeto !== 0 ? utilidad / ingresoNeto : 0;
  return { ingresoNeto, costoDirecto, costoIndirecto, costoTotal, utilidad, margen };
}

export type NivelMargen = "NEGATIVO" | "BAJO" | "OK";

/** NEGATIVO: margen < 0 · BAJO: 0 ≤ margen < mínimo (20 % por defecto) · OK: resto */
export function nivelMargen(margen: number, minimo = 0.2): NivelMargen {
  if (margen < 0) return "NEGATIVO";
  if (margen < minimo) return "BAJO";
  return "OK";
}
