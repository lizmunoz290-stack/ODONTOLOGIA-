import Link from "next/link";
import { formatNumero } from "@/lib/formato";

export function Paginacion({ pagina, total, porPagina, base, params }: { pagina: number; total: number; porPagina: number; base: string; params: Record<string, string | string[] | undefined> }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return null;
  const enlace = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (typeof v === "string" && k !== "pagina") q.set(k, v);
    q.set("pagina", String(p));
    return `${base}?${q.toString()}`;
  };
  return (
    <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginación">
      <span className="text-slate-500">
        Página {pagina} de {formatNumero(paginas, 0)}
      </span>
      <div className="flex gap-2">
        {pagina > 1 && (
          <Link href={enlace(pagina - 1)} className="btn btn-secundario btn-sm">
            ‹ Anterior
          </Link>
        )}
        {pagina < paginas && (
          <Link href={enlace(pagina + 1)} className="btn btn-secundario btn-sm">
            Siguiente ›
          </Link>
        )}
      </div>
    </nav>
  );
}
