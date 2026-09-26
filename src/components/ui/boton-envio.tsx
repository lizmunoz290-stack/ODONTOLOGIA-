"use client";
import { useFormStatus } from "react-dom";
import clsx from "clsx";
import { useEstadoFormulario } from "./formulario-accion";

export function BotonEnvio({
  children,
  pendiente = "Guardando…",
  className,
}: {
  children: React.ReactNode;
  pendiente?: string;
  className?: string;
}) {
  const { pending: pendienteNativo } = useFormStatus();
  const { pendiente: pendienteAccion } = useEstadoFormulario();
  const pending = pendienteNativo || !!pendienteAccion;
  return (
    <button type="submit" disabled={pending} className={clsx("btn btn-primario", className)}>
      {pending ? pendiente : children}
    </button>
  );
}
