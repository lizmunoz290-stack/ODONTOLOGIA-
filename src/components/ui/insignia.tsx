import clsx from "clsx";

const colores = {
  gris: "bg-slate-100 text-slate-700",
  verde: "bg-emerald-100 text-emerald-800",
  rojo: "bg-red-100 text-red-800",
  ambar: "bg-amber-100 text-amber-800",
  azul: "bg-sky-100 text-sky-800",
  marca: "bg-marca-100 text-marca-800",
} as const;

export type ColorInsignia = keyof typeof colores;

export function Insignia({ color = "gris", children }: { color?: ColorInsignia; children: React.ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", colores[color])}>
      {children}
    </span>
  );
}
