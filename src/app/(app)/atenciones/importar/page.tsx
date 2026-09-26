import Link from "next/link";
import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth/sesion";
import { Encabezado } from "@/components/ui/encabezado";
import { FormularioImportacion } from "@/components/atenciones/formulario-importacion";
import { COLUMNAS } from "@/lib/importacion/columnas";

export const metadata: Metadata = { title: "Importar atenciones" };

export default async function ImportarAtenciones() {
  await requerirSesion("registrarAtenciones");
  return (
    <>
      <Encabezado
        titulo="Importar atenciones desde Excel"
        descripcion="Cargue muchas atenciones a la vez. Primero valide el archivo; luego importe las filas válidas."
        acciones={
          <Link href="/atenciones" className="btn btn-secundario">
            ← Atenciones
          </Link>
        }
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FormularioImportacion />
        </div>
        <aside className="tarjeta h-fit p-4 text-sm sm:p-5">
          <h2 className="font-semibold text-slate-900">Plantilla</h2>
          <p className="mt-1 text-slate-600">
            Descargue la plantilla: incluye listas desplegables con sus servicios, odontólogos y valores válidos.
          </p>
          <a href="/api/atenciones/plantilla" className="btn btn-excel mt-3 w-full">
            Descargar plantilla Excel
          </a>
          <h3 className="mt-5 font-semibold text-slate-900">Columnas</h3>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
            {COLUMNAS.map((c) => (
              <li key={c.clave}>
                <span className="font-semibold text-slate-800">
                  {c.encabezado}
                  {c.obligatorio && " *"}
                </span>{" "}
                — {c.nota}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
