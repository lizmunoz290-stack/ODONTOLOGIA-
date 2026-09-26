"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { exigirPermiso } from "@/lib/auth/sesion";
import { erroresDeZod, manejarError, type EstadoFormulario } from "@/lib/acciones";
import { leerLibro, type ResumenHoja } from "@/lib/libro/leer";
import { destinoPorDefecto, type DestinoGasto } from "@/lib/libro/normalizar";
import { isoDia } from "@/lib/libro/fechas";
import { parseFechaISO } from "@/lib/formato";
import { monto, texto, textoOpcional, z } from "@/lib/validaciones/comun";

export interface ResultadoImportLibro {
  ok?: boolean;
  mensaje?: string;
  modo?: "validar" | "importar";
  hojas?: ResumenHoja[];
  nuevos?: { ingresos: number; gastos: number; inicios: number; metas: number; permisos: number };
  existentes?: { ingresos: number; gastos: number; inicios: number };
  tiposNuevos?: { nombre: string; destino: DestinoGasto; total: number }[];
  correcciones?: { hoja: string; fila: number; detalle: string }[];
  periodo?: { desde: string; hasta: string };
}

const MAX_BYTES = 15 * 1024 * 1024;
/** Guarda la fecha a mediodía de Lima para que nunca cambie de día/mes por la zona horaria */
const fechaLima = (d: Date) => parseFechaISO(isoDia(d));

function revalidar() {
  revalidatePath("/finanzas", "layout");
  revalidatePath("/dashboard");
}

async function enLotes<T>(items: T[], fn: (lote: T[]) => Promise<unknown>, tam = 1000) {
  for (let i = 0; i < items.length; i += tam) await fn(items.slice(i, i + tam));
}

export async function importarLibro(_p: ResultadoImportLibro, f: FormData): Promise<ResultadoImportLibro> {
  try {
    await exigirPermiso("editarCatalogo");
    const modo = f.get("modo") === "importar" ? "importar" : "validar";
    const reemplazar = f.get("reemplazar") === "on";
    const archivo = f.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, mensaje: "Seleccione el archivo Excel del libro contable (.xlsx)." };
    if (!archivo.name.toLowerCase().endsWith(".xlsx")) return { ok: false, mensaje: "El archivo debe tener extensión .xlsx." };
    if (archivo.size > MAX_BYTES) return { ok: false, mensaje: "El archivo supera los 15 MB." };

    const libro = await leerLibro(await archivo.arrayBuffer());
    if (libro.error) return { ok: false, mensaje: libro.error };
    if (!libro.ingresos.length && !libro.gastos.length && !libro.inicios.length) {
      return { ok: false, mensaje: "No se encontraron hojas INGRESOS, GASTOS o INICIOS con el formato esperado (fila de encabezados con FECHA y MONTO)." };
    }

    // ¿Qué ya existe? (por huella de fila)
    const [hIng, hGas, hIni, tipos] = await Promise.all([
      reemplazar ? [] : prisma.ingreso.findMany({ select: { huella: true } }),
      reemplazar ? [] : prisma.gasto.findMany({ select: { huella: true } }),
      reemplazar ? [] : prisma.inicio.findMany({ select: { huella: true } }),
      prisma.tipoGasto.findMany(),
    ]);
    const setIng = new Set(hIng.map((x) => x.huella)), setGas = new Set(hGas.map((x) => x.huella)), setIni = new Set(hIni.map((x) => x.huella));
    const ingNuevos = libro.ingresos.filter((x) => !setIng.has(x.huella));
    const gasNuevos = libro.gastos.filter((x) => !setGas.has(x.huella));
    const iniNuevos = libro.inicios.filter((x) => !setIni.has(x.huella));

    const tiposExistentes = new Map(tipos.map((t) => [t.nombre, t]));
    const totPorTipo = new Map<string, number>();
    for (const g of libro.gastos) totPorTipo.set(g.tipo, (totPorTipo.get(g.tipo) ?? 0) + g.monto);
    const tiposNuevos = [...totPorTipo]
      .filter(([n]) => !tiposExistentes.has(n))
      .map(([nombre, total]) => ({ nombre, destino: destinoPorDefecto(nombre), total }))
      .sort((a, b) => b.total - a.total);

    const fechas = [...libro.ingresos, ...libro.gastos].map((x) => x.fecha.getTime());
    const base: ResultadoImportLibro = {
      modo,
      hojas: libro.hojas,
      nuevos: { ingresos: ingNuevos.length, gastos: gasNuevos.length, inicios: iniNuevos.length, metas: libro.metas.length, permisos: libro.permisos.length },
      existentes: { ingresos: libro.ingresos.length - ingNuevos.length, gastos: libro.gastos.length - gasNuevos.length, inicios: libro.inicios.length - iniNuevos.length },
      tiposNuevos,
      correcciones: libro.correcciones,
      periodo: fechas.length ? { desde: isoDia(new Date(Math.min(...fechas))), hasta: isoDia(new Date(Math.max(...fechas))) } : undefined,
    };
    if (modo === "validar") {
      return { ...base, ok: true, mensaje: "Archivo leído correctamente. Revise el resumen y pulse «Importar» para guardar." };
    }

    await prisma.$transaction(
      async (tx) => {
        if (reemplazar) {
          await tx.gasto.deleteMany();
          await tx.ingreso.deleteMany();
          await tx.inicio.deleteMany();
        }
        for (const t of tiposNuevos) {
          const creado = await tx.tipoGasto.create({ data: { nombre: t.nombre, destino: t.destino } });
          tiposExistentes.set(t.nombre, creado);
        }
        await enLotes(ingNuevos, (lote) =>
          tx.ingreso.createMany({
            data: lote.map((x) => ({
              fecha: fechaLima(x.fecha), ticket: x.ticket, paciente: x.paciente, pacienteClave: x.pacienteClave, monto: x.monto,
              medioPago: x.medioPago, especialidad: x.especialidad, correccion: x.correccion ?? null, origen: x.origen, huella: x.huella,
            })),
          }),
        );
        await enLotes(gasNuevos, (lote) =>
          tx.gasto.createMany({
            data: lote.map((x) => ({
              fecha: fechaLima(x.fecha), descripcion: x.descripcion, monto: x.monto, tipoGastoId: tiposExistentes.get(x.tipo)!.id,
              tipoOriginal: x.tipoOriginal, medioPago: x.medioPago, comprobante: x.comprobante, numero: x.numero,
              correccion: x.correccion ?? null, origen: x.origen, huella: x.huella,
            })),
          }),
        );
        await enLotes(iniNuevos, (lote) =>
          tx.inicio.createMany({ data: lote.map((x) => ({ ...x, fecha: fechaLima(x.fecha) })) }),
        );
        for (const m of libro.metas) {
          await tx.meta.upsert({ where: { periodo_indicador: { periodo: m.periodo, indicador: m.indicador } }, create: m, update: { valor: m.valor } });
        }
        for (const p of libro.permisos) {
          const data = { vencimiento: p.vencimiento ? fechaLima(p.vencimiento) : null, notas: p.notas };
          await tx.permiso.upsert({ where: { detalle: p.detalle }, create: { detalle: p.detalle, ...data }, update: data });
        }
        // Marca tickets repetidos (posibles pagos divididos o errores de digitación)
        await tx.ingreso.updateMany({ data: { ticketRepetido: false } });
        const rep = await tx.ingreso.groupBy({ by: ["ticket"], where: { ticket: { not: null } }, _count: { _all: true }, having: { ticket: { _count: { gt: 1 } } } });
        await enLotes(rep.map((r) => r.ticket!), (lote) => tx.ingreso.updateMany({ where: { ticket: { in: lote } }, data: { ticketRepetido: true } }), 500);
      },
      { timeout: 300_000, maxWait: 20_000 },
    );
    revalidar();
    const n = base.nuevos!;
    return {
      ...base,
      ok: true,
      mensaje: `Importación completada: ${n.ingresos} ingresos, ${n.gastos} gastos, ${n.inicios} inicios, ${n.metas} metas y ${n.permisos} permisos.${
        base.existentes!.ingresos + base.existentes!.gastos ? ` Se omitieron ${base.existentes!.ingresos + base.existentes!.gastos} filas que ya estaban cargadas.` : ""
      }`,
    };
  } catch (e) {
    return { ok: false, mensaje: manejarError(e).mensaje };
  }
}

// ───────────────────────── Clasificación y reparto ─────────────────────────

const DESTINOS = ["DIRECTO_ORTODONCIA", "DIRECTO_ODONTOLOGIA", "DIRECTO_COMPARTIDO", "INDIRECTO", "NO_OPERATIVO"] as const;

export async function cambiarDestinoTipo(tipoId: number, destino: string): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const d = z.enum(DESTINOS).parse(destino);
    await prisma.tipoGasto.update({ where: { id: tipoId }, data: { destino: d } });
    revalidar();
    return { ok: true };
  } catch (e) {
    return manejarError(e);
  }
}

export async function cambiarTipoGasto(gastoId: number, tipoId: number): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    await prisma.gasto.update({ where: { id: gastoId }, data: { tipoGastoId: tipoId } });
    revalidar();
    return { ok: true };
  } catch (e) {
    return manejarError(e);
  }
}

const esquemaNuevoTipo = z.object({ nombre: texto(60), destino: z.enum(DESTINOS) });
export async function crearTipoGasto(_p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const r = esquemaNuevoTipo.safeParse(Object.fromEntries(f));
    if (!r.success) return erroresDeZod(r.error);
    await prisma.tipoGasto.create({ data: { nombre: r.data.nombre.toUpperCase(), destino: r.data.destino } });
    revalidar();
    return { ok: true, mensaje: "Tipo de gasto creado." };
  } catch (e) {
    return manejarError(e);
  }
}

const esquemaReparto = z.object({
  repartoMetodo: z.enum(["INGRESOS", "MITAD", "FIJO"]),
  repartoOrtodoncia: z.preprocess((v) => (v === "" || v == null ? 50 : Number(String(v).replace(",", "."))), z.number().min(0, "Mínimo 0 %").max(100, "Máximo 100 %")),
});
export async function guardarReparto(_p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("configurar");
    const r = esquemaReparto.safeParse(Object.fromEntries(f));
    if (!r.success) return erroresDeZod(r.error);
    await prisma.configuracion.upsert({
      where: { id: 1 },
      create: { id: 1, repartoMetodo: r.data.repartoMetodo, repartoOrtodoncia: r.data.repartoOrtodoncia / 100 },
      update: { repartoMetodo: r.data.repartoMetodo, repartoOrtodoncia: r.data.repartoOrtodoncia / 100 },
    });
    revalidar();
    return { ok: true, mensaje: "Reparto actualizado." };
  } catch (e) {
    return manejarError(e);
  }
}

// ───────────────────────── Metas y permisos ─────────────────────────

const esquemaMeta = z.object({
  periodo: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Periodo inválido"),
  ORTODONCIA: monto().optional(),
  ODONTOLOGIA: monto().optional(),
  INICIOS: monto().optional(),
  UTILIDAD: monto().optional(),
});
export async function guardarMetas(_p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const r = esquemaMeta.safeParse(Object.fromEntries(f));
    if (!r.success) return erroresDeZod(r.error);
    const { periodo, ...valores } = r.data;
    for (const [indicador, valor] of Object.entries(valores) as [keyof typeof valores, number | undefined][]) {
      if (valor === undefined) await prisma.meta.deleteMany({ where: { periodo, indicador } });
      else await prisma.meta.upsert({ where: { periodo_indicador: { periodo, indicador } }, create: { periodo, indicador, valor }, update: { valor } });
    }
    revalidar();
    return { ok: true, mensaje: "Metas guardadas." };
  } catch (e) {
    return manejarError(e);
  }
}

const esquemaPermiso = z.object({
  detalle: texto(80),
  vencimiento: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida").optional()),
  notas: textoOpcional(120),
});
export async function guardarPermiso(permisoId: number | null, _p: EstadoFormulario, f: FormData): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    const r = esquemaPermiso.safeParse(Object.fromEntries(f));
    if (!r.success) return erroresDeZod(r.error);
    const data = { detalle: r.data.detalle, vencimiento: r.data.vencimiento ? parseFechaISO(r.data.vencimiento) : null, notas: r.data.notas ?? null };
    if (permisoId) await prisma.permiso.update({ where: { id: permisoId }, data });
    else await prisma.permiso.create({ data });
    revalidar();
    return { ok: true, mensaje: permisoId ? "Guardado" : "Permiso agregado." };
  } catch (e) {
    return manejarError(e);
  }
}

export async function eliminarPermiso(permisoId: number): Promise<EstadoFormulario> {
  try {
    await exigirPermiso("editarCatalogo");
    await prisma.permiso.delete({ where: { id: permisoId } });
    revalidar();
    return { ok: true };
  } catch (e) {
    return manejarError(e);
  }
}
