import Link from "next/link";
import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth/sesion";
import { guardarAtencion } from "@/actions/atenciones";
import { datosFormularioAtencion } from "@/lib/atenciones/datos-formulario";
import { fechaISO } from "@/lib/formato";
import { Encabezado } from "@/components/ui/encabezado";
import { Alerta } from "@/components/ui/alerta";
import { FormularioAtencion } from "@/components/atenciones/formulario-atencion";

export const metadata: Metadata = { title: "Nueva atención" };

export default async function NuevaAtencion({ searchParams }: { searchParams: Promise<{ registrada?: string }> }) {
  await requerirSesion("registrarAtenciones");
  const { registrada } = await searchParams;
  const datos = await datosFormularioAtencion();
  const hoy = fechaISO(new Date());
  const hora = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "America/Lima", hour: "2-digit", hour12: false }).format(new Date()));
  return (
    <>
      <Encabezado
        titulo="Registrar atención"
        acciones={
          <Link href="/atenciones" className="btn btn-secundario">
            ← Atenciones
          </Link>
        }
      />
      {registrada && (
        <Alerta tipo="exito" className="mb-4">
          Atención registrada. Puede registrar la siguiente.
        </Alerta>
      )}
      <FormularioAtencion
        key={registrada ?? "nueva"}
        accion={guardarAtencion.bind(null, null)}
        {...datos}
        hoy={hoy}
        valores={{
          fecha: hoy,
          pacienteNombre: "",
          pacienteDni: "",
          servicioId: "",
          odontologoId: "",
          turno: hora < 14 ? "MANANA" : "TARDE",
          precioLista: "",
          descuento: 0,
          incluyeIgv: true,
          metodoPago: "",
          estadoPago: "PAGADO",
          montoPagado: "",
          canal: "",
          observaciones: "",
        }}
      />
    </>
  );
}
