"use client";
import { useFormStatus } from "react-dom";
import clsx from "clsx";

export function BotonEnvio({
  children,
  pendiente = "Guardando…",
  className,
}: {
  children: React.ReactNode;
  pendiente?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={clsx("btn btn-primario", className)}>
      {pending ? pendiente : children}
    </button>
  );
}
