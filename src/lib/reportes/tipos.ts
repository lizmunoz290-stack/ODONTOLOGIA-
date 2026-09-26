/**
 * Estructura común de un reporte: se usa tanto para mostrarlo en pantalla como para generar el Excel,
 * de modo que ambos muestran exactamente las mismas cifras.
 */

export type TipoDato = "texto" | "entero" | "decimal" | "soles" | "porcentaje" | "fecha";

export type Valor = string | number | Date | null;

export type Total<C extends string = string> =
  /** SUMA de la columna */
  | { tipo: "suma" }
  /** Fórmula a partir de otras celdas de la fila de totales. `ref(clave)` devuelve la dirección (p. ej. "E25"). */
  | { tipo: "formula"; excel: (ref: (clave: C) => string) => string; valor: (t: Record<C, number>) => number }
  | { tipo: "texto"; texto: string };

export interface Columna<F = Record<string, Valor>, C extends string = string> {
  clave: C;
  titulo: string;
  tipo: TipoDato;
  valor: (fila: F) => Valor;
  total?: Total<C>;
}

export interface Tabla<F = unknown> {
  columnas: Columna<F>[];
  filas: F[];
  /** Mostrar fila de totales */
  totales?: boolean;
}

export interface Hoja {
  /** Nombre de la hoja de Excel (máx. 31 caracteres) */
  nombre: string;
  titulo: string;
  /** Notas explicativas (fórmulas, supuestos) que se muestran antes de la tabla */
  notas?: string[];
  // La fila puede ser de cualquier forma; las columnas saben leerla.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tabla: Tabla<any>;
}

export interface Reporte {
  tipo: string;
  /** Usado en el nombre del archivo */
  nombreArchivo: string;
  titulo: string;
  descripcion: string;
  hojas: Hoja[];
}

/** Ayuda para declarar columnas con tipado de la fila */
export function columnas<F, C extends string = string>(cols: Columna<F, C>[]): Columna<F>[] {
  return cols as unknown as Columna<F>[];
}

/** Calcula en JS los valores de la fila de totales (para mostrar en pantalla). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function calcularTotales(tabla: Tabla<any>): Record<string, Valor> {
  const numeros: Record<string, number> = {};
  const out: Record<string, Valor> = {};
  for (const c of tabla.columnas) {
    if (c.total?.tipo === "suma") {
      const s = tabla.filas.reduce<number>((acc, f) => acc + (Number(c.valor(f as never)) || 0), 0);
      numeros[c.clave] = s;
      out[c.clave] = s;
    }
  }
  for (const c of tabla.columnas) {
    if (c.total?.tipo === "formula") {
      const v = c.total.valor(numeros);
      numeros[c.clave] = v;
      out[c.clave] = Number.isFinite(v) ? v : 0;
    } else if (c.total?.tipo === "texto") out[c.clave] = c.total.texto;
  }
  return out;
}

/** División segura para totales: a ÷ b (0 si b = 0) */
export const dividir = (a: number, b: number) => (b ? a / b : 0);

/** Fórmula de Excel para una división segura */
export const formulaDividir = (a: string, b: string) => `IF(${b}=0,0,${a}/${b})`;
