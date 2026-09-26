"use client";
import { useState, useTransition } from "react";
import { cambiarTipoGasto } from "@/actions/libro";

/** Cambia el tipo de gasto de un movimiento al elegirlo en la lista. */
export function SelectorTipo({ gastoId, tipoId, tipos }: { gastoId: number; tipoId: number; tipos: { id: number; nombre: string }[] }) {
  const [valor, setValor] = useState(tipoId);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState(false);
  return (
    <select
      value={valor}
      disabled={pendiente}
      aria-label="Tipo de gasto"
      className={`input py-1 text-xs ${error ? "border-red-400" : ""}`}
      onChange={(e) => {
        const nuevo = Number(e.target.value);
        const anterior = valor;
        setValor(nuevo);
        iniciar(async () => {
          const r = await cambiarTipoGasto(gastoId, nuevo);
          setError(!r.ok);
          if (!r.ok) setValor(anterior);
        });
      }}
    >
      {tipos.map((t) => (
        <option key={t.id} value={t.id}>
          {t.nombre}
        </option>
      ))}
    </select>
  );
}
