import Link from "next/link";
import { Alerta } from "@/components/ui/alerta";

export default function SinAcceso() {
  return (
    <div className="mx-auto max-w-lg py-12">
      <Alerta tipo="aviso" titulo="Acceso restringido">
        Su rol no tiene permiso para ver esta sección. Si cree que es un error, comuníquese con el administrador.
      </Alerta>
      <Link href="/dashboard" className="btn btn-secundario mt-4">
        Volver al inicio
      </Link>
    </div>
  );
}
