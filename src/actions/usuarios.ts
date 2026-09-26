"use server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { exigirPermiso, obtenerSesion } from "@/lib/auth/sesion";
import { erroresDeZod, manejarError, type EstadoFormulario } from "@/lib/acciones";
import { esquemaCambioPassword, esquemaConfiguracion, esquemaEditarUsuario, esquemaNuevoUsuario } from "@/lib/validaciones/usuarios";

const datos = (f: FormData) => Object.fromEntries(f);

export async function crearUsuario(_p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("gestionarUsuarios");
    const r = esquemaNuevoUsuario.safeParse(datos(f));
    if (!r.success) return erroresDeZod(r.error);
    const { password, odontologoId, ...resto } = r.data;
    if (odontologoId && (await prisma.usuario.findUnique({ where: { odontologoId } }))) {
      return { ok: false, errores: { odontologoId: ["Ese odontólogo ya tiene un usuario"] } };
    }
    await prisma.usuario.create({
      data: { ...resto, passwordHash: await bcrypt.hash(password, 10), odontologoId: resto.rol === "ODONTOLOGO" ? odontologoId : null },
    });
    revalidatePath("/usuarios");
    return { ok: true, mensaje: "Usuario creado." };
  } catch (e) {
    return manejarError(e);
  }
}

export async function editarUsuario(id: number, _p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    const sesion = await exigirPermiso("gestionarUsuarios");
    const r = esquemaEditarUsuario.safeParse(datos(f));
    if (!r.success) return erroresDeZod(r.error);
    const { password, odontologoId, ...resto } = r.data;

    // Nunca dejar la clínica sin un administrador activo
    const actual = await prisma.usuario.findUnique({ where: { id } });
    if (!actual) return { ok: false, mensaje: "El usuario no existe." };
    if (actual.rol === "ADMIN" && (resto.rol !== "ADMIN" || !resto.activo)) {
      const admins = await prisma.usuario.count({ where: { rol: "ADMIN", activo: true, id: { not: id } } });
      if (admins === 0) return { ok: false, mensaje: "Debe existir al menos un administrador activo." };
    }
    if (id === sesion.id && !resto.activo) return { ok: false, mensaje: "No puede desactivar su propio usuario." };
    if (odontologoId && resto.rol === "ODONTOLOGO") {
      const otro = await prisma.usuario.findFirst({ where: { odontologoId, id: { not: id } } });
      if (otro) return { ok: false, errores: { odontologoId: ["Ese odontólogo ya tiene un usuario"] } };
    }
    await prisma.usuario.update({
      where: { id },
      data: {
        ...resto,
        odontologoId: resto.rol === "ODONTOLOGO" ? odontologoId : null,
        ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
      },
    });
    revalidatePath("/usuarios");
    return { ok: true, mensaje: password ? "Guardado (contraseña actualizada)." : "Guardado" };
  } catch (e) {
    return manejarError(e);
  }
}

export async function cambiarMiPassword(_p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    const sesion = await obtenerSesion();
    if (!sesion) return { ok: false, mensaje: "Sesión expirada." };
    const r = esquemaCambioPassword.safeParse(datos(f));
    if (!r.success) return erroresDeZod(r.error);
    const u = await prisma.usuario.findUnique({ where: { id: sesion.id } });
    if (!u || !(await bcrypt.compare(r.data.actual, u.passwordHash))) {
      return { ok: false, errores: { actual: ["La contraseña actual no es correcta"] } };
    }
    await prisma.usuario.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(r.data.nueva, 10) } });
    return { ok: true, mensaje: "Contraseña actualizada." };
  } catch (e) {
    return manejarError(e);
  }
}

export async function guardarConfiguracion(_p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("configurar");
    const r = esquemaConfiguracion.safeParse(datos(f));
    if (!r.success) return erroresDeZod(r.error);
    const data = { ...r.data, ruc: r.data.ruc ?? null, direccion: r.data.direccion ?? null };
    await prisma.configuracion.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
    revalidatePath("/", "layout");
    return { ok: true, mensaje: "Configuración guardada. El IGV aplica a las nuevas atenciones." };
  } catch (e) {
    return manejarError(e);
  }
}
