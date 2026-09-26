"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { nombrePeriodo } from "@/lib/formato";

/** Selector de mes (AAAA-MM) con flechas anterior/siguiente; actualiza ?periodo= en la URL. */
export function SelectorPeriodo({ periodo, opciones }: { periodo: string; opciones: string[] }) {
  const router = useRouter();
  const ruta = usePathname();
  const sp = useSearchParams();
  const ir = (p: string) => {
    const q = new URLSearchParams(sp.toString());
    q.set("periodo", p);
    router.push(`${ruta}?${q.toString()}`);
  };
  const i = opciones.indexOf(periodo);
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="btn btn-secundario px-2.5" disabled={i >= opciones.length - 1} onClick={() => ir(opciones[i + 1])} aria-label="Mes anterior">
        ‹
      </button>
      <select value={periodo} onChange={(e) => ir(e.target.value)} className="input w-44" aria-label="Periodo">
        {opciones.map((p) => (
          <option key={p} value={p}>
            {nombrePeriodo(p)}
          </option>
        ))}
      </select>
      <button type="button" className="btn btn-secundario px-2.5" disabled={i <= 0} onClick={() => ir(opciones[i - 1])} aria-label="Mes siguiente">
        ›
      </button>
    </div>
  );
}
