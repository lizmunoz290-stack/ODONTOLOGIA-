"use client";
import { startTransition, useActionState } from "react";
import clsx from "clsx";
import { importarAtenciones, type ResultadoImportacion } from "@/actions/importacion";
import { formatFecha, formatSoles, parseFechaISO } from "@/lib/formato";
import { Alerta } from "@/components/ui/alerta";

export function FormularioImportacion() {
  const [r, ejecutar, pendiente] = useActionState<ResultadoImportacion, FormData>(importarAtenciones, {});
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
            Archivo Excel (.xlsx, máx. 5 MB)
          </label>
          <input
            id="archivo"
            name="archivo"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-marca-50 file:px-3 file:py-2 file:font-medium file:text-marca-800 hover:file:bg-marca-100"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" name="modo" value="validar" disabled={pendiente} className="btn btn-secundario">
            {pendiente ? "Procesando…" : "1. Validar archivo"}
          </button>
          <button
            type="submit"
            name="modo"
            value="importar"
            disabled={pendiente || !r.validas || importado}
            className="btn btn-primario"
            title={!r.validas ? "Primero valide el archivo" : undefined}
          >
            2. Importar {r.validas ? `${r.validas} filas válidas` : ""}
          </button>
        </div>
      </form>

      {r.mensaje && (
        <Alerta tipo={r.ok ? "exito" : r.validas ? "aviso" : "error"} titulo={importado ? "Importación completada" : undefined}>
          {r.mensaje}
        </Alerta>
      )}

      {r.errores && r.errores.length > 0 && (
        <div className="tarjeta overflow-hidden">
          <h2 className="border-b border-slate-200 px-4 py-3 font-semibold text-red-700">Filas con errores ({r.errores.length})</h2>
          <div className="max-h-96 overflow-y-auto">
            <table className="tabla">
              <thead>
                <tr>
                  <th className="w-20">Fila</th>
                  <th>Errores</th>
                </tr>
              </thead>
              <tbody>
                {r.errores.map((e) => (
                  <tr key={e.fila}>
                    <td className="font-mono">{e.fila}</td>
                    <td>
                      <ul className="list-disc pl-4 text-red-700">
                        {e.mensajes.map((m, i) => (
                          <li key={i}>{m}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {r.vistaPrevia && r.vistaPrevia.length > 0 && !importado && (
        <div className="tarjeta overflow-hidden">
          <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">Vista previa (primeras filas válidas)</h2>
          <div className="overflow-x-auto">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Fila</th>
                  <th>Fecha</th>
                  <th>Paciente</th>
                  <th>Servicio</th>
                  <th className="num">Cobrado</th>
                </tr>
              </thead>
              <tbody>
                {r.vistaPrevia.map((v) => (
                  <tr key={v.fila} className={clsx()}>
                    <td className="font-mono">{v.fila}</td>
                    <td>{formatFecha(parseFechaISO(v.fecha))}</td>
                    <td>{v.paciente}</td>
                    <td>{v.servicio}</td>
                    <td className="num">{formatSoles(v.cobrado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
