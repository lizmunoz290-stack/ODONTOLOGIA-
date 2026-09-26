"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import clsx from "clsx";
import { nombrePeriodo } from "@/lib/formato";

const RANGOS = [
  { clave: "anio", texto: "Este año" },
  { clave: "anio-anterior", texto: "Año anterior" },
  { clave: "12-meses", texto: "Últimos 12 meses" },
  { clave: "todo", texto: "Todo" },
];

/** Filtro por meses (AAAA-MM) con atajos. */
export function FiltroRango({ desde, hasta, disponibles, rango }: { desde: string; hasta: string; disponibles: string[]; rango?: string }) {
  const router = useRouter();
  const ruta = usePathname();
  const sp = useSearchParams();
  const [pendiente, iniciar] = useTransition();
  const ir = (q: URLSearchParams) => iniciar(() => router.push(`${ruta}?${q.toString()}`));
  const cambiar = (k: "desde" | "hasta", v: string) => {
    const q = new URLSearchParams(sp.toString());
    q.delete("rango");
    q.set("desde", k === "desde" ? v : desde);
    q.set("hasta", k === "hasta" ? v : hasta);
    q.delete("pagina");
    ir(q);
  };
  const opciones = [...disponibles].reverse();
  return (
    <div className={clsx("tarjeta mb-5 flex flex-wrap items-end gap-3 p-3 sm:p-4", pendiente && "opacity-60")}>
      <div className="flex flex-wrap gap-1.5">
        {RANGOS.map((r) => (
          <button
            key={r.clave}
            type="button"
            className={clsx("btn btn-sm", rango === r.clave ? "btn-primario" : "btn-secundario")}
            onClick={() => {
              const q = new URLSearchParams(sp.toString());
              q.delete("desde");
              q.delete("hasta");
              q.delete("pagina");
              q.set("rango", r.clave);
              ir(q);
            }}
          >
            {r.texto}
          </button>
        ))}
      </div>
      <label className="text-xs text-slate-500">
        Desde
        <select value={desde} onChange={(e) => cambiar("desde", e.target.value)} className="input mt-0.5">
          {opciones.map((p) => (
            <option key={p} value={p}>
              {nombrePeriodo(p)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs text-slate-500">
        Hasta
        <select value={hasta} onChange={(e) => cambiar("hasta", e.target.value)} className="input mt-0.5">
          {opciones.map((p) => (
            <option key={p} value={p}>
              {nombrePeriodo(p)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
