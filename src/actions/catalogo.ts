"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigirPermiso } from "@/lib/auth/sesion";
import { erroresDeZod, manejarError, type EstadoFormulario } from "@/lib/acciones";
import {
  esquemaEquipo,
  esquemaEsterilizacion,
  esquemaFichaEquipo,
  esquemaFichaManoObra,
  esquemaFichaMaterial,
  esquemaFichaTercerizado,
  esquemaMaterial,
  esquemaOdontologo,
  esquemaServicio,
} from "@/lib/validaciones/catalogo";

const datos = (f: FormData) => Object.fromEntries(f);

function revalidarServicio(id?: number) {
  revalidatePath("/servicios");
  if (id) revalidatePath(`/servicios/${id}`);
}

// ───────────────────────── Servicios ─────────────────────────

export async function guardarServicio(
  id: number | null,
  _prev: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  let nuevoId: number | null = null;
  try {
    await exigirPermiso("editarCatalogo");
    const r = esquemaServicio.safeParse(datos(formData));
    if (!r.success) return erroresDeZod(r.error);
    if (id) {
      await prisma.servicio.update({ where: { id }, data: r.data });
      revalidarServicio(id);
    } else {
      nuevoId = (await prisma.servicio.create({ data: r.data })).id;
      revalidarServicio();
    }
  } catch (e) {
    return manejarError(e);
  }
  if (nuevoId) redirect(`/servicios/${nuevoId}?creado=1`);
  return { ok: true, mensaje: "Servicio actualizado." };
}

export async function eliminarServicio(id: number): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const usos = await prisma.atencion.count({ where: { servicioId: id } });
    if (usos > 0) {
      return {
        ok: false,
        mensaje: `No se puede eliminar: tiene ${usos} atenciones registradas. Desactívelo para que no aparezca en nuevas atenciones.`,
      };
    }
    await prisma.servicio.delete({ where: { id } });
  } catch (e) {
    return manejarError(e);
  }
  revalidarServicio();
  redirect("/servicios");
}

// ───────────────────────── Ficha técnica ─────────────────────────

export async function agregarFichaMaterial(servicioId: number, _p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const r = esquemaFichaMaterial.safeParse(datos(f));
    if (!r.success) return erroresDeZod(r.error);
    await prisma.fichaMaterial.upsert({
      where: { servicioId_materialId: { servicioId, materialId: r.data.materialId } },
      create: { servicioId, ...r.data },
      update: { cantidad: r.data.cantidad },
    });
    revalidarServicio(servicioId);
    return { ok: true };
  } catch (e) {
    return manejarError(e);
  }
}

export async function actualizarFichaMaterial(id: number, servicioId: number, _p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const r = esquemaFichaMaterial.pick({ cantidad: true }).safeParse(datos(f));
    if (!r.success) return erroresDeZod(r.error);
    await prisma.fichaMaterial.update({ where: { id }, data: r.data });
    revalidarServicio(servicioId);
    return { ok: true, mensaje: "Guardado" };
  } catch (e) {
    return manejarError(e);
  }
}

export async function agregarFichaManoObra(servicioId: number, _p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const r = esquemaFichaManoObra.safeParse(datos(f));
    if (!r.success) return erroresDeZod(r.error);
    await prisma.fichaManoObra.create({ data: { servicioId, ...r.data } });
    revalidarServicio(servicioId);
    return { ok: true };
  } catch (e) {
    return manejarError(e);
  }
}

export async function actualizarFichaManoObra(id: number, servicioId: number, _p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const r = esquemaFichaManoObra.omit({ rol: true }).safeParse(datos(f));
    if (!r.success) return erroresDeZod(r.error);
    await prisma.fichaManoObra.update({ where: { id }, data: r.data });
    revalidarServicio(servicioId);
    return { ok: true, mensaje: "Guardado" };
  } catch (e) {
    return manejarError(e);
  }
}

export async function agregarFichaEquipo(servicioId: number, _p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const r = esquemaFichaEquipo.safeParse(datos(f));
    if (!r.success) return erroresDeZod(r.error);
    await prisma.fichaEquipo.upsert({
      where: { servicioId_equipoId: { servicioId, equipoId: r.data.equipoId } },
      create: { servicioId, ...r.data },
      update: { minutosUso: r.data.minutosUso },
    });
    revalidarServicio(servicioId);
    return { ok: true };
  } catch (e) {
    return manejarError(e);
  }
}

export async function actualizarFichaEquipo(id: number, servicioId: number, _p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const r = esquemaFichaEquipo.pick({ minutosUso: true }).safeParse(datos(f));
    if (!r.success) return erroresDeZod(r.error);
    await prisma.fichaEquipo.update({ where: { id }, data: r.data });
    revalidarServicio(servicioId);
    return { ok: true, mensaje: "Guardado" };
  } catch (e) {
    return manejarError(e);
  }
}

export async function agregarFichaTercerizado(servicioId: number, _p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const r = esquemaFichaTercerizado.safeParse(datos(f));
    if (!r.success) return erroresDeZod(r.error);
    await prisma.fichaTercerizado.create({ data: { servicioId, ...r.data } });
    revalidarServicio(servicioId);
    return { ok: true };
  } catch (e) {
    return manejarError(e);
  }
}

export async function actualizarFichaTercerizado(id: number, servicioId: number, _p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const r = esquemaFichaTercerizado.omit({ tipo: true }).safeParse(datos(f));
    if (!r.success) return erroresDeZod(r.error);
    await prisma.fichaTercerizado.update({ where: { id }, data: r.data });
    revalidarServicio(servicioId);
    return { ok: true, mensaje: "Guardado" };
  } catch (e) {
    return manejarError(e);
  }
}

export async function guardarEsterilizacion(servicioId: number, _p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const r = esquemaEsterilizacion.safeParse(datos(f));
    if (!r.success) return erroresDeZod(r.error);
    await prisma.servicio.update({ where: { id: servicioId }, data: r.data });
    revalidarServicio(servicioId);
    return { ok: true, mensaje: "Guardado" };
  } catch (e) {
    return manejarError(e);
  }
}

type TipoFila = "material" | "manoObra" | "equipo" | "tercerizado";

export async function quitarFilaFicha(tipo: TipoFila, id: number, servicioId: number): Promise<void> {
  await exigirPermiso("editarCatalogo");
  const where = { id, servicioId };
  if (tipo === "material") await prisma.fichaMaterial.deleteMany({ where });
  if (tipo === "manoObra") await prisma.fichaManoObra.deleteMany({ where });
  if (tipo === "equipo") await prisma.fichaEquipo.deleteMany({ where });
  if (tipo === "tercerizado") await prisma.fichaTercerizado.deleteMany({ where });
  revalidarServicio(servicioId);
}

// ───────────────────────── Materiales ─────────────────────────

export async function guardarMaterial(id: number | null, _p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const r = esquemaMaterial.safeParse(datos(f));
    if (!r.success) return erroresDeZod(r.error);
    if (id) await prisma.material.update({ where: { id }, data: r.data });
    else await prisma.material.create({ data: r.data });
    revalidatePath("/materiales");
    revalidatePath("/servicios", "layout");
    return { ok: true, mensaje: id ? "Material actualizado." : "Material agregado." };
  } catch (e) {
    return manejarError(e);
  }
}

export async function eliminarMaterial(id: number): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const usos = await prisma.fichaMaterial.count({ where: { materialId: id } });
    if (usos > 0) return { ok: false, mensaje: `Se usa en ${usos} ficha(s) técnica(s). Quítelo de ellas o desactívelo.` };
    await prisma.material.delete({ where: { id } });
    revalidatePath("/materiales");
    return { ok: true, mensaje: "Material eliminado." };
  } catch (e) {
    return manejarError(e);
  }
}

// ───────────────────────── Equipos ─────────────────────────

export async function guardarEquipo(id: number | null, _p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const r = esquemaEquipo.safeParse(datos(f));
    if (!r.success) return erroresDeZod(r.error);
    if (id) await prisma.equipo.update({ where: { id }, data: r.data });
    else await prisma.equipo.create({ data: r.data });
    revalidatePath("/equipos");
    revalidatePath("/servicios", "layout");
    return { ok: true, mensaje: id ? "Equipo actualizado." : "Equipo agregado." };
  } catch (e) {
    return manejarError(e);
  }
}

export async function eliminarEquipo(id: number): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const usos = await prisma.fichaEquipo.count({ where: { equipoId: id } });
    if (usos > 0) return { ok: false, mensaje: `Se usa en ${usos} ficha(s) técnica(s). Quítelo de ellas o desactívelo.` };
    await prisma.equipo.delete({ where: { id } });
    revalidatePath("/equipos");
    return { ok: true, mensaje: "Equipo eliminado." };
  } catch (e) {
    return manejarError(e);
  }
}

// ───────────────────────── Odontólogos ─────────────────────────

export async function guardarOdontologo(id: number | null, _p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const r = esquemaOdontologo.safeParse(datos(f));
    if (!r.success) return erroresDeZod(r.error);
    const data = { ...r.data, cop: r.data.cop ?? null };
    if (id) await prisma.odontologo.update({ where: { id }, data });
    else await prisma.odontologo.create({ data });
    revalidatePath("/odontologos");
    return { ok: true, mensaje: id ? "Odontólogo actualizado." : "Odontólogo agregado." };
  } catch (e) {
    return manejarError(e);
  }
}

export async function eliminarOdontologo(id: number): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const usos = await prisma.atencion.count({ where: { odontologoId: id } });
    if (usos > 0) return { ok: false, mensaje: `Tiene ${usos} atenciones registradas. Desactívelo en su lugar.` };
    await prisma.usuario.updateMany({ where: { odontologoId: id }, data: { odontologoId: null } });
    await prisma.odontologo.delete({ where: { id } });
    revalidatePath("/odontologos");
    return { ok: true, mensaje: "Odontólogo eliminado." };
  } catch (e) {
    return manejarError(e);
  }
}
