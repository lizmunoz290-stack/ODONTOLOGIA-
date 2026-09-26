import { redondear } from "../formato";

export const IGV_PERU = 0.18;

/** Valor de venta sin IGV. Si el precio no incluye IGV, se toma tal cual. */
export function ingresoNeto(precio: number, incluyeIgv: boolean, tasaIgv = IGV_PERU): number {
  return incluyeIgv ? redondear(precio / (1 + tasaIgv)) : redondear(precio);
}

/** Monto de IGV contenido en el precio (0 si no incluye IGV). */
export function montoIgv(precio: number, incluyeIgv: boolean, tasaIgv = IGV_PERU): number {
  return incluyeIgv ? redondear(precio - ingresoNeto(precio, true, tasaIgv)) : 0;
}
