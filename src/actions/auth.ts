"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { COOKIE_SESION, DURACION_SESION_SEG, firmarSesion } from "@/lib/auth/token";
import type { EstadoFormulario } from "@/lib/acciones";

const esquemaLogin = z.object({
  email: z.string().trim().toLowerCase().email("Ingrese un correo válido"),
  password: z.string().min(1, "Ingrese su contraseña"),
  desde: z.string().optional(),
});

export async function iniciarSesion(_prev: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const datos = esquemaLogin.safeParse(Object.fromEntries(formData));
  if (!datos.success) {
    return { ok: false, errores: datos.error.flatten().fieldErrors };
  }
  const usuario = await prisma.usuario.findUnique({ where: { email: datos.data.email } });
  const valido = usuario && usuario.activo && (await bcrypt.compare(datos.data.password, usuario.passwordHash));
  if (!valido) return { ok: false, mensaje: "Correo o contraseña incorrectos, o usuario inactivo." };

  const token = await firmarSesion({
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
    odontologoId: usuario.odontologoId,
  });
  (await cookies()).set(COOKIE_SESION, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_SESION_SEG,
  });
  const destino = datos.data.desde?.startsWith("/") && !datos.data.desde.startsWith("//") ? datos.data.desde : "/dashboard";
  redirect(destino);
}

export async function cerrarSesion() {
  (await cookies()).delete(COOKIE_SESION);
  redirect("/login");
}
