/**
 * Estado de resultados por especialidad (funciones puras).
 *
 *  Ingresos de la especialidad
 *  − Costo directo propio (p. ej. ortodoncista, laboratorio de ortodoncia)
 *  − Parte del costo directo compartido (materiales, rayos X…)
 *  − Parte de los gastos indirectos (sueldos, alquiler…)
 *  = Utilidad operativa de la especialidad
 *
 * La "parte" se reparte cada mes según el método elegido: por ingresos, 50/50 o un % fijo.
 * Los gastos no operativos (retiros de utilidad, préstamos y letras) no restan a la utilidad operativa;
 * se muestran aparte para calcular el flujo neto de caja.
 */
import { redondear } from "../formato";
import type { DestinoGasto } from "./normalizar";

export type Esp = "ORTODONCIA" | "ODONTOLOGIA";
export type Reparto = { metodo: "INGRESOS" | "MITAD" | "FIJO"; porcentajeOrtodoncia: number };

export interface ResultadoEspecialidad {
  ingresos: number;
  directo: number;
  compartido: number;
  indirecto: number;
  costoTotal: number;
  utilidad: number;
  margen: number;
}

export interface ResultadoMes {
  periodo: string;
  ORTODONCIA: ResultadoEspecialidad;
  ODONTOLOGIA: ResultadoEspecialidad;
  total: ResultadoEspecialidad;
  /** Participación de Ortodoncia usada para repartir compartidos e indirectos */
  cuotaOrtodoncia: number;
  noOperativo: number;
  /** Utilidad operativa − gastos no operativos */
  flujoNeto: number;
}

export type Sumas = Partial<Record<DestinoGasto, number>>;

export function cuotaOrtodoncia(r: Reparto, ingOrto: number, ingOdo: number): number {
  if (r.metodo === "MITAD") return 0.5;
  if (r.metodo === "FIJO") return Math.min(1, Math.max(0, r.porcentajeOrtodoncia));
  const t = ingOrto + ingOdo;
  return t > 0 ? ingOrto / t : 0.5;
}

function armar(ingresos: number, directo: number, compartido: number, indirecto: number): ResultadoEspecialidad {
  const costoTotal = directo + compartido + indirecto;
  const utilidad = ingresos - costoTotal;
  return {
    ingresos: redondear(ingresos),
    directo: redondear(directo),
    compartido: redondear(compartido),
    indirecto: redondear(indirecto),
    costoTotal: redondear(costoTotal),
    utilidad: redondear(utilidad),
    margen: ingresos > 0 ? utilidad / ingresos : 0,
  };
}

export function resultadoMes(
  periodo: string,
  ingresos: { ORTODONCIA: number; ODONTOLOGIA: number },
  gastos: Sumas,
  reparto: Reparto,
): ResultadoMes {
  const g = (d: DestinoGasto) => gastos[d] ?? 0;
  const cuota = cuotaOrtodoncia(reparto, ingresos.ORTODONCIA, ingresos.ODONTOLOGIA);
  const orto = armar(ingresos.ORTODONCIA, g("DIRECTO_ORTODONCIA"), g("DIRECTO_COMPARTIDO") * cuota, g("INDIRECTO") * cuota);
  const odo = armar(ingresos.ODONTOLOGIA, g("DIRECTO_ODONTOLOGIA"), g("DIRECTO_COMPARTIDO") * (1 - cuota), g("INDIRECTO") * (1 - cuota));
  const total = armar(
    ingresos.ORTODONCIA + ingresos.ODONTOLOGIA,
    g("DIRECTO_ORTODONCIA") + g("DIRECTO_ODONTOLOGIA"),
    g("DIRECTO_COMPARTIDO"),
    g("INDIRECTO"),
  );
  const noOperativo = redondear(g("NO_OPERATIVO"));
  return { periodo, ORTODONCIA: orto, ODONTOLOGIA: odo, total, cuotaOrtodoncia: cuota, noOperativo, flujoNeto: redondear(total.utilidad - noOperativo) };
}

/** Suma varios meses (cada mes ya repartido con su propia cuota). */
export function sumarMeses(meses: ResultadoMes[]): Omit<ResultadoMes, "periodo" | "cuotaOrtodoncia"> {
  const suma = (k: "ORTODONCIA" | "ODONTOLOGIA" | "total") =>
    armar(
      meses.reduce((s, m) => s + m[k].ingresos, 0),
      meses.reduce((s, m) => s + m[k].directo, 0),
      meses.reduce((s, m) => s + m[k].compartido, 0),
      meses.reduce((s, m) => s + m[k].indirecto, 0),
    );
  const total = suma("total");
  const noOperativo = redondear(meses.reduce((s, m) => s + m.noOperativo, 0));
  return { ORTODONCIA: suma("ORTODONCIA"), ODONTOLOGIA: suma("ODONTOLOGIA"), total, noOperativo, flujoNeto: redondear(total.utilidad - noOperativo) };
}

/** Avance de una meta: valor logrado ÷ meta (null si no hay meta). */
export function avanceMeta(logrado: number, meta: number | undefined): number | null {
  return meta && meta > 0 ? logrado / meta : null;
}
