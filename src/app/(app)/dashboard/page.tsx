import { prisma } from "@/lib/db";
import { Encabezado } from "@/components/ui/encabezado";

export default async function Dashboard() {
  const [servicios, atenciones, gastos] = await Promise.all([
    prisma.servicio.count(),
    prisma.atencion.count(),
    prisma.gastoIndirecto.count(),
  ]);
  return (
    <>
      <Encabezado titulo="Dashboard" descripcion="En construcción (fase 5)." />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="tarjeta p-4">Servicios: {servicios}</div>
        <div className="tarjeta p-4">Atenciones: {atenciones}</div>
        <div className="tarjeta p-4">Gastos indirectos: {gastos}</div>
      </div>
    </>
  );
}
