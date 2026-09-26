"use client";
import { useActionState } from "react";
import { iniciarSesion } from "@/actions/auth";
import { ESTADO_INICIAL } from "@/lib/acciones";
import { Campo } from "@/components/ui/campo";
import { Alerta } from "@/components/ui/alerta";
import { BotonEnvio } from "@/components/ui/boton-envio";

export function FormularioLogin({ desde }: { desde?: string }) {
  const [estado, accion] = useActionState(iniciarSesion, ESTADO_INICIAL);
  return (
    <form action={accion} className="space-y-4" noValidate>
      {estado.mensaje && <Alerta tipo="error">{estado.mensaje}</Alerta>}
      <input type="hidden" name="desde" value={desde ?? ""} />
      <Campo etiqueta="Correo electrónico" htmlFor="email" error={estado.errores?.email}>
        <input id="email" name="email" type="email" autoComplete="username" required className="input" />
      </Campo>
      <Campo etiqueta="Contraseña" htmlFor="password" error={estado.errores?.password}>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </Campo>
      <BotonEnvio pendiente="Ingresando…" className="w-full">
        Ingresar
      </BotonEnvio>
    </form>
  );
}
