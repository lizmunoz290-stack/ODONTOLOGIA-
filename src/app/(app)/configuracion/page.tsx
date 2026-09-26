import Link from "next/link";
import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth/sesion";
import { obtenerConfiguracion } from "@/lib/db";
import { guardarConfiguracion } from "@/actions/usuarios";
import { NOMBRE_METODO } from "@/lib/costeo";
import { Encabezado } from "@/components/ui/encabezado";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { Campo } from "@/components/ui/campo";
import { BotonEnvio } from "@/components/ui/boton-envio";

export const metadata: Metadata = { title: "Configuración" };

export default async function PaginaConfiguracion() {
  await requerirSesion("configurar");
  const c = await obtenerConfiguracion();
  return (
    <>
      <Encabezado titulo="Configuración" descripcion="Datos de la clínica (aparecen en los reportes Excel) y parámetros del análisis." />
      <div className="tarjeta max-w-3xl p-5">
        <FormularioAccion accion={guardarConfiguracion} className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Nombre de la clínica" nombre="nombreClinica" htmlFor="nombreClinica" className="sm:col-span-2">
            <input id="nombreClinica" name="nombreClinica" defaultValue={c.nombreClinica} required maxLength={80} className="input" />
          </Campo>
          <Campo etiqueta="RUC (opcional)" nombre="ruc" htmlFor="ruc">
            <input id="ruc" name="ruc" defaultValue={c.ruc ?? ""} inputMode="numeric" maxLength={11} className="input" />
          </Campo>
          <Campo etiqueta="Dirección (opcional)" nombre="direccion" htmlFor="direccion">
            <input id="direccion" name="direccion" defaultValue={c.direccion ?? ""} maxLength={150} className="input" />
          </Campo>
          <Campo etiqueta="IGV (%)" nombre="igvPorcentaje" htmlFor="igv" ayuda="Perú: 18 %. Se usa para calcular el valor sin IGV de las nuevas atenciones.">
            <input id="igv" name="igvPorcentaje" type="number" step="0.01" min="0" max="50" defaultValue={Math.round(c.igvPorcentaje * 10000) / 100} className="input" />
          </Campo>
          <Campo etiqueta="Margen mínimo aceptable (%)" nombre="margenMinimo" htmlFor="margen" ayuda="Los servicios por debajo se marcan con alerta.">
            <input id="margen" name="margenMinimo" type="number" step="0.1" min="0" max="90" defaultValue={Math.round(c.margenMinimo * 1000) / 10} className="input" />
          </Campo>
          <p className="text-sm text-slate-600 sm:col-span-2">
            Método de prorrateo actual: <strong>{NOMBRE_METODO[c.metodoProrrateo]}</strong>.{" "}
            <Link href="/costos-indirectos" className="text-marca-700 underline">
              Cambiarlo en Costos indirectos
            </Link>
            .
          </p>
          <div className="sm:col-span-2">
            <BotonEnvio>Guardar configuración</BotonEnvio>
          </div>
        </FormularioAccion>
      </div>
    </>
  );
}
