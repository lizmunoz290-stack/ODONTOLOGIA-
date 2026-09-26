import clsx from "clsx";
import { calcularTotales, type Hoja, type TipoDato, type Valor } from "@/lib/reportes/tipos";
import { formatFecha, formatNumero, formatPorcentaje, formatSoles } from "@/lib/formato";

function formatear(v: Valor, tipo: TipoDato): string {
  if (v === null || v === undefined || v === "") return "";
  if (v instanceof Date) return formatFecha(v);
  if (typeof v === "number") {
    switch (tipo) {
      case "soles":
        return formatSoles(v);
      case "porcentaje":
        return formatPorcentaje(v);
      case "entero":
        return formatNumero(v, 0);
      case "decimal":
        return formatNumero(v, 4);
      default:
        return String(v);
    }
  }
  return String(v);
}

const alinear = (t: TipoDato) => (t === "texto" || t === "fecha" ? "" : "num");

/** Muestra una hoja de reporte en pantalla (mismas columnas y totales que el Excel). */
export function TablaReporte({ hoja, limite = 300 }: { hoja: Hoja; limite?: number }) {
  const { columnas, filas, totales } = hoja.tabla;
  const visibles = filas.slice(0, limite);
  const t = totales ? calcularTotales(hoja.tabla) : null;
  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold text-slate-900">{hoja.titulo}</h2>
      {hoja.notas?.map((n, i) => (
        <p key={i} className="text-xs text-slate-500">
          {n}
        </p>
      ))}
      <div className="tarjeta mt-2 overflow-hidden">
        <div className="max-h-[70vh] overflow-auto">
          <table className="tabla">
            <thead className="sticky top-0 z-10">
              <tr>
                {columnas.map((c) => (
                  <th key={c.clave} className={alinear(c.tipo)}>
                    {c.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={columnas.length} className="py-8 text-center text-slate-500">
                    No hay datos para el periodo y filtros seleccionados.
                  </td>
                </tr>
              )}
              {visibles.map((f, i) => (
                <tr key={i}>
                  {columnas.map((c) => {
                    const v = c.valor(f);
                    return (
                      <td key={c.clave} className={clsx(alinear(c.tipo), typeof v === "number" && v < 0 && (c.tipo === "soles" || c.tipo === "porcentaje") && "text-red-700")}>
                        {formatear(v, c.tipo)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            {t && filas.length > 0 && (
              <tfoot className="sticky bottom-0">
                <tr>
                  {columnas.map((c, i) => (
                    <td key={c.clave} className={alinear(c.tipo)}>
                      {t[c.clave] !== undefined ? formatear(t[c.clave], c.tipo) : i === 0 ? "TOTAL" : ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
      {filas.length > limite && (
        <p className="mt-1 text-xs text-slate-500">
          Se muestran {formatNumero(limite, 0)} de {formatNumero(filas.length, 0)} filas (los totales incluyen todas). Descargue el Excel para ver el detalle completo.
        </p>
      )}
    </section>
  );
}
