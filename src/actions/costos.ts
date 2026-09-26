"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { exigirPermiso } from "@/lib/auth/sesion";
import { erroresDeZod, manejarError, type EstadoFormulario } from "@/lib/acciones";
import { esquemaGasto, esquemaMetodo, esquemaPeriodo } from "@/lib/validaciones/costos";

function revalidar() {
  revalidatePath("/costos-indirectos");
  revalidatePath("/dashboard");
  revalidatePath("/reportes", "layout");
}

export async function guardarGasto(id: number | null, _p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const r = esquemaGasto.safeParse(Object.fromEntries(f));
    if (!r.success) return erroresDeZod(r.error);
    if (id) await prisma.gastoIndirecto.update({ where: { id }, data: r.data });
    else await prisma.gastoIndirecto.create({ data: r.data });
    revalidar();
    return { ok: true, mensaje: id ? "Guardado" : "Gasto agregado." };
  } catch (e) {
    return manejarError(e);
  }
}

export async function eliminarGasto(id: number): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    await prisma.gastoIndirecto.delete({ where: { id } });
    revalidar();
    return { ok: true };
  } catch (e) {
    return manejarError(e);
  }
}

/** Copia los gastos del mes anterior al periodo indicado (solo si el periodo está vacío). */
export async function copiarMesAnterior(periodo: string): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const p = esquemaPeriodo.parse(periodo);
    if (await prisma.gastoIndirecto.count({ where: { periodo: p } })) {
      return { ok: false, mensaje: "El periodo ya tiene gastos registrados." };
    }
    const [a, m] = p.split("-").map(Number);
    const anterior = m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
    const gastos = await prisma.gastoIndirecto.findMany({ where: { periodo: anterior } });
    if (!gastos.length) return { ok: false, mensaje: "El mes anterior no tiene gastos para copiar." };
    await prisma.gastoIndirecto.createMany({
      data: gastos.map((g) => ({ periodo: p, categoria: g.categoria, descripcion: g.descripcion, monto: g.monto })),
    });
    revalidar();
    return { ok: true, mensaje: `Se copiaron ${gastos.length} gastos. Ajuste los montos que cambien (luz, agua, etc.).` };
  } catch (e) {
    return manejarError(e);
  }
}

export async function guardarMetodoProrrateo(_p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("configurar");
    const r = esquemaMetodo.safeParse(Object.fromEntries(f));
    if (!r.success) return erroresDeZod(r.error);
    await prisma.configuracion.upsert({ where: { id: 1 }, create: { id: 1, ...r.data }, update: r.data });
    revalidar();
    return { ok: true, mensaje: "Método de prorrateo actualizado. Se aplica a todo el dashboard y los reportes." };
  } catch (e) {
    return manejarError(e);
  }
}
