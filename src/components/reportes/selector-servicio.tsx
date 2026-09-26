"use client";
import { usePathname, useRouter } from "next/navigation";

export function SelectorServicio({ servicios, valor }: { servicios: { id: number; nombre: string }[]; valor?: number }) {
  const router = useRouter();
  const ruta = usePathname();
  return (
    <div className="tarjeta mb-5 p-4">
      <label className="text-xs text-slate-500">
        Servicio
        <select
          value={valor ?? ""}
          onChange={(e) => router.push(e.target.value ? `${ruta}?servicio=${e.target.value}` : ruta)}
          className="input mt-0.5 max-w-sm"
        >
          <option value="">Todos los servicios</option>
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
