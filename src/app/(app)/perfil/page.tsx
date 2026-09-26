import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth/sesion";
import { cambiarMiPassword } from "@/actions/usuarios";
import { ROLES } from "@/lib/constantes";
import { Encabezado } from "@/components/ui/encabezado";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { Campo } from "@/components/ui/campo";
import { BotonEnvio } from "@/components/ui/boton-envio";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function PaginaPerfil() {
  const s = await requerirSesion();
  return (
    <>
      <Encabezado titulo="Mi perfil" descripcion={`${s.nombre} · ${s.email} · ${ROLES[s.rol]}`} />
      <div className="tarjeta max-w-md p-5">
        <h2 className="mb-3 font-semibold">Cambiar contraseña</h2>
        <FormularioAccion accion={cambiarMiPassword} reiniciarAlGuardar className="space-y-3">
          <Campo etiqueta="Contraseña actual" nombre="actual" htmlFor="actual">
            <input id="actual" name="actual" type="password" required autoComplete="current-password" className="input" />
          </Campo>
          <Campo etiqueta="Nueva contraseña" nombre="nueva" htmlFor="nueva" ayuda="Mínimo 8 caracteres.">
            <input id="nueva" name="nueva" type="password" required minLength={8} autoComplete="new-password" className="input" />
          </Campo>
          <Campo etiqueta="Repita la nueva contraseña" nombre="confirmar" htmlFor="confirmar">
            <input id="confirmar" name="confirmar" type="password" required autoComplete="new-password" className="input" />
          </Campo>
          <BotonEnvio>Cambiar contraseña</BotonEnvio>
        </FormularioAccion>
      </div>
    </>
  );
}
