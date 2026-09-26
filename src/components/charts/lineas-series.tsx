"use client";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compactoSoles, GRILLA, TEXTO_EJE } from "@/lib/graficos";
import { formatSoles } from "@/lib/formato";
import { CajaTooltip } from "./tooltip";

export interface SerieLinea {
  clave: string;
  nombre: string;
  color: string;
}

/** Líneas de varias series en soles (un solo eje). `etiqueta` es el texto del eje X. */
export function LineasSeries({ datos, series, alto = 280 }: { datos: Record<string, number | string>[]; series: SerieLinea[]; alto?: number }) {
  return (
    <div style={{ height: alto }} className="w-full">
      <ResponsiveContainer>
        <LineChart data={datos} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={GRILLA} vertical={false} />
          <XAxis dataKey="etiqueta" tick={{ fill: TEXTO_EJE, fontSize: 12 }} axisLine={{ stroke: GRILLA }} tickLine={false} interval="preserveStartEnd" />
          <YAxis tickFormatter={compactoSoles} tick={{ fill: TEXTO_EJE, fontSize: 12 }} axisLine={false} tickLine={false} width={76} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Tooltip
            cursor={{ stroke: "#94a3b8", strokeWidth: 1 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <CajaTooltip
                  titulo={String(label)}
                  filas={series
                    .filter((s) => payload.some((p) => p.dataKey === s.clave && p.value !== undefined && p.value !== null))
                    .map((s) => ({ color: s.color, etiqueta: s.nombre, valor: formatSoles(Number(payload.find((p) => p.dataKey === s.clave)?.value ?? 0)) }))}
                />
              ) : null
            }
          />
          {series.length > 1 && <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: TEXTO_EJE }} />}
          {series.map((s) => (
            <Line
              key={s.clave}
              type="monotone"
              dataKey={s.clave}
              name={s.nombre}
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              connectNulls={false}
              dot={{ r: 3.5, fill: s.color, stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
