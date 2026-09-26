"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import clsx from "clsx";
import { CATEGORIAS, TURNOS } from "@/lib/constantes";

const RANGOS = [
  { clave: "mes", texto: "Este mes" },
  { clave: "mes-anterior", texto: "Mes anterior" },
  { clave: "3-meses", texto: "Últimos 3 meses" },
  { clave: "6-meses", texto: "Últimos 6 meses" },
  { clave: "anio", texto: "Este año" },
];

/** Filtros en una fila: rango de fechas, odontólogo, categoría y turno. Actualiza la URL. */
export function FiltrosPanel({
  desde,
  hasta,
  odontologos,
  valores,
  mostrarOdontologo = true,
}: {
  desde: string;
  hasta: string;
  odontologos: { id: number; nombre: string }[];
  valores: { odontologo?: number; categoria?: string; turno?: string };
  mostrarOdontologo?: boolean;
}) {
  const router = useRouter();
  const ruta = usePathname();
  const sp = useSearchParams();
  const [pendiente, iniciar] = useTransition();

  const aplicar = (cambios: Record<string, string | undefined>) => {
    const q = new URLSearchParams(sp.toString());
    q.delete("rango");
    q.set("desde", desde);
    q.set("hasta", hasta);
    for (const [k, v] of Object.entries(cambios)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    iniciar(() => router.push(`${ruta}?${q.toString()}`));
  };
  const rangoActivo = sp.get("rango");

  return (
    <div className={clsx("tarjeta mb-5 space-y-3 p-3 sm:p-4", pendiente && "opacity-60")}>
      <div className="flex flex-wrap gap-1.5">
        {RANGOS.map((r) => (
          <button
            key={r.clave}
            type="button"
            onClick={() => {
              const q = new URLSearchParams(sp.toString());
              q.delete("desde");
              q.delete("hasta");
              q.set("rango", r.clave);
              iniciar(() => router.push(`${ruta}?${q.toString()}`));
            }}
            className={clsx("btn btn-sm", rangoActivo === r.clave ? "btn-primario" : "btn-secundario")}
          >
            {r.texto}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs text-slate-500">
          Desde
          <input type="date" value={desde} max={hasta} onChange={(e) => e.target.value && aplicar({ desde: e.target.value, hasta })} className="input mt-0.5" />
        </label>
        <label className="text-xs text-slate-500">
          Hasta
          <input type="date" value={hasta} min={desde} onChange={(e) => e.target.value && aplicar({ desde, hasta: e.target.value })} className="input mt-0.5" />
        </label>
        {mostrarOdontologo && (
          <label className="text-xs text-slate-500">
            Odontólogo
            <select value={valores.odontologo ?? ""} onChange={(e) => aplicar({ odontologo: e.target.value })} className="input mt-0.5">
              <option value="">Todos</option>
              {odontologos.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-xs text-slate-500">
          Categoría
          <select value={valores.categoria ?? ""} onChange={(e) => aplicar({ categoria: e.target.value })} className="input mt-0.5">
            <option value="">Todas</option>
            {Object.entries(CATEGORIAS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500">
          Turno
          <select value={valores.turno ?? ""} onChange={(e) => aplicar({ turno: e.target.value })} className="input mt-0.5">
            <option value="">Ambos</option>
            {Object.entries(TURNOS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
