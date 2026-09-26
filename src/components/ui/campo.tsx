"use client";
import { useEstadoFormulario } from "./formulario-accion";

/**
 * Etiqueta + control + mensaje de error. Si se indica `nombre`, toma el error de ese campo
 * del <FormularioAccion> que lo contiene.
 */
export function Campo({
  etiqueta,
  htmlFor,
  nombre,
  error,
  ayuda,
  className,
  children,
}: {
  etiqueta: string;
  htmlFor?: string;
  nombre?: string;
  error?: string[] | string;
  ayuda?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const estado = useEstadoFormulario();
  const err = error ?? (nombre ? estado.errores?.[nombre] : undefined);
  const msg = Array.isArray(err) ? err[0] : err;
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="etiqueta">
        {etiqueta}
      </label>
      {children}
      {msg ? (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {msg}
        </p>
      ) : ayuda ? (
        <p className="mt-1 text-xs text-slate-500">{ayuda}</p>
      ) : null}
    </div>
  );
}
