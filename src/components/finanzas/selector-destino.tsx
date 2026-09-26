"use client";
import { useState, useTransition } from "react";
import { cambiarDestinoTipo } from "@/actions/libro";
import { NOMBRE_DESTINO, type DestinoGasto } from "@/lib/libro/normalizar";

export function SelectorDestino({ tipoId, destino }: { tipoId: number; destino: DestinoGasto }) {
  const [valor, setValor] = useState(destino);
  const [pendiente, iniciar] = useTransition();
  const [estado, setEstado] = useState<"" | "ok" | "error">("");
  return (
    <span className="flex items-center gap-2">
      <select
        value={valor}
        disabled={pendiente}
        aria-label="Clasificación"
        className="input py-1 text-sm"
        onChange={(e) => {
          const nuevo = e.target.value as DestinoGasto;
          const anterior = valor;
          setValor(nuevo);
          iniciar(async () => {
            const r = await cambiarDestinoTipo(tipoId, nuevo);
            setEstado(r.ok ? "ok" : "error");
            if (!r.ok) setValor(anterior);
          });
        }}
      >
        {(Object.keys(NOMBRE_DESTINO) as DestinoGasto[]).map((d) => (
          <option key={d} value={d}>
            {NOMBRE_DESTINO[d]}
          </option>
        ))}
      </select>
      <span className="w-4 text-xs" aria-live="polite">
        {pendiente ? "…" : estado === "ok" ? "✓" : estado === "error" ? "✗" : ""}
      </span>
    </span>
  );
}
