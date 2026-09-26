/** Filtros comunes (rango de fechas, odontólogo, categoría, turno) leídos desde la URL. */
import { CATEGORIAS, TURNOS, type CategoriaKey, type TurnoKey } from "./constantes";
import { fechaISO } from "./formato";

export interface Filtros {
  desde: string; // aaaa-mm-dd
  hasta: string; // aaaa-mm-dd
  odontologoId?: number;
  categoria?: CategoriaKey;
  turno?: TurnoKey;
  servicioId?: number;
}

export type ParamsBusqueda = Record<string, string | string[] | undefined>;

const esFecha = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Rango predefinido relativo a hoy (hora de Lima). */
export function rangoPredefinido(clave: string, hoy = new Date()): { desde: string; hasta: string } {
  const iso = fechaISO(hoy);
  const [a, m] = iso.split("-").map(Number);
  const primerDia = (anio: number, mes: number) => {
    const d = new Date(Date.UTC(anio, mes - 1, 1));
    return d.toISOString().slice(0, 10);
  };
  const ultimoDia = (anio: number, mes: number) => new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10);
  switch (clave) {
    case "mes-anterior":
      return { desde: primerDia(a, m - 1), hasta: ultimoDia(a, m - 1) };
    case "3-meses":
      return { desde: primerDia(a, m - 2), hasta: iso };
    case "6-meses":
      return { desde: primerDia(a, m - 5), hasta: iso };
    case "anio":
      return { desde: `${a}-01-01`, hasta: iso };
    case "mes":
    default:
      return { desde: primerDia(a, m), hasta: iso };
  }
}

export function leerFiltros(sp: ParamsBusqueda, rangoPorDefecto = "mes"): Filtros {
  let desde = uno(sp.desde);
  let hasta = uno(sp.hasta);
  const rango = uno(sp.rango);
  if (rango || !esFecha(desde) || !esFecha(hasta)) {
    const r = rangoPredefinido(rango ?? rangoPorDefecto);
    if (rango || !esFecha(desde)) desde = r.desde;
    if (rango || !esFecha(hasta)) hasta = r.hasta;
  }
  if (desde! > hasta!) [desde, hasta] = [hasta, desde];
  const odo = Number(uno(sp.odontologo));
  const serv = Number(uno(sp.servicio));
  const cat = uno(sp.categoria);
  const tur = uno(sp.turno);
  return {
    desde: desde!,
    hasta: hasta!,
    odontologoId: Number.isInteger(odo) && odo > 0 ? odo : undefined,
    servicioId: Number.isInteger(serv) && serv > 0 ? serv : undefined,
    categoria: cat && cat in CATEGORIAS ? (cat as CategoriaKey) : undefined,
    turno: tur && tur in TURNOS ? (tur as TurnoKey) : undefined,
  };
}

/** Convierte filtros a query string (para enlaces de descarga, etc.). */
export function filtrosAQuery(f: Filtros): string {
  const p = new URLSearchParams({ desde: f.desde, hasta: f.hasta });
  if (f.odontologoId) p.set("odontologo", String(f.odontologoId));
  if (f.servicioId) p.set("servicio", String(f.servicioId));
  if (f.categoria) p.set("categoria", f.categoria);
  if (f.turno) p.set("turno", f.turno);
  return p.toString();
}
