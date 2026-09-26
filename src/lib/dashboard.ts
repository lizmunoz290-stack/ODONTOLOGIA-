/** Datos del dashboard: KPIs, rankings, evolución, categorías, equilibrio y productividad. */
import "server-only";
import { analizar, type AtencionAnalizada, type ResultadoAnalisis } from "./analisis";
import { obtenerConfiguracion } from "./db";
import { serviciosCosteados } from "./servicios";
import {
  acumular,
  agruparPor,
  equilibrioIndividual,
  equilibrioMezcla,
  ingresoNeto,
  nivelMargen,
  type Acumulado,
  type NivelMargen,
} from "./costeo";
import { CATEGORIAS, type CategoriaKey, type TurnoKey } from "./constantes";
import { finDia, inicioDia, periodosEntre, redondear } from "./formato";
import type { Filtros } from "./filtros";

export interface FilaServicio extends Acumulado {
  servicioId: number;
  servicio: string;
  categoria: CategoriaKey;
  participacionCantidad: number;
  participacionIngresos: number;
  /** Valores por atención */
  unit: { ingresoNeto: number; costoDirecto: number; costoIndirecto: number; costoTotal: number; utilidad: number };
  nivel: NivelMargen;
}

export interface FilaEquilibrio {
  servicioId: number;
  servicio: string;
  precioNeto: number;
  costoDirecto: number;
  margenContribucion: number;
  individual: number | null;
  mezcla: number | null;
  vendidasMes: number;
  /** vendidas por mes ÷ equilibrio individual */
  cobertura: number | null;
}

export interface DatosDashboard {
  analisis: ResultadoAnalisis;
  total: Acumulado;
  pendienteCobro: number;
  servicios: FilaServicio[];
  estrella: FilaServicio | null;
  menorMargen: FilaServicio | null;
  alertas: FilaServicio[];
  evolucion: { periodo: string; ingresos: number; utilidad: number; atenciones: number }[];
  categorias: { categoria: CategoriaKey; nombre: string; ingresos: number; cantidad: number; participacion: number }[];
  odontologos: (Acumulado & { odontologoId: number; odontologo: string; horas: number; ingresoPorHora: number })[];
  turnos: (Acumulado & { turno: TurnoKey; horas: number; ingresoPorHora: number })[];
  equilibrio: {
    costosFijosMes: number;
    mcPonderado: number;
    totalMezcla: number | null;
    filas: FilaEquilibrio[];
  };
  margenMinimo: number;
}

/** Periodo de 6 meses que termina en `hasta` (o el rango completo si es mayor). */
function rangoEvolucion(f: Filtros): Filtros {
  const [a, m] = f.hasta.slice(0, 7).split("-").map(Number);
  const inicio6 = new Date(Date.UTC(a, m - 6, 1)).toISOString().slice(0, 10);
  return { ...f, desde: f.desde < inicio6 ? f.desde : inicio6 };
}

function diasEntre(desde: string, hasta: string) {
  return Math.max(1, Math.round((finDia(hasta).getTime() - inicioDia(desde).getTime()) / 86_400_000));
}

export async function datosDashboard(filtros: Filtros): Promise<DatosDashboard> {
  const [analisis, evol, config, catalogo] = await Promise.all([
    analizar(filtros),
    analizar(rangoEvolucion(filtros)),
    obtenerConfiguracion(),
    serviciosCosteados({ activo: true }),
  ]);
  const at = analisis.atenciones;
  const total = acumular(at);
  const minimo = config.margenMinimo;

  // Por servicio
  const grupos = agruparPor(at, (a) => a.servicioId);
  const servicios: FilaServicio[] = [...grupos.values()].map(({ items, ...g }) => {
    const x = items[0];
    const n = g.cantidad;
    return {
      ...g,
      servicioId: x.servicioId,
      servicio: x.servicio,
      categoria: x.categoria,
      participacionCantidad: total.cantidad ? n / total.cantidad : 0,
      participacionIngresos: total.ingresoNeto ? g.ingresoNeto / total.ingresoNeto : 0,
      unit: {
        ingresoNeto: g.ingresoNeto / n,
        costoDirecto: g.costoDirecto / n,
        costoIndirecto: g.costoIndirecto / n,
        costoTotal: g.costoTotal / n,
        utilidad: g.utilidad / n,
      },
      nivel: nivelMargen(g.margen, minimo),
    };
  });
  servicios.sort((a, b) => b.utilidad - a.utilidad);
  const estrella = servicios[0] ?? null;
  const conVolumen = servicios.filter((s) => s.cantidad >= 3);
  const menorMargen = (conVolumen.length ? conVolumen : servicios).reduce<FilaServicio | null>(
    (min, s) => (!min || s.margen < min.margen ? s : min),
    null,
  );
  const alertas = servicios.filter((s) => s.nivel !== "OK").sort((a, b) => a.margen - b.margen);

  // Evolución mensual
  const porMes = agruparPor(evol.atenciones, (a) => a.periodo);
  const evolucion = periodosEntre(rangoEvolucion(filtros).desde, filtros.hasta).map((p) => {
    const g = porMes.get(p);
    return { periodo: p, ingresos: g?.ingresoNeto ?? 0, utilidad: g?.utilidad ?? 0, atenciones: g?.cantidad ?? 0 };
  });

  // Categorías (orden fijo del catálogo para que el color siga a la categoría)
  const porCat = agruparPor(at, (a) => a.categoria);
  const categorias = (Object.keys(CATEGORIAS) as CategoriaKey[])
    .filter((c) => porCat.has(c))
    .map((c) => ({
      categoria: c,
      nombre: CATEGORIAS[c],
      ingresos: porCat.get(c)!.ingresoNeto,
      cantidad: porCat.get(c)!.cantidad,
      participacion: total.ingresoNeto ? porCat.get(c)!.ingresoNeto / total.ingresoNeto : 0,
    }));

  // Productividad
  const conHoras = <T extends Acumulado>(g: T) => {
    const horas = g.minutos / 60;
    return { ...g, horas, ingresoPorHora: horas ? g.ingresoNeto / horas : 0 };
  };
  const odontologos = [...agruparPor(at, (a) => a.odontologoId).values()]
    .map(({ items, ...g }) => ({ ...conHoras(g), odontologoId: items[0].odontologoId, odontologo: items[0].odontologo }))
    .sort((a, b) => b.ingresoNeto - a.ingresoNeto);
  const porTurno = agruparPor(at, (a) => a.turno);
  const turnos = (["MANANA", "TARDE"] as TurnoKey[])
    .map((t) => {
      const g = porTurno.get(t);
      if (!g) return null;
      const { items: _items, ...resto } = g;
      void _items;
      return { ...conHoras(resto), turno: t };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  // Punto de equilibrio mensual
  const mesesConGastos = [...analisis.indirectosPorMes.values()].filter((v) => v > 0);
  const costosFijosMes = mesesConGastos.length ? redondear(mesesConGastos.reduce((s, v) => s + v, 0) / mesesConGastos.length) : 0;
  const mesesRango = diasEntre(filtros.desde, filtros.hasta) / 30.44;
  const baseEq = catalogo.map((s) => {
    const g = grupos.get(s.id);
    return {
      id: s.id,
      servicio: s.nombre,
      precioNeto: g ? g.ingresoNeto / g.cantidad : ingresoNeto(s.precio, true, config.igvPorcentaje),
      costoDirecto: g ? g.costoDirecto / g.cantidad : s.costoDirecto.total,
      cantidad: g?.cantidad ?? 0,
    };
  });
  const mezcla = equilibrioMezcla(costosFijosMes, baseEq);
  const filasEq: FilaEquilibrio[] = baseEq
    .map((s, i) => {
      const ind = equilibrioIndividual(costosFijosMes, s.precioNeto, s.costoDirecto);
      const vendidasMes = s.cantidad / mesesRango;
      return {
        servicioId: s.id,
        servicio: s.servicio,
        precioNeto: s.precioNeto,
        costoDirecto: s.costoDirecto,
        margenContribucion: ind.margenContribucion,
        individual: ind.atenciones,
        mezcla: s.cantidad ? mezcla.porServicio[i].atenciones : null,
        vendidasMes,
        cobertura: ind.atenciones ? vendidasMes / ind.atenciones : null,
      };
    })
    .sort((a, b) => b.margenContribucion - a.margenContribucion);

  const pendienteCobro = redondear(at.reduce((s, a: AtencionAnalizada) => s + (a.precioCobrado - a.montoPagado), 0));

  return {
    analisis,
    total,
    pendienteCobro,
    servicios,
    estrella,
    menorMargen,
    alertas,
    evolucion,
    categorias,
    odontologos,
    turnos,
    equilibrio: { costosFijosMes, mcPonderado: mezcla.mcPonderado, totalMezcla: mezcla.totalAtenciones, filas: filasEq },
    margenMinimo: minimo,
  };
}
