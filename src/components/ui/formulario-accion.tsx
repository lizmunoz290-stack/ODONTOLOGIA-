"use client";
import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import clsx from "clsx";
import type { EstadoFormulario } from "@/lib/acciones";

type Accion = (prev: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;

const ContextoFormulario = createContext<EstadoFormulario & { pendiente?: boolean }>({});

/** Estado del formulario más cercano (errores por campo y si está enviando). */
export function useEstadoFormulario() {
  return useContext(ContextoFormulario);
}

/**
 * Formulario conectado a una acción del servidor. Muestra el mensaje de resultado y
 * pasa el estado (con errores por campo) a los hijos.
 */
export function FormularioAccion({
  accion,
  children,
  className,
  reiniciarAlGuardar = false,
  mensajeEnLinea = false,
}: {
  accion: Accion;
  /** Una función solo puede usarse desde componentes cliente; desde el servidor use <Campo nombre="…"> */
  children: React.ReactNode | ((estado: EstadoFormulario) => React.ReactNode);
  className?: string;
  /** Limpia los campos después de guardar con éxito (formularios de "agregar") */
  reiniciarAlGuardar?: boolean;
  /** Mensaje compacto (para filas de tablas) */
  mensajeEnLinea?: boolean;
}) {
  const [estado, ejecutar, pendiente] = useActionState(accion, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado.ok && reiniciarAlGuardar) ref.current?.reset();
  }, [estado, reiniciarAlGuardar]);

  const errores = estado.errores ? Object.values(estado.errores).flat().filter(Boolean) : [];
  const mensaje = estado.mensaje;

  return (
    <form
      ref={ref}
      className={className}
      noValidate
      // Se usa onSubmit (y no action) para que React no limpie los campos cuando hay errores de validación
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => ejecutar(datos));
      }}
    >
      <ContextoFormulario.Provider value={{ ...estado, pendiente }}>
        {typeof children === "function" ? children(estado) : children}
      </ContextoFormulario.Provider>
      {mensajeEnLinea
        ? (mensaje || errores.length > 0) && (
            <p className={clsx("col-span-full text-xs", estado.ok ? "text-emerald-700" : "text-red-600")} role="status">
              {estado.ok ? mensaje : errores[0] ?? mensaje}
            </p>
          )
        : mensaje && (
            <p
              className={clsx(
                "col-span-full rounded-lg px-3 py-2 text-sm",
                estado.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700",
              )}
              role="status"
            >
              {mensaje}
            </p>
          )}
    </form>
  );
}
