/** Consultas del libro contable para las pantallas de Finanzas. */
import "server-only";
import { obtenerConfiguracion, prisma } from "../db";
import { finDia, inicioDia, periodoDe, periodosEntre } from "../formato";
import { resultadoMes, sumarMeses, type ResultadoMes, type Sumas } from "./resultado";
import type { DestinoGasto } from "./normalizar";

export interface RangoPeriodos {
  desde: string; // AAAA-MM
  hasta: string; // AAAA-MM
}

const ultimoDia = (p: string) => {
  const [a, m] = p.split("-").map(Number);
  return new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
};

/** Primer y último periodo con datos en el libro */
export async function periodosDisponibles(): Promise<string[]> {
  const [a, b, c, d] = await Promise.all([
    prisma.ingreso.findFirst({ orderBy: { fecha: "asc" }, select: { fecha: true } }),
    prisma.ingreso.findFirst({ orderBy: { fecha: "desc" }, select: { fecha: true } }),
    prisma.gasto.findFirst({ orderBy: { fecha: "asc" }, select: { fecha: true } }),
    prisma.gasto.findFirst({ orderBy: { fecha: "desc" }, select: { fecha: true } }),
  ]);
  const fechas = [a, b, c, d].filter(Boolean).map((x) => x!.fecha);
  if (!fechas.length) return [];
  const min = periodoDe(new Date(Math.min(...fechas.map((f) => f.getTime()))));
  const max = periodoDe(new Date(Math.max(...fechas.map((f) => f.getTime()))));
  return periodosEntre(`${min}-01`, `${max}-01`);
}

/** Lee ?desde=AAAA-MM&hasta=AAAA-MM o ?rango=anio|anio-anterior|12-meses|todo */
export function leerRango(sp: Record<string, string | string[] | undefined>, disponibles: string[]): RangoPeriodos & { rango?: string } {
  const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const ok = (v?: string) => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
  const ultimo = disponibles[disponibles.length - 1] ?? periodoDe(new Date());
  const primero = disponibles[0] ?? ultimo;
  const anio = ultimo.slice(0, 4);
  const rango = uno(sp.rango);
  if (rango === "todo") return { desde: primero, hasta: ultimo, rango };
  if (rango === "anio-anterior") return { desde: `${Number(anio) - 1}-01`, hasta: `${Number(anio) - 1}-12`, rango };
  if (rango === "12-meses") {
    const i = Math.max(0, disponibles.length - 12);
    return { desde: disponibles[i] ?? primero, hasta: ultimo, rango };
  }
  const d = uno(sp.desde), h = uno(sp.hasta);
  if (ok(d) && ok(h)) return d! <= h! ? { desde: d!, hasta: h! } : { desde: h!, hasta: d! };
  return { desde: `${anio}-01`, hasta: ultimo, rango: "anio" };
}

export interface DatosFinanzas {
  periodos: string[];
  meses: ResultadoMes[];
  total: ReturnType<typeof sumarMeses>;
  medios: { medio: string; monto: number; cantidad: number }[];
  pacientesUnicos: number;
  cobros: number;
  tipos: { id: number; nombre: string; destino: DestinoGasto; monto: number; cantidad: number; anterior: number }[];
  metas: Map<string, Partial<Record<"ORTODONCIA" | "ODONTOLOGIA" | "INICIOS" | "UTILIDAD", number>>>;
  inicios: Map<string, number>;
  reparto: { metodo: "INGRESOS" | "MITAD" | "FIJO"; porcentajeOrtodoncia: number };
}

/** Periodo equivalente anterior (misma cantidad de meses justo antes) */
function rangoAnterior(r: RangoPeriodos): RangoPeriodos {
  const n = periodosEntre(`${r.desde}-01`, `${r.hasta}-01`).length;
  const [a, m] = r.desde.split("-").map(Number);
  const fin = new Date(Date.UTC(a, m - 2, 1));
  const ini = new Date(Date.UTC(a, m - 1 - n, 1));
  return { desde: ini.toISOString().slice(0, 7), hasta: fin.toISOString().slice(0, 7) };
}

export async function datosFinanzas(r: RangoPeriodos): Promise<DatosFinanzas> {
  const periodos = periodosEntre(`${r.desde}-01`, `${r.hasta}-01`);
  const ant = rangoAnterior(r);
  const desdeF = inicioDia(`${r.desde}-01`), hastaF = finDia(ultimoDia(r.hasta));
  const [ingresos, gastos, gastosAnt, metas, inicios, config] = await Promise.all([
    prisma.ingreso.findMany({ where: { fecha: { gte: desdeF, lte: hastaF } }, select: { fecha: true, monto: true, especialidad: true, medioPago: true, pacienteClave: true } }),
    prisma.gasto.findMany({ where: { fecha: { gte: desdeF, lte: hastaF } }, select: { fecha: true, monto: true, tipoGasto: true } }),
    prisma.gasto.groupBy({ by: ["tipoGastoId"], where: { fecha: { gte: inicioDia(`${ant.desde}-01`), lte: finDia(ultimoDia(ant.hasta)) } }, _sum: { monto: true } }),
    prisma.meta.findMany({ where: { periodo: { in: periodos } } }),
    prisma.inicio.findMany({ where: { fecha: { gte: desdeF, lte: hastaF } }, select: { fecha: true, cantidad: true } }),
    obtenerConfiguracion(),
  ]);
  const reparto = { metodo: config.repartoMetodo, porcentajeOrtodoncia: config.repartoOrtodoncia };

  const ing = new Map(periodos.map((p) => [p, { ORTODONCIA: 0, ODONTOLOGIA: 0 }]));
  const medios = new Map<string, { monto: number; cantidad: number }>();
  const pacientes = new Set<string>();
  for (const x of ingresos) {
    const p = periodoDe(x.fecha);
    const e = ing.get(p);
    if (e) e[x.especialidad] += x.monto;
    const m = medios.get(x.medioPago) ?? { monto: 0, cantidad: 0 };
    m.monto += x.monto;
    m.cantidad++;
    medios.set(x.medioPago, m);
    pacientes.add(x.pacienteClave);
  }
  const gas = new Map<string, Sumas>(periodos.map((p) => [p, {}]));
  const porTipo = new Map<number, DatosFinanzas["tipos"][number]>();
  for (const g of gastos) {
    const s = gas.get(periodoDe(g.fecha));
    if (s) s[g.tipoGasto.destino] = (s[g.tipoGasto.destino] ?? 0) + g.monto;
    const t = porTipo.get(g.tipoGasto.id) ?? { id: g.tipoGasto.id, nombre: g.tipoGasto.nombre, destino: g.tipoGasto.destino, monto: 0, cantidad: 0, anterior: 0 };
    t.monto += g.monto;
    t.cantidad++;
    porTipo.set(g.tipoGasto.id, t);
  }
  for (const a of gastosAnt) {
    const t = porTipo.get(a.tipoGastoId);
    if (t) t.anterior = a._sum.monto ?? 0;
  }
  const meses = periodos.map((p) => resultadoMes(p, ing.get(p)!, gas.get(p)!, reparto));
  const mapaMetas = new Map<string, DatosFinanzas["metas"] extends Map<string, infer V> ? V : never>();
  for (const m of metas) mapaMetas.set(m.periodo, { ...(mapaMetas.get(m.periodo) ?? {}), [m.indicador]: m.valor });
  const mapaIni = new Map<string, number>();
  for (const i of inicios) mapaIni.set(periodoDe(i.fecha), (mapaIni.get(periodoDe(i.fecha)) ?? 0) + i.cantidad);

  return {
    periodos,
    meses,
    total: sumarMeses(meses),
    medios: [...medios].map(([medio, v]) => ({ medio, ...v })).sort((a, b) => b.monto - a.monto),
    pacientesUnicos: pacientes.size,
    cobros: ingresos.length,
    tipos: [...porTipo.values()].sort((a, b) => b.monto - a.monto),
    metas: mapaMetas,
    inicios: mapaIni,
    reparto,
  };
}

/** Evolución anual: ingresos y utilidad por mes para cada año (para comparar 2024 vs 2025 vs 2026) */
export async function comparativoAnual(): Promise<{ anio: string; meses: { mes: number; ingresos: number; utilidad: number }[] }[]> {
  const disp = await periodosDisponibles();
  if (!disp.length) return [];
  const d = await datosFinanzas({ desde: disp[0], hasta: disp[disp.length - 1] });
  const porAnio = new Map<string, { mes: number; ingresos: number; utilidad: number }[]>();
  for (const m of d.meses) {
    const [a, mes] = m.periodo.split("-");
    if (!porAnio.has(a)) porAnio.set(a, []);
    porAnio.get(a)!.push({ mes: Number(mes), ingresos: m.total.ingresos, utilidad: m.total.utilidad });
  }
  return [...porAnio].map(([anio, meses]) => ({ anio, meses }));
}
