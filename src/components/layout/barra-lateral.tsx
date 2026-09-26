"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { MENU } from "./menu";
import { puede } from "@/lib/auth/permisos";
import { ROLES, type RolKey } from "@/lib/constantes";
import { cerrarSesion } from "@/actions/auth";

export function BarraLateral({
  nombreClinica,
  usuario,
}: {
  nombreClinica: string;
  usuario: { nombre: string; rol: RolKey };
}) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  useEffect(() => setAbierto(false), [ruta]);

  // El elemento activo es el de ruta más larga que coincide (así /finanzas no se marca en /finanzas/gastos)
  const activoHref = MENU.flatMap((g) => g.items.map((i) => i.href))
    .filter((h) => ruta === h || ruta.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0];

  const navegacion = (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {MENU.map((g) => {
        const items = g.items.filter((i) => puede(usuario.rol, i.permiso));
        if (!items.length) return null;
        return (
          <div key={g.grupo}>
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-marca-200/70">{g.grupo}</p>
            {items.map((i) => {
              const activo = i.href === activoHref;
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition",
                    activo ? "bg-white/15 font-semibold text-white" : "text-marca-100 hover:bg-white/10",
                  )}
                >
                  <span aria-hidden className="w-5 text-center">{i.icono}</span>
                  {i.texto}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  const pie = (
    <div className="border-t border-white/10 p-3">
      <Link href="/perfil" className="block truncate text-sm font-medium text-white hover:underline">
        {usuario.nombre}
      </Link>
      <p className="text-xs text-marca-200">{ROLES[usuario.rol]}</p>
      <form action={cerrarSesion} className="mt-2">
        <button type="submit" className="w-full rounded-lg bg-white/10 px-3 py-1.5 text-left text-sm text-marca-50 hover:bg-white/20">
          Cerrar sesión
        </button>
      </form>
    </div>
  );

  const marca = (
    <Link href="/dashboard" className="flex items-center gap-2 font-bold text-white">
      <span aria-hidden className="text-xl">🦷</span>
      <span className="truncate">{nombreClinica}</span>
    </Link>
  );

  return (
    <>
      {/* Barra superior en celular */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-marca-800 px-4 py-3 lg:hidden">
        {marca}
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="rounded-lg p-2 text-white hover:bg-white/10"
          aria-label="Abrir menú"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
      </header>

      {/* Menú deslizante en celular */}
      {abierto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAbierto(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-marca-800">
            <div className="flex items-center justify-between px-4 py-4">
              {marca}
              <button type="button" onClick={() => setAbierto(false)} className="p-1 text-white" aria-label="Cerrar menú">
                ✕
              </button>
            </div>
            {navegacion}
            {pie}
          </aside>
        </div>
      )}

      {/* Barra lateral fija en escritorio */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-marca-800 lg:flex">
        <div className="px-4 py-5">{marca}</div>
        {navegacion}
        {pie}
      </aside>
    </>
  );
}
