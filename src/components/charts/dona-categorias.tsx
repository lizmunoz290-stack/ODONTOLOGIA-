"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { COLOR_CATEGORIA } from "@/lib/graficos";
import { formatPorcentaje, formatSoles } from "@/lib/formato";
import type { CategoriaKey } from "@/lib/constantes";
import { CajaTooltip } from "./tooltip";

interface Porcion {
  categoria: CategoriaKey;
  nombre: string;
  ingresos: number;
  cantidad: number;
  participacion: number;
}

/** Distribución de ingresos por categoría: dona + leyenda-tabla con valores (identidad nunca solo por color). */
export function DonaCategorias({ datos }: { datos: Porcion[] }) {
  if (!datos.length) return <p className="py-10 text-center text-sm text-slate-500">Sin datos en el periodo.</p>;
  return (
    <div className="grid items-center gap-4 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
      <div className="h-56">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={datos} dataKey="ingresos" nameKey="nombre" innerRadius="58%" outerRadius="92%" paddingAngle={1} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
              {datos.map((d) => (
                <Cell key={d.categoria} fill={COLOR_CATEGORIA[d.categoria]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as Porcion;
                return (
                  <CajaTooltip
                    titulo={d.nombre}
                    filas={[
                      { color: COLOR_CATEGORIA[d.categoria], etiqueta: "Ingresos", valor: formatSoles(d.ingresos) },
                      { etiqueta: "Participación", valor: formatPorcentaje(d.participacion) },
                      { etiqueta: "Atenciones", valor: String(d.cantidad) },
                    ]}
                  />
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1.5 text-sm">
        {datos.map((d) => (
          <li key={d.categoria} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: COLOR_CATEGORIA[d.categoria] }} aria-hidden />
            <span className="text-slate-700">{d.nombre}</span>
            <span className="ml-auto whitespace-nowrap tabular-nums text-slate-500">{formatSoles(d.ingresos)}</span>
            <span className="w-14 text-right font-semibold tabular-nums text-slate-900">{formatPorcentaje(d.participacion)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
