import type { Metadata } from "next";
import { requerirSesion } from "@/lib/auth/sesion";
import { prisma } from "@/lib/db";
import { crearUsuario, editarUsuario } from "@/actions/usuarios";
import { ROLES } from "@/lib/constantes";
import { Encabezado } from "@/components/ui/encabezado";
import { Insignia } from "@/components/ui/insignia";
import { FilaUsuario, FormularioNuevoUsuario } from "@/components/usuarios/formularios-usuario";

export const metadata: Metadata = { title: "Usuarios" };

const PERMISOS_ROL = [
  ["Administrador", "Acceso total: catálogo, fichas técnicas, costos, márgenes, reportes, usuarios y configuración."],
  ["Caja / Secretaría", "Registra atenciones y pagos, importa desde Excel y ve ventas. No ve costos ni utilidades."],
  ["Odontólogo", "Ve solo sus atenciones y su productividad (sin costos ni utilidades)."],
];

export default async function PaginaUsuarios() {
  const sesion = await requerirSesion("gestionarUsuarios");
  const [usuarios, odontologos] = await Promise.all([
    prisma.usuario.findMany({ orderBy: [{ activo: "desc" }, { rol: "asc" }, { nombre: "asc" }] }),
    prisma.odontologo.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);
  return (
    <>
      <Encabezado titulo="Usuarios y roles" descripcion="Cree cuentas para su equipo y defina qué puede ver cada uno." />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {PERMISOS_ROL.map(([r, d]) => (
          <div key={r} className="tarjeta p-4 text-sm">
            <p className="font-semibold text-slate-900">{r}</p>
            <p className="mt-1 text-slate-600">{d}</p>
          </div>
        ))}
      </div>
      <section className="tarjeta mb-5 p-4 sm:p-5">
        <h2 className="mb-3 font-semibold">Nuevo usuario</h2>
        <FormularioNuevoUsuario accion={crearUsuario} odontologos={odontologos} />
      </section>
      <section className="tarjeta overflow-hidden">
        <h2 className="px-4 pt-4 font-semibold">Usuarios registrados ({usuarios.length})</h2>
        {usuarios.map((u) => (
          <div key={u.id}>
            <div className="flex items-center gap-2 px-4 pt-3 text-xs">
              <Insignia color={u.rol === "ADMIN" ? "marca" : u.rol === "CAJA" ? "azul" : "gris"}>{ROLES[u.rol]}</Insignia>
              {!u.activo && <Insignia color="rojo">Inactivo</Insignia>}
              {u.id === sesion.id && <Insignia color="verde">Usted</Insignia>}
            </div>
            <FilaUsuario accion={editarUsuario.bind(null, u.id)} odontologos={odontologos} usuario={u} esYo={u.id === sesion.id} />
          </div>
        ))}
      </section>
    </>
  );
}
