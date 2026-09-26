import type { Metadata } from "next";
import { FormularioLogin } from "./formulario-login";
import { obtenerConfiguracion } from "@/lib/db";

export const metadata: Metadata = { title: "Ingresar" };

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ desde?: string }> }) {
  const { desde } = await searchParams;
  const config = await obtenerConfiguracion();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-marca-50 to-slate-100 p-4">
      <div className="tarjeta w-full max-w-sm p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-marca-600 text-2xl text-white">
            🦷
          </div>
          <h1 className="text-xl font-bold text-slate-900">{config.nombreClinica}</h1>
          <p className="text-sm text-slate-500">Gestión y rentabilidad de servicios</p>
        </div>
        <FormularioLogin desde={desde} />
      </div>
    </main>
  );
}
