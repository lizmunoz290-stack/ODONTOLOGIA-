"use client";
import { useState, useTransition } from "react";
import clsx from "clsx";
import type { EstadoFormulario } from "@/lib/acciones";

/** Botón que ejecuta una acción del servidor sin formulario y muestra su mensaje. */
export function BotonAccion({
  accion,
  children,
  className,
}: {
  accion: () => Promise<EstadoFormulario>;
  children: React.ReactNode;
  className?: string;
}) {
  const [pendiente, iniciar] = useTransition();
  const [estado, setEstado] = useState<EstadoFormulario | null>(null);
  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" disabled={pendiente} className={clsx("btn", className ?? "btn-secundario")} onClick={() => iniciar(async () => setEstado(await accion()))}>
        {pendiente ? "Procesando…" : children}
      </button>
      {estado?.mensaje && <span className={clsx("text-xs", estado.ok ? "text-emerald-700" : "text-red-600")}>{estado.mensaje}</span>}
    </span>
  );
}
