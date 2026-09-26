"use client";
import { useState } from "react";
import { FormularioAccion } from "@/components/ui/formulario-accion";
import { Campo } from "@/components/ui/campo";
import { BotonEnvio } from "@/components/ui/boton-envio";
import { ROLES, type RolKey } from "@/lib/constantes";
import type { EstadoFormulario } from "@/lib/acciones";

type Accion = (p: EstadoFormulario, f: FormData) => Promise<EstadoFormulario>;
type Odo = { id: number; nombre: string };

function SelectorRol({ rol, setRol, odontologos, odontologoId }: { rol: RolKey; setRol: (r: RolKey) => void; odontologos: Odo[]; odontologoId?: number | null }) {
  return (
    <>
      <Campo etiqueta="Rol" nombre="rol">
        <select name="rol" value={rol} onChange={(e) => setRol(e.target.value as RolKey)} className="input">
          {Object.entries(ROLES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Campo>
      <Campo etiqueta="Odontólogo vinculado" nombre="odontologoId" ayuda={rol === "ODONTOLOGO" ? "Verá solo sus atenciones." : "Solo para el rol Odontólogo."}>
        <select name="odontologoId" defaultValue={odontologoId ?? ""} disabled={rol !== "ODONTOLOGO"} className="input">
          <option value="">—</option>
          {odontologos.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nombre}
            </option>
          ))}
        </select>
      </Campo>
    </>
  );
}

export function FormularioNuevoUsuario({ accion, odontologos }: { accion: Accion; odontologos: Odo[] }) {
  const [rol, setRol] = useState<RolKey>("CAJA");
  return (
    <FormularioAccion accion={accion} reiniciarAlGuardar className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Campo etiqueta="Nombre" nombre="nombre">
        <input name="nombre" required maxLength={80} className="input" />
      </Campo>
      <Campo etiqueta="Correo electrónico" nombre="email">
        <input name="email" type="email" required className="input" autoComplete="off" />
      </Campo>
      <Campo etiqueta="Contraseña inicial" nombre="password" ayuda="Mínimo 8 caracteres.">
        <input name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
      </Campo>
      <SelectorRol rol={rol} setRol={setRol} odontologos={odontologos} />
      <div className="self-end">
        <BotonEnvio>Crear usuario</BotonEnvio>
      </div>
    </FormularioAccion>
  );
}

export function FilaUsuario({
  accion,
  odontologos,
  usuario,
  esYo,
}: {
  accion: Accion;
  odontologos: Odo[];
  usuario: { nombre: string; email: string; rol: RolKey; activo: boolean; odontologoId: number | null };
  esYo: boolean;
}) {
  const [rol, setRol] = useState<RolKey>(usuario.rol);
  return (
    <FormularioAccion accion={accion} className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-6">
      <Campo etiqueta="Nombre" nombre="nombre">
        <input name="nombre" defaultValue={usuario.nombre} required className="input" />
      </Campo>
      <Campo etiqueta="Correo" nombre="email">
        <input name="email" type="email" defaultValue={usuario.email} required className="input" />
      </Campo>
      <SelectorRol rol={rol} setRol={setRol} odontologos={odontologos} odontologoId={usuario.odontologoId} />
      <Campo etiqueta="Nueva contraseña" nombre="password" ayuda="Dejar vacío para no cambiarla.">
        <input name="password" type="password" minLength={8} className="input" autoComplete="new-password" />
      </Campo>
      <div className="flex items-end justify-between gap-2">
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="activo" defaultChecked={usuario.activo} disabled={esYo} className="h-4 w-4 accent-marca-600" />
          Activo
          {esYo && <input type="hidden" name="activo" value="on" />}
        </label>
        <BotonEnvio className="btn-sm">Guardar</BotonEnvio>
      </div>
    </FormularioAccion>
  );
}
