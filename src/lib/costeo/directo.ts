/**
 * Costeo directo por atención a partir de la ficha técnica del servicio.
 * Funciones puras: no acceden a la base de datos.
 */
import { redondear } from "../formato";

export interface ItemMaterial {
  cantidad: number;
  costoUnitario: number;
}
export interface ItemManoObra {
  minutos: number;
  costoHora: number;
}
export interface ItemEquipo {
  minutosUso: number;
  costoAdquisicion: number;
  vidaUtilHoras: number;
}
export interface ItemTercerizado {
  costo: number;
}

export interface FichaTecnica {
  materiales: ItemMaterial[];
  manoObra: ItemManoObra[];
  equipos: ItemEquipo[];
  tercerizados: ItemTercerizado[];
  costoEsterilizacion: number;
}

export interface DesgloseCostoDirecto {
  materiales: number;
  manoObra: number;
  equipos: number;
  esterilizacion: number;
  tercerizados: number;
  total: number;
}

/** Depreciación por minuto = costo de adquisición ÷ (vida útil en horas × 60) */
export function depreciacionPorMinuto(costoAdquisicion: number, vidaUtilHoras: number): number {
  if (vidaUtilHoras <= 0) return 0;
  return costoAdquisicion / (vidaUtilHoras * 60);
}

/** cantidad × costo unitario */
export function costoMaterial(item: ItemMaterial): number {
  return item.cantidad * item.costoUnitario;
}

/** (minutos ÷ 60) × costo por hora */
export function costoManoObra(item: ItemManoObra): number {
  return (item.minutos / 60) * item.costoHora;
}

/** minutos de uso × depreciación por minuto */
export function costoEquipo(item: ItemEquipo): number {
  return item.minutosUso * depreciacionPorMinuto(item.costoAdquisicion, item.vidaUtilHoras);
}

const sumar = <T>(items: T[], fn: (i: T) => number) => items.reduce((acc, i) => acc + fn(i), 0);

/**
 * COSTO DIRECTO = materiales + mano de obra + equipos + esterilización + tercerizados.
 * Cada componente se redondea a céntimos y el total es la suma de los componentes redondeados,
 * para que el desglose mostrado siempre cuadre con el total.
 */
export function calcularCostoDirecto(ficha: FichaTecnica): DesgloseCostoDirecto {
  const materiales = redondear(sumar(ficha.materiales, costoMaterial));
  const manoObra = redondear(sumar(ficha.manoObra, costoManoObra));
  const equipos = redondear(sumar(ficha.equipos, costoEquipo));
  const esterilizacion = redondear(ficha.costoEsterilizacion);
  const tercerizados = redondear(sumar(ficha.tercerizados, (t) => t.costo));
  const total = redondear(materiales + manoObra + equipos + esterilizacion + tercerizados);
  return { materiales, manoObra, equipos, esterilizacion, tercerizados, total };
}

/** Minutos de sillón que consume una atención completa: duración por sesión × n.º de sesiones */
export function minutosSillon(duracionMin: number, sesiones: number): number {
  return duracionMin * Math.max(1, sesiones);
}
