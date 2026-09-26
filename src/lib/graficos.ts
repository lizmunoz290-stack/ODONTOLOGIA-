/**
 * Paleta de gráficos (categórica validada para daltonismo, orden fijo) y colores de estado.
 * El color sigue a la entidad (p. ej. la categoría), nunca a su posición en un ranking.
 */
import { CATEGORIAS, type CategoriaKey } from "./constantes";

export const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"] as const;

export const COLOR_CATEGORIA: Record<CategoriaKey, string> = Object.fromEntries(
  (Object.keys(CATEGORIAS) as CategoriaKey[]).map((c, i) => [c, SERIES[i]]),
) as Record<CategoriaKey, string>;

export const ESTADO = { bueno: "#0ca30c", aviso: "#fab219", critico: "#d03b3b" } as const;

export const GRILLA = "#e5e7eb";
export const TEXTO_EJE = "#64748b";

/** 12500 → "12.5 mil"; 1250000 → "1.3 M" (para ejes) */
export function compactoSoles(v: number): string {
  const a = Math.abs(v);
  const e = "\u00a0";
  if (a >= 1_000_000) return `S/${e}${(v / 1_000_000).toFixed(1)}${e}M`;
  if (a >= 1_000) return `S/${e}${(v / 1_000).toFixed(a >= 10_000 ? 0 : 1)}${e}mil`;
  return `S/${e}${Math.round(v)}`;
}
