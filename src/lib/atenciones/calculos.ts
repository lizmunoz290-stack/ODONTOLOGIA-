/** Cálculo de los montos de una atención (precio cobrado, IGV, neto y pago). Funciones puras. */
import { redondear } from "../formato";
import { ingresoNeto, montoIgv } from "../costeo/igv";
import type { EstadoPagoKey } from "../constantes";

export interface EntradaMontos {
  precioLista: number;
  descuento: number;
  incluyeIgv: boolean;
  estadoPago: EstadoPagoKey;
  /** Solo se usa si el estado es PARCIAL */
  montoPagado?: number;
  tasaIgv: number;
}

export interface MontosAtencion {
  precioCobrado: number;
  igv: number;
  ingresoNeto: number;
  montoPagado: number;
  saldo: number;
}

export type ResultadoMontos = { ok: true; montos: MontosAtencion } | { ok: false; errores: Record<string, string> };

export function calcularMontos(e: EntradaMontos): ResultadoMontos {
  const errores: Record<string, string> = {};
  if (e.descuento < 0) errores.descuento = "El descuento no puede ser negativo";
  if (e.descuento > e.precioLista) errores.descuento = "El descuento no puede ser mayor al precio de lista";
  const precioCobrado = redondear(e.precioLista - e.descuento);

  let montoPagado = 0;
  if (e.estadoPago === "PAGADO") montoPagado = precioCobrado;
  else if (e.estadoPago === "PARCIAL") {
    const m = e.montoPagado ?? 0;
    if (!(m > 0 && m < precioCobrado)) {
      errores.montoPagado = "En un pago parcial, el monto pagado debe ser mayor a 0 y menor al precio cobrado";
    }
    montoPagado = redondear(m);
  }
  if (Object.keys(errores).length) return { ok: false, errores };
  return {
    ok: true,
    montos: {
      precioCobrado,
      igv: montoIgv(precioCobrado, e.incluyeIgv, e.tasaIgv),
      ingresoNeto: ingresoNeto(precioCobrado, e.incluyeIgv, e.tasaIgv),
      montoPagado,
      saldo: redondear(precioCobrado - montoPagado),
    },
  };
}

/** DNI peruano: 8 dígitos. Carné de extranjería: 9 a 12 caracteres alfanuméricos. */
export function documentoValido(doc: string): boolean {
  return /^\d{8}$/.test(doc) || /^[A-Za-z0-9]{9,12}$/.test(doc);
}
