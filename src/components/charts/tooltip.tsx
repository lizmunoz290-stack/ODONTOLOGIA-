"use client";

/** Tooltip común: fondo blanco, texto en tinta (nunca del color de la serie), muestra de color al lado. */
export function CajaTooltip({
  titulo,
  filas,
}: {
  titulo?: string;
  filas: { color?: string; etiqueta: string; valor: string }[];
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      {titulo && <p className="mb-1 font-semibold text-slate-900">{titulo}</p>}
      {filas.map((f) => (
        <p key={f.etiqueta} className="flex items-center gap-2 text-slate-600">
          {f.color && <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: f.color }} />}
          <span>{f.etiqueta}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums text-slate-900">{f.valor}</span>
        </p>
      ))}
    </div>
  );
}
