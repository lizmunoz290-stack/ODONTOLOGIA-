/** Los 8 reportes: datos + columnas (compartidos entre la pantalla y el Excel). */
import "server-only";
import { analizar, type AtencionAnalizada, type ResultadoAnalisis } from "../analisis";
import { prisma } from "../db";
import { serviciosCosteados, type ServicioCosteado } from "../servicios";
import {
  acumular,
  agruparPor,
  costoEquipo,
  costoManoObra,
  costoMaterial,
  depreciacionPorMinuto,
  FORMULA_METODO,
  NOMBRE_METODO,
  type Acumulado,
} from "../costeo";
import {
  CANALES,
  CATEGORIAS,
  CATEGORIAS_GASTO,
  ESTADOS_PAGO,
  METODOS_PAGO,
  ROLES_MANO_OBRA,
  TIPOS_TERCERIZADO,
  TURNOS,
} from "../constantes";
import { nombrePeriodo, redondear } from "../formato";
import type { Filtros } from "../filtros";
import { columnas, dividir, formulaDividir, type Hoja, type Reporte } from "./tipos";
import { datosFinanzas } from "../libro/datos";
import { NOMBRE_DESTINO } from "../libro/normalizar";

export type TipoReporte =
  | "mas-vendidos"
  | "costeo"
  | "ficha-tecnica"
  | "consumo-materiales"
  | "indirectos"
  | "odontologos"
  | "ventas"
  | "estado-resultados"
  | "consolidado";

export interface InfoReporte {
  tipo: TipoReporte;
  titulo: string;
  descripcion: string;
  archivo: string;
  /** Requiere ver costos (solo administrador) */
  soloCostos: boolean;
}

export const REPORTES: InfoReporte[] = [
  { tipo: "mas-vendidos", titulo: "Servicios más vendidos", descripcion: "Cantidad, ingresos y participación % de cada servicio.", archivo: "Servicios_mas_vendidos", soloCostos: false },
  { tipo: "costeo", titulo: "Costeo por servicio", descripcion: "Desglose de costos directos e indirectos, utilidad y margen.", archivo: "Costeo_por_servicio", soloCostos: true },
  { tipo: "ficha-tecnica", titulo: "Ficha técnica de materiales", descripcion: "Materiales, mano de obra, equipos y tercerizados de cada servicio.", archivo: "Ficha_tecnica", soloCostos: true },
  { tipo: "consumo-materiales", titulo: "Consumo de materiales", descripcion: "Materiales consumidos en el periodo según las atenciones (útil para compras).", archivo: "Consumo_materiales", soloCostos: true },
  { tipo: "indirectos", titulo: "Costos indirectos y prorrateo", descripcion: "Gastos fijos mensuales y su reparto entre los servicios.", archivo: "Costos_indirectos", soloCostos: true },
  { tipo: "odontologos", titulo: "Rentabilidad por odontólogo", descripcion: "Atenciones, horas, ingresos y (para el administrador) utilidad por profesional.", archivo: "Rentabilidad_odontologo", soloCostos: false },
  { tipo: "ventas", titulo: "Ventas detalladas", descripcion: "Todas las atenciones del periodo con precios, pagos y canal.", archivo: "Ventas_detalladas", soloCostos: false },
  { tipo: "estado-resultados", titulo: "Estado de resultados (libro contable)", descripcion: "Ingresos y gastos reales por mes y por especialidad, y gastos por tipo.", archivo: "Estado_de_resultados", soloCostos: true },
  { tipo: "consolidado", titulo: "Reporte consolidado", descripcion: "Un solo archivo con todas las hojas anteriores.", archivo: "Consolidado", soloCostos: false },
];

export function infoReporte(tipo: string): InfoReporte | undefined {
  return REPORTES.find((r) => r.tipo === tipo);
}

/** Carga perezosa y compartida de datos (el consolidado no repite consultas). */
class Contexto {
  private _analisis?: Promise<ResultadoAnalisis>;
  private _servicios?: Promise<ServicioCosteado[]>;
  constructor(
    readonly filtros: Filtros,
    readonly verCostos: boolean,
  ) {}
  analisis() {
    return (this._analisis ??= analizar(this.filtros));
  }
  servicios() {
    return (this._servicios ??= serviciosCosteados());
  }
}

// ───────────────────────── 1. Más vendidos ─────────────────────────

async function masVendidos(ctx: Contexto): Promise<Hoja[]> {
  const { atenciones } = await ctx.analisis();
  const total = acumular(atenciones);
  const filas = [...agruparPor(atenciones, (a) => a.servicioId).values()]
    .map(({ items, ...g }) => ({ ...g, servicio: items[0].servicio, categoria: CATEGORIAS[items[0].categoria] }))
    .sort((a, b) => b.cantidad - a.cantidad || b.ingresoNeto - a.ingresoNeto);
  type F = (typeof filas)[number];
  return [
    {
      nombre: "Más vendidos",
      titulo: "Servicios más vendidos",
      notas: ["Ingresos sin IGV. Participación = valor del servicio ÷ total del periodo."],
      tabla: {
        totales: true,
        filas: filas.map((f, i) => ({ ...f, puesto: i + 1 })),
        columnas: columnas<F & { puesto: number }>([
          { clave: "puesto", titulo: "N.º", tipo: "entero", valor: (f) => f.puesto, total: { tipo: "texto", texto: "TOTAL" } },
          { clave: "servicio", titulo: "Servicio", tipo: "texto", valor: (f) => f.servicio },
          { clave: "categoria", titulo: "Categoría", tipo: "texto", valor: (f) => f.categoria },
          { clave: "cantidad", titulo: "Cantidad", tipo: "entero", valor: (f) => f.cantidad, total: { tipo: "suma" } },
          { clave: "pctCantidad", titulo: "Participación cantidad", tipo: "porcentaje", valor: (f) => dividir(f.cantidad, total.cantidad), total: { tipo: "suma" } },
          { clave: "ingresos", titulo: "Ingresos (sin IGV)", tipo: "soles", valor: (f) => f.ingresoNeto, total: { tipo: "suma" } },
          { clave: "pctIngresos", titulo: "Participación ingresos", tipo: "porcentaje", valor: (f) => dividir(f.ingresoNeto, total.ingresoNeto), total: { tipo: "suma" } },
          {
            clave: "ticket",
            titulo: "Ticket promedio",
            tipo: "soles",
            valor: (f) => f.ticketPromedio,
            total: { tipo: "formula", excel: (r) => formulaDividir(r("ingresos"), r("cantidad")), valor: (t) => dividir(t.ingresos, t.cantidad) },
          },
        ]),
      },
    },
  ];
}

// ───────────────────────── 2. Costeo por servicio ─────────────────────────

async function costeo(ctx: Contexto): Promise<Hoja[]> {
  const [{ atenciones }, servicios] = await Promise.all([ctx.analisis(), ctx.servicios()]);
  const porId = new Map(servicios.map((s) => [s.id, s]));
  const filas = [...agruparPor(atenciones, (a) => a.servicioId).values()]
    .map(({ items, ...g }) => ({ ...g, s: porId.get(items[0].servicioId)!, servicio: items[0].servicio }))
    .sort((a, b) => b.utilidad - a.utilidad);
  type F = (typeof filas)[number];
  const u = (f: F, v: number) => dividir(v, f.cantidad);
  return [
    {
      nombre: "Costeo por servicio",
      titulo: "Costeo por servicio",
      notas: [
        "Valores unitarios = promedio por atención. Desglose del costo directo según la ficha técnica vigente;",
        "el costo directo y la utilidad usan el costo registrado en cada atención. Indirectos prorrateados según el método configurado.",
      ],
      tabla: {
        totales: true,
        filas,
        columnas: columnas<F>([
          { clave: "servicio", titulo: "Servicio", tipo: "texto", valor: (f) => f.servicio, total: { tipo: "texto", texto: "TOTAL" } },
          { clave: "categoria", titulo: "Categoría", tipo: "texto", valor: (f) => CATEGORIAS[f.s.categoria] },
          { clave: "cantidad", titulo: "Atenciones", tipo: "entero", valor: (f) => f.cantidad, total: { tipo: "suma" } },
          { clave: "precio", titulo: "Precio neto prom.", tipo: "soles", valor: (f) => f.ticketPromedio },
          { clave: "mat", titulo: "Materiales (ficha)", tipo: "soles", valor: (f) => f.s.costoDirecto.materiales },
          { clave: "mo", titulo: "Mano de obra (ficha)", tipo: "soles", valor: (f) => f.s.costoDirecto.manoObra },
          { clave: "eq", titulo: "Equipos (ficha)", tipo: "soles", valor: (f) => f.s.costoDirecto.equipos },
          { clave: "est", titulo: "Esterilización (ficha)", tipo: "soles", valor: (f) => f.s.costoDirecto.esterilizacion },
          { clave: "ter", titulo: "Tercerizados (ficha)", tipo: "soles", valor: (f) => f.s.costoDirecto.tercerizados },
          { clave: "cdu", titulo: "Costo directo unit.", tipo: "soles", valor: (f) => u(f, f.costoDirecto) },
          { clave: "ciu", titulo: "Costo indirecto unit.", tipo: "soles", valor: (f) => u(f, f.costoIndirecto) },
          { clave: "ctu", titulo: "Costo total unit.", tipo: "soles", valor: (f) => u(f, f.costoTotal) },
          { clave: "uu", titulo: "Utilidad unit.", tipo: "soles", valor: (f) => u(f, f.utilidad) },
          { clave: "ingresos", titulo: "Ingresos totales", tipo: "soles", valor: (f) => f.ingresoNeto, total: { tipo: "suma" } },
          { clave: "cd", titulo: "Costo directo total", tipo: "soles", valor: (f) => f.costoDirecto, total: { tipo: "suma" } },
          { clave: "ci", titulo: "Costo indirecto total", tipo: "soles", valor: (f) => f.costoIndirecto, total: { tipo: "suma" } },
          { clave: "utilidad", titulo: "Utilidad total", tipo: "soles", valor: (f) => f.utilidad, total: { tipo: "suma" } },
          {
            clave: "margen",
            titulo: "Margen %",
            tipo: "porcentaje",
            valor: (f) => f.margen,
            total: { tipo: "formula", excel: (r) => formulaDividir(r("utilidad"), r("ingresos")), valor: (t) => dividir(t.utilidad, t.ingresos) },
          },
        ]),
      },
    },
  ];
}

// ───────────────────────── 3. Ficha técnica ─────────────────────────

interface ItemFicha {
  servicio: string;
  tipo: string;
  concepto: string;
  unidad: string;
  cantidad: number;
  costoUnitario: number;
  subtotal: number;
}

async function fichaTecnica(ctx: Contexto): Promise<Hoja[]> {
  let servicios = await ctx.servicios();
  if (ctx.filtros.servicioId) servicios = servicios.filter((s) => s.id === ctx.filtros.servicioId);
  if (ctx.filtros.categoria) servicios = servicios.filter((s) => s.categoria === ctx.filtros.categoria);
  const filas: ItemFicha[] = [];
  for (const s of servicios) {
    for (const m of s.materiales) {
      filas.push({ servicio: s.nombre, tipo: "Material e insumo", concepto: m.material.nombre, unidad: m.material.unidad, cantidad: m.cantidad, costoUnitario: m.material.costoUnitario, subtotal: costoMaterial({ cantidad: m.cantidad, costoUnitario: m.material.costoUnitario }) });
    }
    for (const m of s.manoObra) {
      filas.push({ servicio: s.nombre, tipo: "Mano de obra directa", concepto: ROLES_MANO_OBRA[m.rol], unidad: "minuto", cantidad: m.minutos, costoUnitario: m.costoHora / 60, subtotal: costoManoObra(m) });
    }
    for (const e of s.equipos) {
      filas.push({ servicio: s.nombre, tipo: "Equipo (depreciación)", concepto: e.equipo.nombre, unidad: "minuto", cantidad: e.minutosUso, costoUnitario: depreciacionPorMinuto(e.equipo.costoAdquisicion, e.equipo.vidaUtilHoras), subtotal: costoEquipo({ ...e.equipo, minutosUso: e.minutosUso }) });
    }
    if (s.costoEsterilizacion > 0) {
      filas.push({ servicio: s.nombre, tipo: "Esterilización e instrumental", concepto: "Esterilización por atención", unidad: "atención", cantidad: 1, costoUnitario: s.costoEsterilizacion, subtotal: s.costoEsterilizacion });
    }
    for (const t of s.tercerizados) {
      filas.push({ servicio: s.nombre, tipo: TIPOS_TERCERIZADO[t.tipo], concepto: t.descripcion, unidad: "servicio", cantidad: 1, costoUnitario: t.costo, subtotal: t.costo });
    }
  }
  type R = (typeof servicios)[number];
  return [
    {
      nombre: "Ficha técnica",
      titulo: "Ficha técnica por servicio (detalle)",
      notas: ["Cantidades y costos por atención. Filtre la columna Servicio para ver una sola ficha; el total suma todas las filas mostradas en el reporte."],
      tabla: {
        totales: true,
        filas,
        columnas: columnas<ItemFicha>([
          { clave: "servicio", titulo: "Servicio", tipo: "texto", valor: (f) => f.servicio, total: { tipo: "texto", texto: "TOTAL" } },
          { clave: "tipo", titulo: "Tipo de recurso", tipo: "texto", valor: (f) => f.tipo },
          { clave: "concepto", titulo: "Concepto", tipo: "texto", valor: (f) => f.concepto },
          { clave: "unidad", titulo: "Unidad", tipo: "texto", valor: (f) => f.unidad },
          { clave: "cantidad", titulo: "Cantidad por atención", tipo: "decimal", valor: (f) => f.cantidad },
          { clave: "cu", titulo: "Costo unitario", tipo: "soles", valor: (f) => redondear(f.costoUnitario, 4) },
          { clave: "subtotal", titulo: "Subtotal", tipo: "soles", valor: (f) => f.subtotal, total: { tipo: "suma" } },
        ]),
      },
    },
    {
      nombre: "Resumen fichas",
      titulo: "Costo directo por atención según ficha técnica",
      tabla: {
        totales: false,
        filas: servicios,
        columnas: columnas<R>([
          { clave: "servicio", titulo: "Servicio", tipo: "texto", valor: (s) => s.nombre },
          { clave: "categoria", titulo: "Categoría", tipo: "texto", valor: (s) => CATEGORIAS[s.categoria] },
          { clave: "precio", titulo: "Precio de venta", tipo: "soles", valor: (s) => s.precio },
          { clave: "minutos", titulo: "Minutos de sillón", tipo: "entero", valor: (s) => s.minutos },
          { clave: "mat", titulo: "Materiales", tipo: "soles", valor: (s) => s.costoDirecto.materiales },
          { clave: "mo", titulo: "Mano de obra", tipo: "soles", valor: (s) => s.costoDirecto.manoObra },
          { clave: "eq", titulo: "Equipos", tipo: "soles", valor: (s) => s.costoDirecto.equipos },
          { clave: "est", titulo: "Esterilización", tipo: "soles", valor: (s) => s.costoDirecto.esterilizacion },
          { clave: "ter", titulo: "Tercerizados", tipo: "soles", valor: (s) => s.costoDirecto.tercerizados },
          { clave: "total", titulo: "Costo directo total", tipo: "soles", valor: (s) => s.costoDirecto.total },
        ]),
      },
    },
  ];
}

// ───────────────────────── 4. Consumo de materiales ─────────────────────────

async function consumoMateriales(ctx: Contexto): Promise<Hoja[]> {
  const [{ atenciones }, servicios] = await Promise.all([ctx.analisis(), ctx.servicios()]);
  const cantidadPorServicio = new Map<number, number>();
  for (const a of atenciones) cantidadPorServicio.set(a.servicioId, (cantidadPorServicio.get(a.servicioId) ?? 0) + 1);
  const consumo = new Map<number, { material: string; unidad: string; costoUnitario: number; cantidad: number; servicios: Set<string> }>();
  for (const s of servicios) {
    const n = cantidadPorServicio.get(s.id) ?? 0;
    if (!n) continue;
    for (const m of s.materiales) {
      const c = consumo.get(m.materialId) ?? { material: m.material.nombre, unidad: m.material.unidad, costoUnitario: m.material.costoUnitario, cantidad: 0, servicios: new Set() };
      c.cantidad += m.cantidad * n;
      c.servicios.add(s.nombre);
      consumo.set(m.materialId, c);
    }
  }
  const filas = [...consumo.values()].sort((a, b) => b.cantidad * b.costoUnitario - a.cantidad * a.costoUnitario);
  type F = (typeof filas)[number];
  return [
    {
      nombre: "Consumo de materiales",
      titulo: "Consumo de materiales en el periodo",
      notas: ["Cantidad consumida = cantidad por atención (ficha técnica vigente) × atenciones realizadas de cada servicio."],
      tabla: {
        totales: true,
        filas,
        columnas: columnas<F>([
          { clave: "material", titulo: "Material", tipo: "texto", valor: (f) => f.material, total: { tipo: "texto", texto: "TOTAL" } },
          { clave: "unidad", titulo: "Unidad", tipo: "texto", valor: (f) => f.unidad },
          { clave: "cantidad", titulo: "Cantidad consumida", tipo: "decimal", valor: (f) => redondear(f.cantidad) },
          { clave: "cu", titulo: "Costo unitario", tipo: "soles", valor: (f) => f.costoUnitario },
          { clave: "costo", titulo: "Costo total", tipo: "soles", valor: (f) => redondear(f.cantidad * f.costoUnitario), total: { tipo: "suma" } },
          { clave: "servicios", titulo: "Servicios que lo usan", tipo: "texto", valor: (f) => [...f.servicios].join(", ") },
        ]),
      },
    },
  ];
}

// ───────────────────────── 5. Costos indirectos ─────────────────────────

async function indirectos(ctx: Contexto): Promise<Hoja[]> {
  const analisis = await ctx.analisis();
  const gastos = await prisma.gastoIndirecto.findMany({
    where: { periodo: { in: analisis.periodos } },
    orderBy: [{ periodo: "asc" }, { categoria: "asc" }, { descripcion: "asc" }],
  });
  type G = (typeof gastos)[number];
  const tasas = analisis.periodos.map((p) => analisis.tasas.get(p)!);
  type T = (typeof tasas)[number];

  // Prorrateo: por mes y servicio (con todas las atenciones de la clínica, sin filtros)
  const todo = analisis.filtros.odontologoId || analisis.filtros.categoria || analisis.filtros.turno || analisis.filtros.servicioId
    ? await analizar({ desde: analisis.filtros.desde, hasta: analisis.filtros.hasta }, analisis.metodo)
    : analisis;
  const filasP = [...agruparPor(todo.atenciones, (a) => `${a.periodo}|${a.servicioId}`).values()]
    .map(({ items, ...g }) => ({ ...g, periodo: items[0].periodo, servicio: items[0].servicio, tasa: todo.tasas.get(items[0].periodo)! }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo) || b.costoIndirecto - a.costoIndirecto);
  type P = (typeof filasP)[number];

  const metodo = analisis.metodo;
  return [
    {
      nombre: "Gastos indirectos",
      titulo: "Costos indirectos mensuales",
      tabla: {
        totales: true,
        filas: gastos,
        columnas: columnas<G>([
          { clave: "periodo", titulo: "Periodo", tipo: "texto", valor: (g) => nombrePeriodo(g.periodo), total: { tipo: "texto", texto: "TOTAL" } },
          { clave: "categoria", titulo: "Categoría", tipo: "texto", valor: (g) => CATEGORIAS_GASTO[g.categoria] },
          { clave: "descripcion", titulo: "Descripción", tipo: "texto", valor: (g) => g.descripcion },
          { clave: "monto", titulo: "Monto", tipo: "soles", valor: (g) => g.monto, total: { tipo: "suma" } },
        ]),
      },
    },
    {
      nombre: "Tasa de prorrateo",
      titulo: `Tasa de prorrateo mensual — ${NOMBRE_METODO[metodo]}`,
      notas: [FORMULA_METODO[metodo].tasa, FORMULA_METODO[metodo].asignacion],
      tabla: {
        totales: true,
        filas: tasas,
        columnas: columnas<T>([
          { clave: "periodo", titulo: "Periodo", tipo: "texto", valor: (t) => nombrePeriodo(t.periodo), total: { tipo: "texto", texto: "TOTAL" } },
          { clave: "indirectos", titulo: "Costos indirectos", tipo: "soles", valor: (t) => t.totalIndirectos, total: { tipo: "suma" } },
          {
            clave: "base",
            titulo: metodo === "MINUTOS" ? "Minutos de sillón" : metodo === "ATENCIONES" ? "Atenciones" : "Ingresos netos",
            tipo: metodo === "INGRESOS" ? "soles" : "entero",
            valor: (t) => t.base,
            total: { tipo: "suma" },
          },
          {
            clave: "tasa",
            titulo: metodo === "MINUTOS" ? "S/ por minuto" : metodo === "ATENCIONES" ? "S/ por atención" : "% de ingresos",
            tipo: metodo === "INGRESOS" ? "porcentaje" : "decimal",
            valor: (t) => redondear(t.tasa, 4),
            total: { tipo: "formula", excel: (r) => formulaDividir(r("indirectos"), r("base")), valor: (t) => dividir(t.indirectos, t.base) },
          },
          { clave: "formula", titulo: "Fórmula aplicada", tipo: "texto", valor: (t) => t.formula.replace(/ /g, " ") },
        ]),
      },
    },
    {
      nombre: "Prorrateo por servicio",
      titulo: "Costos indirectos asignados a cada servicio",
      notas: ["Se calcula con todas las atenciones de la clínica en cada mes (sin filtros)."],
      tabla: {
        totales: true,
        filas: filasP,
        columnas: columnas<P>([
          { clave: "periodo", titulo: "Periodo", tipo: "texto", valor: (f) => nombrePeriodo(f.periodo), total: { tipo: "texto", texto: "TOTAL" } },
          { clave: "servicio", titulo: "Servicio", tipo: "texto", valor: (f) => f.servicio },
          { clave: "cantidad", titulo: "Atenciones", tipo: "entero", valor: (f) => f.cantidad, total: { tipo: "suma" } },
          { clave: "minutos", titulo: "Minutos de sillón", tipo: "entero", valor: (f) => f.minutos, total: { tipo: "suma" } },
          { clave: "ingresos", titulo: "Ingresos netos", tipo: "soles", valor: (f) => f.ingresoNeto, total: { tipo: "suma" } },
          { clave: "unit", titulo: "Indirecto por atención", tipo: "soles", valor: (f) => dividir(f.costoIndirecto, f.cantidad) },
          { clave: "asignado", titulo: "Indirecto asignado", tipo: "soles", valor: (f) => f.costoIndirecto, total: { tipo: "suma" } },
        ]),
      },
    },
  ];
}

// ───────────────────────── 6. Por odontólogo ─────────────────────────

async function odontologos(ctx: Contexto): Promise<Hoja[]> {
  const { atenciones } = await ctx.analisis();
  const filas = [...agruparPor(atenciones, (a) => a.odontologoId).values()]
    .map(({ items, ...g }) => ({ ...g, odontologo: items[0].odontologo, horas: g.minutos / 60 }))
    .sort((a, b) => b.ingresoNeto - a.ingresoNeto);
  type F = Acumulado & { odontologo: string; horas: number };
  const cols = columnas<F>([
    { clave: "odontologo", titulo: "Odontólogo", tipo: "texto", valor: (f) => f.odontologo, total: { tipo: "texto", texto: "TOTAL" } },
    { clave: "cantidad", titulo: "Atenciones", tipo: "entero", valor: (f) => f.cantidad, total: { tipo: "suma" } },
    { clave: "horas", titulo: "Horas de sillón", tipo: "decimal", valor: (f) => redondear(f.horas, 1), total: { tipo: "suma" } },
    { clave: "ingresos", titulo: "Ingresos (sin IGV)", tipo: "soles", valor: (f) => f.ingresoNeto, total: { tipo: "suma" } },
    {
      clave: "ticket",
      titulo: "Ticket promedio",
      tipo: "soles",
      valor: (f) => f.ticketPromedio,
      total: { tipo: "formula", excel: (r) => formulaDividir(r("ingresos"), r("cantidad")), valor: (t) => dividir(t.ingresos, t.cantidad) },
    },
    {
      clave: "porHora",
      titulo: "Ingreso por hora",
      tipo: "soles",
      valor: (f) => dividir(f.ingresoNeto, f.horas),
      total: { tipo: "formula", excel: (r) => formulaDividir(r("ingresos"), r("horas")), valor: (t) => dividir(t.ingresos, t.horas) },
    },
  ]);
  if (ctx.verCostos) {
    cols.push(
      ...columnas<F>([
        { clave: "cd", titulo: "Costo directo", tipo: "soles", valor: (f) => f.costoDirecto, total: { tipo: "suma" } },
        { clave: "ci", titulo: "Costo indirecto", tipo: "soles", valor: (f) => f.costoIndirecto, total: { tipo: "suma" } },
        { clave: "utilidad", titulo: "Utilidad", tipo: "soles", valor: (f) => f.utilidad, total: { tipo: "suma" } },
        {
          clave: "margen",
          titulo: "Margen %",
          tipo: "porcentaje",
          valor: (f) => f.margen,
          total: { tipo: "formula", excel: (r) => formulaDividir(r("utilidad"), r("ingresos")), valor: (t) => dividir(t.utilidad, t.ingresos) },
        },
      ]),
    );
  }
  return [{ nombre: "Por odontólogo", titulo: ctx.verCostos ? "Rentabilidad por odontólogo" : "Productividad por odontólogo", tabla: { totales: true, filas, columnas: cols } }];
}

// ───────────────────────── 7. Ventas detalladas ─────────────────────────

async function ventas(ctx: Contexto): Promise<Hoja[]> {
  const { atenciones } = await ctx.analisis();
  const filas = [...atenciones].sort((a, b) => a.fecha.getTime() - b.fecha.getTime() || a.id - b.id);
  type F = AtencionAnalizada;
  const cols = columnas<F>([
    { clave: "fecha", titulo: "Fecha", tipo: "fecha", valor: (a) => a.fecha, total: { tipo: "texto", texto: "TOTAL" } },
    { clave: "id", titulo: "N.º atención", tipo: "entero", valor: (a) => a.id },
    { clave: "paciente", titulo: "Paciente", tipo: "texto", valor: (a) => a.paciente },
    { clave: "dni", titulo: "DNI", tipo: "texto", valor: (a) => a.dni ?? "" },
    { clave: "servicio", titulo: "Servicio", tipo: "texto", valor: (a) => a.servicio },
    { clave: "categoria", titulo: "Categoría", tipo: "texto", valor: (a) => CATEGORIAS[a.categoria] },
    { clave: "odontologo", titulo: "Odontólogo", tipo: "texto", valor: (a) => a.odontologo },
    { clave: "turno", titulo: "Turno", tipo: "texto", valor: (a) => TURNOS[a.turno] },
    { clave: "lista", titulo: "Precio lista", tipo: "soles", valor: (a) => a.precioLista, total: { tipo: "suma" } },
    { clave: "descuento", titulo: "Descuento", tipo: "soles", valor: (a) => a.descuento, total: { tipo: "suma" } },
    { clave: "cobrado", titulo: "Precio cobrado", tipo: "soles", valor: (a) => a.precioCobrado, total: { tipo: "suma" } },
    { clave: "igvIncl", titulo: "Incluye IGV", tipo: "texto", valor: (a) => (a.incluyeIgv ? "Sí" : "No") },
    { clave: "igv", titulo: "IGV", tipo: "soles", valor: (a) => redondear(a.precioCobrado - a.ingresoNeto), total: { tipo: "suma" } },
    { clave: "neto", titulo: "Valor neto", tipo: "soles", valor: (a) => a.ingresoNeto, total: { tipo: "suma" } },
    { clave: "metodo", titulo: "Método de pago", tipo: "texto", valor: (a) => METODOS_PAGO[a.metodoPago] },
    { clave: "estado", titulo: "Estado", tipo: "texto", valor: (a) => ESTADOS_PAGO[a.estadoPago] },
    { clave: "pagado", titulo: "Monto pagado", tipo: "soles", valor: (a) => a.montoPagado, total: { tipo: "suma" } },
    { clave: "saldo", titulo: "Saldo", tipo: "soles", valor: (a) => redondear(a.precioCobrado - a.montoPagado), total: { tipo: "suma" } },
    { clave: "canal", titulo: "Canal", tipo: "texto", valor: (a) => CANALES[a.canal] },
  ]);
  if (ctx.verCostos) {
    cols.push(
      ...columnas<F>([
        { clave: "cd", titulo: "Costo directo", tipo: "soles", valor: (a) => a.costoDirecto, total: { tipo: "suma" } },
        { clave: "ci", titulo: "Costo indirecto", tipo: "soles", valor: (a) => redondear(a.costoIndirecto), total: { tipo: "suma" } },
        { clave: "utilidad", titulo: "Utilidad", tipo: "soles", valor: (a) => redondear(a.ingresoNeto - a.costoDirecto - a.costoIndirecto), total: { tipo: "suma" } },
      ]),
    );
  }
  return [{ nombre: "Ventas detalladas", titulo: "Ventas detalladas por fecha", tabla: { totales: true, filas, columnas: cols } }];
}

// ───────────────────────── 8. Estado de resultados (libro contable) ─────────────────────────

async function estadoResultados(ctx: Contexto): Promise<Hoja[]> {
  const d = await datosFinanzas({ desde: ctx.filtros.desde.slice(0, 7), hasta: ctx.filtros.hasta.slice(0, 7) });
  type M = (typeof d.meses)[number];
  const margen = { tipo: "formula" as const, excel: (r: (c: string) => string) => formulaDividir(r("utilidad"), r("ingresos")), valor: (t: Record<string, number>) => dividir(t.utilidad, t.ingresos) };
  const esp = (["ORTODONCIA", "ODONTOLOGIA"] as const).map((k) => ({ nombre: k === "ORTODONCIA" ? "Ortodoncia" : "Odontología", ...d.total[k] }));
  type E = (typeof esp)[number];
  type T = (typeof d.tipos)[number];
  const ingTotal = d.total.total.ingresos;
  const notaReparto = `Compartidos y gastos fijos repartidos ${d.reparto.metodo === "INGRESOS" ? "según los ingresos de cada especialidad" : d.reparto.metodo === "MITAD" ? "50 % / 50 %" : `con ${Math.round(d.reparto.porcentajeOrtodoncia * 100)} % para Ortodoncia`}.`;
  return [
    {
      nombre: "Estado de resultados",
      titulo: "Estado de resultados mensual (libro contable)",
      notas: ["Gastos operativos = directos + compartidos + fijos. No operativo = retiros de utilidad, préstamos y letras (no restan a la utilidad operativa).", notaReparto],
      tabla: {
        totales: true,
        filas: d.meses,
        columnas: columnas<M>([
          { clave: "mes", titulo: "Mes", tipo: "texto", valor: (m) => nombrePeriodo(m.periodo), total: { tipo: "texto", texto: "TOTAL" } },
          { clave: "orto", titulo: "Ingresos Ortodoncia", tipo: "soles", valor: (m) => m.ORTODONCIA.ingresos, total: { tipo: "suma" } },
          { clave: "odo", titulo: "Ingresos Odontología", tipo: "soles", valor: (m) => m.ODONTOLOGIA.ingresos, total: { tipo: "suma" } },
          { clave: "ingresos", titulo: "Ingresos totales", tipo: "soles", valor: (m) => m.total.ingresos, total: { tipo: "suma" } },
          { clave: "dorto", titulo: "Directo Ortodoncia", tipo: "soles", valor: (m) => m.ORTODONCIA.directo, total: { tipo: "suma" } },
          { clave: "dodo", titulo: "Directo Odontología", tipo: "soles", valor: (m) => m.ODONTOLOGIA.directo, total: { tipo: "suma" } },
          { clave: "comp", titulo: "Directo compartido", tipo: "soles", valor: (m) => m.total.compartido, total: { tipo: "suma" } },
          { clave: "ind", titulo: "Gastos fijos", tipo: "soles", valor: (m) => m.total.indirecto, total: { tipo: "suma" } },
          { clave: "costo", titulo: "Gastos operativos", tipo: "soles", valor: (m) => m.total.costoTotal, total: { tipo: "suma" } },
          { clave: "utilidad", titulo: "Utilidad operativa", tipo: "soles", valor: (m) => m.total.utilidad, total: { tipo: "suma" } },
          { clave: "margen", titulo: "Margen %", tipo: "porcentaje", valor: (m) => m.total.margen, total: margen },
          { clave: "noop", titulo: "No operativo", tipo: "soles", valor: (m) => m.noOperativo, total: { tipo: "suma" } },
          { clave: "flujo", titulo: "Flujo neto", tipo: "soles", valor: (m) => m.flujoNeto, total: { tipo: "suma" } },
          { clave: "inicios", titulo: "Inicios", tipo: "entero", valor: (m) => d.inicios.get(m.periodo) ?? 0, total: { tipo: "suma" } },
        ]),
      },
    },
    {
      nombre: "Por especialidad",
      titulo: "Rentabilidad por especialidad",
      notas: [notaReparto],
      tabla: {
        totales: true,
        filas: esp,
        columnas: columnas<E>([
          { clave: "nombre", titulo: "Especialidad", tipo: "texto", valor: (e) => e.nombre, total: { tipo: "texto", texto: "TOTAL" } },
          { clave: "ingresos", titulo: "Ingresos", tipo: "soles", valor: (e) => e.ingresos, total: { tipo: "suma" } },
          { clave: "directo", titulo: "Costo directo propio", tipo: "soles", valor: (e) => e.directo, total: { tipo: "suma" } },
          { clave: "compartido", titulo: "Compartido asignado", tipo: "soles", valor: (e) => e.compartido, total: { tipo: "suma" } },
          { clave: "indirecto", titulo: "Gastos fijos asignados", tipo: "soles", valor: (e) => e.indirecto, total: { tipo: "suma" } },
          { clave: "costo", titulo: "Costo total", tipo: "soles", valor: (e) => e.costoTotal, total: { tipo: "suma" } },
          { clave: "utilidad", titulo: "Utilidad operativa", tipo: "soles", valor: (e) => e.utilidad, total: { tipo: "suma" } },
          { clave: "margen", titulo: "Margen %", tipo: "porcentaje", valor: (e) => e.margen, total: margen },
        ]),
      },
    },
    {
      nombre: "Gastos por tipo",
      titulo: "Gastos por tipo y clasificación",
      tabla: {
        totales: true,
        filas: d.tipos,
        columnas: columnas<T>([
          { clave: "tipo", titulo: "Tipo de gasto", tipo: "texto", valor: (t) => t.nombre, total: { tipo: "texto", texto: "TOTAL" } },
          { clave: "destino", titulo: "Clasificación", tipo: "texto", valor: (t) => NOMBRE_DESTINO[t.destino] },
          { clave: "n", titulo: "Movimientos", tipo: "entero", valor: (t) => t.cantidad, total: { tipo: "suma" } },
          { clave: "monto", titulo: "Monto", tipo: "soles", valor: (t) => t.monto, total: { tipo: "suma" } },
          { clave: "pct", titulo: "% de los ingresos", tipo: "porcentaje", valor: (t) => dividir(t.monto, ingTotal), total: { tipo: "suma" } },
          { clave: "ant", titulo: "Periodo anterior", tipo: "soles", valor: (t) => t.anterior, total: { tipo: "suma" } },
        ]),
      },
    },
  ];
}

// ───────────────────────── Registro ─────────────────────────

const CONSTRUCTORES: Record<Exclude<TipoReporte, "consolidado">, (ctx: Contexto) => Promise<Hoja[]>> = {
  "mas-vendidos": masVendidos,
  costeo,
  "ficha-tecnica": fichaTecnica,
  "consumo-materiales": consumoMateriales,
  indirectos,
  odontologos,
  ventas,
  "estado-resultados": estadoResultados,
};

/** Construye un reporte. `verCostos` define qué reportes/columnas se incluyen. */
export async function construirReporte(tipo: TipoReporte, filtros: Filtros, verCostos: boolean): Promise<Reporte> {
  const info = infoReporte(tipo)!;
  const ctx = new Contexto(filtros, verCostos);
  let hojas: Hoja[];
  if (tipo === "consolidado") {
    const incluidos = REPORTES.filter((r) => r.tipo !== "consolidado" && (verCostos || !r.soloCostos));
    hojas = (await Promise.all(incluidos.map((r) => CONSTRUCTORES[r.tipo as Exclude<TipoReporte, "consolidado">](ctx)))).flat();
  } else {
    hojas = await CONSTRUCTORES[tipo](ctx);
  }
  return { tipo, nombreArchivo: info.archivo, titulo: info.titulo, descripcion: info.descripcion, hojas };
}
