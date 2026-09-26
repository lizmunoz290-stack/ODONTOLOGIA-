import { PrismaClient } from "@prisma/client";

const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalParaPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = prisma;

export async function obtenerConfiguracion() {
  return (
    (await prisma.configuracion.findUnique({ where: { id: 1 } })) ??
    (await prisma.configuracion.create({ data: { id: 1 } }))
  );
}
