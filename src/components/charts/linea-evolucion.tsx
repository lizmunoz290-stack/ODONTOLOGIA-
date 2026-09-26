"use client";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { compactoSoles, GRILLA, SERIES, TEXTO_EJE } from "@/lib/graficos";
import { formatSoles, periodoCorto, nombrePeriodo } from "@/lib/formato";
import { CajaTooltip } from "./tooltip";

interface Punto {
  periodo: string;
  ingresos: number;
  utilidad: number;
  atenciones: number;
}

/** Ingresos y utilidad mensual (misma unidad → un solo eje). */
export function LineaEvolucion({ datos, mostrarUtilidad }: { datos: Punto[]; mostrarUtilidad: boolean }) {
  const series = [
    { clave: "ingresos", nombre: "Ingresos (sin IGV)", color: SERIES[0] },
    ...(mostrarUtilidad ? [{ clave: "utilidad", nombre: "Utilidad neta", color: SERIES[1] }] : []),
  ] as const;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={datos} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke={GRILLA} vertical={false} />
          <XAxis dataKey="periodo" tickFormatter={periodoCorto} tick={{ fill: TEXTO_EJE, fontSize: 12 }} axisLine={{ stroke: GRILLA }} tickLine={false} />
          <YAxis tickFormatter={compactoSoles} tick={{ fill: TEXTO_EJE, fontSize: 12 }} axisLine={false} tickLine={false} width={72} />
          <ReferenceLine y={0} stroke="#94a3b8" />
          <Tooltip
            cursor={{ stroke: "#94a3b8", strokeWidth: 1 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <CajaTooltip
                  titulo={nombrePeriodo(String(label))}
                  filas={[
                    ...series.map((s) => ({
                      color: s.color,
                      etiqueta: s.nombre,
                      valor: formatSoles(Number(payload.find((p) => p.dataKey === s.clave)?.value ?? 0)),
                    })),
                    { etiqueta: "Atenciones", valor: String((payload[0].payload as Punto).atenciones) },
                  ]}
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
              dot={{ r: 4, fill: s.color, stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
