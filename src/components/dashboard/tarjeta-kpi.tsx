import clsx from "clsx";

const TONOS = {
  bueno: { icono: "▲", clase: "text-emerald-700" },
  aviso: { icono: "⚠", clase: "text-amber-700" },
  critico: { icono: "⛔", clase: "text-red-700" },
} as const;

/** Tarjeta de indicador: etiqueta · valor · detalle. El estado se indica con ícono + texto, no solo color. */
export function TarjetaKpi({
  etiqueta,
  valor,
  detalle,
  tono,
  destacado,
  texto,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  tono?: keyof typeof TONOS;
  destacado?: boolean;
  /** El valor es un nombre (texto largo) en lugar de un número */
  texto?: boolean;
}) {
  return (
    <div className={clsx("tarjeta p-4", destacado && "border-marca-200 bg-marca-50/50")}>
      <p className="text-xs font-medium text-slate-500">{etiqueta}</p>
      <p className={clsx("mt-1 font-bold text-slate-900", texto ? "text-base leading-tight" : "whitespace-nowrap text-xl tabular-nums")}>{valor}</p>
      {detalle && (
        <p className={clsx("mt-1 text-xs", tono ? TONOS[tono].clase : "text-slate-500")}>
          {tono && <span aria-hidden>{TONOS[tono].icono} </span>}
          {detalle}
        </p>
      )}
    </div>
  );
}
