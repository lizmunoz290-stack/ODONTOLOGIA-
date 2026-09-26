/**
 * Capa de análisis: carga atenciones y gastos, prorratea indirectos por mes
 * y devuelve cada atención con su costo directo e indirecto asignado.
 */
import "server-only";
import type { Canal, Categoria, EstadoPago, MetodoPago, Turno } from "@prisma/client";
import { prisma, obtenerConfiguracion } from "./db";
import {
  calcularTasa,
  construirBasesMensuales,
  indirectoAtencion,
  type AtencionCosteada,
  type MetodoProrrateo,
  type TasaProrrateo,
} from "./costeo";
import { finDia, inicioDia, periodoDe, periodosEntre } from "./formato";
import type { Filtros } from "./filtros";

export interface AtencionAnalizada extends AtencionCosteada {
  id: number;
  fecha: Date;
  periodo: string;
  servicioId: number;
  servicio: string;
  categoria: Categoria;
  odontologoId: number;
  odontologo: string;
  paciente: string;
  dni: string | null;
  turno: Turno;
  canal: Canal;
  metodoPago: MetodoPago;
  estadoPago: EstadoPago;
  precioLista: number;
  descuento: number;
  incluyeIgv: boolean;
  montoPagado: number;
}

export interface ResultadoAnalisis {
  filtros: Filtros;
  metodo: MetodoProrrateo;
  atenciones: AtencionAnalizada[];
  /** Tasa de prorrateo de cada mes del rango */
  tasas: Map<string, TasaProrrateo>;
  /** Costos indirectos totales por mes */
  indirectosPorMes: Map<string, number>;
  periodos: string[];
}

/** Primer y último día (aaaa-mm-dd) de los meses que abarca el rango */
function mesesCompletos(desde: string, hasta: string) {
  const [a, m] = hasta.slice(0, 7).split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  return { desde: `${desde.slice(0, 7)}-01`, hasta: ultimo };
}

export async function analizar(filtros: Filtros, metodoForzado?: MetodoProrrateo): Promise<ResultadoAnalisis> {
  const config = await obtenerConfiguracion();
  const metodo = metodoForzado ?? config.metodoProrrateo;
  const periodos = periodosEntre(filtros.desde, filtros.hasta);
  const meses = mesesCompletos(filtros.desde, filtros.hasta);

  // Todas las atenciones de los meses completos: la tasa se calcula con toda la clínica, sin filtros.
  const [filas, gastos] = await Promise.all([
    prisma.atencion.findMany({
      where: { fecha: { gte: inicioDia(meses.desde), lte: finDia(meses.hasta) } },
      include: {
        servicio: { select: { nombre: true, categoria: true } },
        odontologo: { select: { nombre: true } },
        paciente: { select: { nombre: true, dni: true } },
      },
      orderBy: { fecha: "asc" },
    }),
    prisma.gastoIndirecto.findMany({ where: { periodo: { in: periodos } }, select: { periodo: true, monto: true } }),
  ]);

  const conPeriodo = filas.map((a) => ({ a, periodo: periodoDe(a.fecha) }));
  const bases = construirBasesMensuales(
    conPeriodo.map(({ a, periodo }) => ({ periodo, minutos: a.minutosSnapshot, ingresoNeto: a.ingresoNeto })),
    gastos,
  );
  const tasas = new Map<string, TasaProrrateo>();
  const indirectosPorMes = new Map<string, number>();
  for (const p of periodos) {
    const base = bases.get(p) ?? { periodo: p, totalIndirectos: 0, totalMinutos: 0, totalAtenciones: 0, totalIngresos: 0 };
    tasas.set(p, calcularTasa(metodo, base));
    indirectosPorMes.set(p, base.totalIndirectos);
  }

  const ini = inicioDia(filtros.desde).getTime();
  const fin = finDia(filtros.hasta).getTime();
  const atenciones: AtencionAnalizada[] = [];
  for (const { a, periodo } of conPeriodo) {
    const t = a.fecha.getTime();
    if (t < ini || t > fin) continue;
    if (filtros.odontologoId && a.odontologoId !== filtros.odontologoId) continue;
    if (filtros.servicioId && a.servicioId !== filtros.servicioId) continue;
    if (filtros.categoria && a.servicio.categoria !== filtros.categoria) continue;
    if (filtros.turno && a.turno !== filtros.turno) continue;
    const tasa = tasas.get(periodo)!;
    atenciones.push({
      id: a.id,
      fecha: a.fecha,
      periodo,
      servicioId: a.servicioId,
      servicio: a.servicio.nombre,
      categoria: a.servicio.categoria,
      odontologoId: a.odontologoId,
      odontologo: a.odontologo.nombre,
      paciente: a.paciente.nombre,
      dni: a.paciente.dni,
      turno: a.turno,
      canal: a.canal,
      metodoPago: a.metodoPago,
      estadoPago: a.estadoPago,
      precioLista: a.precioLista,
      descuento: a.descuento,
      incluyeIgv: a.incluyeIgv,
      montoPagado: a.montoPagado,
      precioCobrado: a.precioCobrado,
      ingresoNeto: a.ingresoNeto,
      costoDirecto: a.costoDirectoSnapshot,
      costoIndirecto: indirectoAtencion(tasa, { minutos: a.minutosSnapshot, ingresoNeto: a.ingresoNeto }),
      minutos: a.minutosSnapshot,
    });
  }

  return { filtros, metodo, atenciones, tasas, indirectosPorMes, periodos };
}
