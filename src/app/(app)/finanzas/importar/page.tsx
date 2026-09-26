import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth/sesion";
import { Encabezado } from "@/components/ui/encabezado";
import { FormularioLibro } from "@/components/finanzas/formulario-libro";

export const metadata: Metadata = { title: "Importar libro contable" };

export default async function ImportarLibro() {
  await requerirSesion("editarCatalogo");
  return (
    <>
      <Encabezado
        titulo="Importar libro contable"
        descripcion="Suba su Excel de ingresos y gastos (formato ODM - INFORME). Puede volver a subirlo cada mes: solo se agregan los movimientos nuevos."
      />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FormularioLibro />
        </div>
        <aside className="tarjeta h-fit space-y-3 p-4 text-sm text-slate-600 sm:p-5">
          <h2 className="font-semibold text-slate-900">Qué hojas se leen</h2>
          <ul className="list-disc space-y-1.5 pl-4">
            <li>
              <b>INGRESOS AAAA</b>: FECHA, TICKET, NOMBRE Y APELLIDO, MONTO, M_PAGO, ESPECIALIDAD.
            </li>
            <li>
              <b>GASTOS AAAA</b>: FECHA, DESCRIPCION, MONTO, TIPO DE GASTO, ME_PAGO, TIPO DE RECIBO, N.º RECIBO.
            </li>
            <li>
              <b>INICIOS AAAA</b>: FECHA, NOMBRE, CANTIDAD, ASESORA.
            </li>
            <li>
              <b>REPORTE MENSUAL</b>: las metas de cada «CIERRE MES - AÑO».
            </li>
            <li>
              <b>PERMISOS</b>: DETALLE y FECHA DE VENCIMIENTO.
            </li>
          </ul>
          <h2 className="pt-2 font-semibold text-slate-900">Correcciones automáticas</h2>
          <ul className="list-disc space-y-1.5 pl-4">
            <li>Se omiten los tickets «ANULADO» y las filas sin monto.</li>
            <li>Se corrigen años mal escritos (p. ej. 26/12/2025 dentro de la hoja 2024) y fechas escritas como texto.</li>
            <li>Se unifican tipos de gasto escritos de distinta forma (RYDENT/RAYDENT…) y se reparte «OTROS» por la descripción (alquiler, luz, Entel…).</li>
            <li>Se marcan los tickets repetidos para que los revise.</li>
          </ul>
          <p className="text-xs">Sus datos quedan guardados solo en la base de datos de la clínica.</p>
        </aside>
      </div>
    </>
  );
}
