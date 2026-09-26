"use client";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ESTADO, GRILLA, SERIES, TEXTO_EJE, compactoSoles } from "@/lib/graficos";
import { formatNumero, formatPorcentaje, formatSoles } from "@/lib/formato";
import { CajaTooltip } from "./tooltip";

export interface ItemRanking {
  nombre: string;
  valor: number;
  /** Texto secundario en el tooltip (p. ej. margen %) */
  detalle?: { etiqueta: string; valor: string }[];
}

type Formato = "soles" | "numero" | "porcentaje";
const fmt = (f: Formato, v: number) => (f === "soles" ? formatSoles(v) : f === "porcentaje" ? formatPorcentaje(v) : formatNumero(v, 0));
const fmtEje = (f: Formato, v: number) => (f === "soles" ? compactoSoles(v) : f === "porcentaje" ? `${Math.round(v * 100)}%` : formatNumero(v, 0));

/** Barras horizontales de una sola serie (sin leyenda); los negativos se marcan en rojo (estado crítico). */
export function BarrasRanking({ datos, formato = "numero", color = SERIES[0] }: { datos: ItemRanking[]; formato?: Formato; color?: string }) {
  if (!datos.length) return <p className="py-10 text-center text-sm text-slate-500">Sin datos en el periodo.</p>;
  const alto = Math.max(160, datos.length * 30 + 30);
  return (
    <div style={{ height: alto }} className="w-full">
      <ResponsiveContainer>
        <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 64, left: 0, bottom: 0 }} barCategoryGap={6}>
          <CartesianGrid stroke={GRILLA} horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => fmtEje(formato, v)} tick={{ fill: TEXTO_EJE, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="nombre" width={150} tick={{ fill: "#334155", fontSize: 12 }} axisLine={{ stroke: GRILLA }} tickLine={false} interval={0} />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as ItemRanking;
              return <CajaTooltip titulo={d.nombre} filas={[{ etiqueta: "Valor", valor: fmt(formato, d.valor) }, ...(d.detalle ?? [])]} />;
            }}
          />
          <Bar dataKey="valor" maxBarSize={20} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {datos.map((d) => (
              <Cell key={d.nombre} fill={d.valor < 0 ? ESTADO.critico : color} />
            ))}
            <LabelList dataKey="valor" position="right" formatter={(v: unknown) => (formato === "soles" ? compactoSoles(Number(v)) : fmt(formato, Number(v)))} style={{ fill: "#334155", fontSize: 11 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
