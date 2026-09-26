/** Lectura del archivo Excel subido: convierte cada fila en un objeto { clave: valor }. */
import ExcelJS from "exceljs";
import { COLUMNAS } from "./columnas";
import { normalizar, type ValorCelda } from "./validar";

export const MAX_FILAS = 5000;

export interface FilaLeida {
  numero: number;
  valores: Record<string, ValorCelda>;
}

function valorDe(celda: ExcelJS.Cell): ValorCelda {
  const v = celda.value;
  if (v === null || v === undefined) return null;
  if (v instanceof Date || typeof v !== "object") return v as ValorCelda;
  if ("result" in v) return (v.result as ValorCelda) ?? null; // fórmula
  if ("richText" in v) return v.richText.map((t) => t.text).join("");
  if ("text" in v) return String(v.text); // hipervínculo
  return String(celda.text);
}

export async function leerExcel(buffer: ArrayBuffer): Promise<{ filas: FilaLeida[]; error?: string }> {
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(buffer);
  } catch {
    return { filas: [], error: "No se pudo leer el archivo. Asegúrese de que sea un Excel (.xlsx) válido." };
  }
  const hoja = libro.getWorksheet("Atenciones") ?? libro.worksheets[0];
  if (!hoja) return { filas: [], error: "El archivo no tiene hojas." };

  // Mapea encabezados (sin importar orden, tildes ni el asterisco de obligatorio)
  const porEncabezado = new Map(COLUMNAS.map((c) => [normalizar(c.encabezado), c.clave]));
  const mapa = new Map<number, string>();
  hoja.getRow(1).eachCell((celda, col) => {
    const clave = porEncabezado.get(normalizar(String(celda.text ?? "")));
    if (clave) mapa.set(col, clave);
  });
  const faltantes = COLUMNAS.filter((c) => c.obligatorio && ![...mapa.values()].includes(c.clave));
  if (faltantes.length) {
    return { filas: [], error: `Faltan columnas en la fila 1: ${faltantes.map((c) => c.encabezado).join(", ")}. Use la plantilla descargable.` };
  }

  const filas: FilaLeida[] = [];
  hoja.eachRow({ includeEmpty: false }, (fila, numero) => {
    if (numero === 1) return;
    const valores: Record<string, ValorCelda> = {};
    let vacia = true;
    for (const [col, clave] of mapa) {
      const v = valorDe(fila.getCell(col));
      valores[clave] = v;
      if (v !== null && v !== "") vacia = false;
    }
    if (!vacia) filas.push({ numero, valores });
  });
  if (filas.length > MAX_FILAS) return { filas: [], error: `El archivo tiene ${filas.length} filas; el máximo por importación es ${MAX_FILAS}.` };
  if (!filas.length) return { filas: [], error: "El archivo no tiene filas con datos." };
  return { filas };
}
