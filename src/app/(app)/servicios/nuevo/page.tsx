import Link from "next/link";
import { requerirSesion } from "@/lib/auth/sesion";
import { guardarServicio } from "@/actions/catalogo";
import { Encabezado } from "@/components/ui/encabezado";
import { FormularioServicio } from "@/components/servicios/formulario-servicio";

export default async function NuevoServicio() {
  await requerirSesion("editarCatalogo");
  return (
    <>
      <Encabezado
        titulo="Nuevo servicio"
        descripcion="Después de crearlo podrá completar su ficha técnica (materiales, mano de obra, equipos y tercerizados)."
        acciones={<Link href="/servicios" className="btn btn-secundario">← Volver</Link>}
      />
      <div className="tarjeta max-w-3xl p-5">
        <FormularioServicio accion={guardarServicio.bind(null, null)} />
      </div>
    </>
  );
}
