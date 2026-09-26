import clsx from "clsx";

const estilos = {
  info: "border-sky-200 bg-sky-50 text-sky-800",
  exito: "border-emerald-200 bg-emerald-50 text-emerald-800",
  aviso: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-800",
} as const;

export function Alerta({
  tipo = "info",
  titulo,
  children,
  className,
}: {
  tipo?: keyof typeof estilos;
  titulo?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("rounded-lg border px-4 py-3 text-sm", estilos[tipo], className)} role={tipo === "error" ? "alert" : "status"}>
      {titulo && <p className="font-semibold">{titulo}</p>}
      {children && <div className={clsx(titulo && "mt-1")}>{children}</div>}
    </div>
  );
}
