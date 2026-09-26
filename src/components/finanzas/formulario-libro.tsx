"use client";
import { startTransition, useActionState } from "react";
import { importarLibro, type ResultadoImportLibro } from "@/actions/libro";
import { NOMBRE_DESTINO } from "@/lib/libro/normalizar";
import { formatFecha, formatNumero, formatSoles, parseFechaISO } from "@/lib/formato";
import { Alerta } from "@/components/ui/alerta";

const TIPO_HOJA = { ingresos: "Ingresos", gastos: "Gastos", inicios: "Inicios", metas: "Metas", permisos: "Permisos", ignorada: "No se usa" } as const;

export function FormularioLibro() {
  const [r, ejecutar, pendiente] = useActionState<ResultadoImportLibro, FormData>(importarLibro, {});
  const importado = r.modo === "importar" && r.ok;
  return (
    <div className="space-y-5">
      <form
        className="tarjeta space-y-4 p-4 sm:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const datos = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
          startTransition(() => ejecutar(datos));
        }}
      >
        <div>
          <label htmlFor="archivo" className="etiqueta">
            Libro contable en Excel (.xlsx, máx. 15 MB)
          </label>
          <input
            id="archivo"
            name="archivo"
            type="file"
            accept=".xlsx"
            required
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-marca-50 file:px-3 file:py-2 file:font-medium file:text-marca-800 hover:file:bg-marca-100"
          />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="reemplazar" className="mt-0.5 h-4 w-4 accent-marca-600" />
          <span>
            <b>Reemplazar todo</b>: borra los ingresos, gastos e inicios cargados antes y vuelve a cargarlos desde este archivo. Úselo si corrigió filas antiguas en el
            Excel. Si no lo marca, solo se agregan las filas nuevas.
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" name="modo" value="validar" disabled={pendiente} className="btn btn-secundario">
            {pendiente ? "Leyendo el archivo…" : "1. Revisar archivo"}
          </button>
          <button type="submit" name="modo" value="importar" disabled={pendiente || !r.hojas || importado} className="btn btn-primario">
            2. Importar
          </button>
        </div>
      </form>

      {r.mensaje && (
        <Alerta tipo={r.ok ? (importado ? "exito" : "info") : "error"} titulo={importado ? "Listo" : undefined}>
          {r.mensaje}
        </Alerta>
      )}

      {r.hojas && (
        <div className="tarjeta overflow-hidden">
          <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">
            Hojas encontradas
            {r.periodo && (
              <span className="ml-2 text-sm font-normal text-slate-500">
                · del {formatFecha(parseFechaISO(r.periodo.desde))} al {formatFecha(parseFechaISO(r.periodo.hasta))}
              </span>
            )}
          </h2>
          <div className="overflow-x-auto">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Hoja</th>
                  <th>Uso</th>
                  <th className="num">Filas válidas</th>
                  <th className="num">Total</th>
                  <th className="num">Anuladas</th>
                  <th className="num">Sin monto</th>
                  <th className="num">Fechas corregidas</th>
                </tr>
              </thead>
              <tbody>
                {r.hojas.map((h) => (
                  <tr key={h.hoja} className={h.tipo === "ignorada" ? "text-slate-400" : ""}>
                    <td className="font-medium">{h.hoja}</td>
                    <td>{TIPO_HOJA[h.tipo]}</td>
                    <td className="num">{h.tipo === "ignorada" ? "—" : formatNumero(h.filas, 0)}</td>
                    <td className="num">{h.total ? formatSoles(h.total) : "—"}</td>
                    <td className="num">{h.anulados ?? "—"}</td>
                    <td className="num">{h.sinMonto ?? "—"}</td>
                    <td className="num">{h.correcciones ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {r.nuevos && (
            <p className="border-t border-slate-200 px-4 py-3 text-sm text-slate-700">
              {importado ? "Se guardaron" : "Se guardarán"}: <b>{formatNumero(r.nuevos.ingresos, 0)}</b> ingresos, <b>{formatNumero(r.nuevos.gastos, 0)}</b> gastos,{" "}
              <b>{r.nuevos.inicios}</b> inicios, <b>{r.nuevos.metas}</b> metas y <b>{r.nuevos.permisos}</b> permisos.
              {r.existentes && r.existentes.ingresos + r.existentes.gastos + r.existentes.inicios > 0 && (
                <> Ya estaban cargadas: {formatNumero(r.existentes.ingresos + r.existentes.gastos + r.existentes.inicios, 0)} filas (no se duplican).</>
              )}
            </p>
          )}
        </div>
      )}

      {r.tiposNuevos && r.tiposNuevos.length > 0 && (
        <div className="tarjeta overflow-hidden">
          <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">Tipos de gasto nuevos y cómo se clasificarán</h2>
          <div className="max-h-96 overflow-auto">
            <table className="tabla">
              <thead className="sticky top-0">
                <tr>
                  <th>Tipo de gasto</th>
                  <th>Clasificación propuesta</th>
                  <th className="num">Total en el archivo</th>
                </tr>
              </thead>
              <tbody>
                {r.tiposNuevos.map((t) => (
                  <tr key={t.nombre}>
                    <td className="font-medium">{t.nombre}</td>
                    <td>{NOMBRE_DESTINO[t.destino]}</td>
                    <td className="num">{formatSoles(t.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">Después de importar puede cambiar cualquier clasificación en «Clasificación de gastos».</p>
        </div>
      )}

      {r.correcciones && r.correcciones.length > 0 && (
        <details className="tarjeta p-4">
          <summary className="cursor-pointer font-semibold">Correcciones automáticas de fechas ({r.correcciones.length} ejemplos)</summary>
          <ul className="mt-3 max-h-80 space-y-1 overflow-auto text-sm">
            {r.correcciones.map((c, i) => (
              <li key={i}>
                <span className="font-mono text-xs text-slate-500">
                  {c.hoja} · fila {c.fila}
                </span>{" "}
                — {c.detalle}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
