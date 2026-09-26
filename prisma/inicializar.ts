/**
 * Inicialización en producción (se ejecuta al arrancar el contenedor, después de las migraciones).
 * - Si ya hay usuarios, no hace nada (nunca borra datos).
 * - Si la base está vacía y CARGAR_DATOS_EJEMPLO=true, carga los datos de demostración.
 * - Si la base está vacía, crea el administrador inicial con ADMIN_EMAIL y ADMIN_PASSWORD.
 */
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const usuarios = await prisma.usuario.count();
  if (usuarios > 0) {
    console.log(`Base de datos existente (${usuarios} usuarios). No se modifica.`);
    return;
  }
  if (process.env.CARGAR_DATOS_EJEMPLO === "true") {
    console.log("Base vacía: cargando datos de ejemplo…");
    execSync("npx prisma db seed", { stdio: "inherit" });
    return;
  }
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 8) {
    throw new Error("Base vacía: defina ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 8 caracteres) para crear el administrador inicial.");
  }
  await prisma.configuracion.upsert({
    where: { id: 1 },
    create: { id: 1, nombreClinica: process.env.NOMBRE_CLINICA ?? "Clínica Dental" },
    update: {},
  });
  await prisma.usuario.create({
    data: { nombre: "Administrador", email, passwordHash: await bcrypt.hash(password, 10), rol: "ADMIN" },
  });
  console.log(`Administrador inicial creado: ${email}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
