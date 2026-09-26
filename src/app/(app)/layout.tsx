import { requerirSesion } from "@/lib/auth/sesion";
import { obtenerConfiguracion } from "@/lib/db";
import { BarraLateral } from "@/components/layout/barra-lateral";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const sesion = await requerirSesion();
  const config = await obtenerConfiguracion();
  return (
    <div className="min-h-dvh">
      <BarraLateral nombreClinica={config.nombreClinica} usuario={{ nombre: sesion.nombre, rol: sesion.rol }} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
