"use client";
import { useState, useTransition } from "react";
import clsx from "clsx";
import type { EstadoFormulario } from "@/lib/acciones";

/** Botón que pide confirmación y ejecuta una acción del servidor. */
export function BotonEliminar({
  accion,
  confirmar = "¿Seguro que desea eliminar este registro?",
  texto = "Eliminar",
  className,
}: {
  accion: () => Promise<EstadoFormulario | void>;
  confirmar?: string;
  texto?: string;
  className?: string;
}) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={pendiente}
        className={clsx("btn btn-sm text-red-600 hover:bg-red-50", className)}
        onClick={() => {
          if (!window.confirm(confirmar)) return;
          setError(null);
          iniciar(async () => {
            const r = await accion();
            if (r && r.ok === false) setError(r.mensaje ?? "No se pudo eliminar.");
          });
        }}
      >
        {pendiente ? "…" : texto}
      </button>
      {error && <span className="mt-1 max-w-64 text-right text-xs text-red-600">{error}</span>}
    </span>
  );
}
