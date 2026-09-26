"use server";
import { revalidatePath } from "next/cache";
import { obtenerConfiguracion, prisma } from "@/lib/db";
import { exigirPermiso } from "@/lib/auth/sesion";
import { manejarError } from "@/lib/acciones";
import { leerExcel } from "@/lib/importacion/leer";
import { normalizar, validarFila, type Catalogos } from "@/lib/importacion/validar";
import { serviciosCosteados } from "@/lib/servicios";
import { construirAtencion, resolverPaciente } from "@/lib/atenciones/registro";
import type { DatosAtencion } from "@/lib/validaciones/atenciones";

export interface ResultadoImportacion {
  ok?: boolean;
  mensaje?: string;
  modo?: "validar" | "importar";
  totalFilas?: number;
  validas?: number;
  importadas?: number;
  errores?: { fila: number; mensajes: string[] }[];
  vistaPrevia?: { fila: number; fecha: string; paciente: string; servicio: string; cobrado: number }[];
}

const MAX_BYTES = 5 * 1024 * 1024;

export async function importarAtenciones(_p: ResultadoImportacion, f: FormData): Promise<ResultadoImportacion> {
  try {
    await exigirPermiso("registrarAtenciones");
    const modo = f.get("modo") === "importar" ? "importar" : "validar";
    const archivo = f.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, mensaje: "Seleccione un archivo Excel (.xlsx)." };
    if (!archivo.name.toLowerCase().endsWith(".xlsx")) return { ok: false, mensaje: "El archivo debe tener extensión .xlsx." };
    if (archivo.size > MAX_BYTES) return { ok: false, mensaje: "El archivo supera los 5 MB." };

    const { filas, error } = await leerExcel(await archivo.arrayBuffer());
    if (error) return { ok: false, mensaje: error };

    const [servicios, odontologos, config] = await Promise.all([
      serviciosCosteados(),
      prisma.odontologo.findMany(),
      obtenerConfiguracion(),
    ]);
    const cat: Catalogos = {
      servicios: new Map(servicios.map((s) => [normalizar(s.nombre), { id: s.id, precio: s.precio, activo: s.activo }])),
      odontologos: new Map(odontologos.map((o) => [normalizar(o.nombre), { id: o.id, activo: o.activo }])),
    };
    const porId = new Map(servicios.map((s) => [s.id, s]));

    const errores: ResultadoImportacion["errores"] = [];
    const validas: { fila: number; datos: DatosAtencion; data: ReturnType<typeof construirAtencion> & { ok: true } }[] = [];
    for (const { numero, valores } of filas) {
      const r = validarFila(valores, cat);
      if (!r.ok) {
        errores.push({ fila: numero, mensajes: r.errores });
        continue;
      }
      const c = construirAtencion(r.datos, porId.get(r.datos.servicioId)!, config.igvPorcentaje);
      if (!c.ok) {
        errores.push({ fila: numero, mensajes: Object.values(c.errores) });
        continue;
      }
      validas.push({ fila: numero, datos: r.datos, data: c });
    }

    const base: ResultadoImportacion = {
      modo,
      totalFilas: filas.length,
      validas: validas.length,
      errores: errores.slice(0, 200),
      vistaPrevia: validas.slice(0, 10).map((v) => ({
        fila: v.fila,
        fecha: v.datos.fecha,
        paciente: v.datos.pacienteNombre,
        servicio: porId.get(v.datos.servicioId)!.nombre,
        cobrado: Number(v.data.data.precioCobrado),
      })),
    };

    if (modo === "validar") {
      return {
        ...base,
        ok: errores.length === 0,
        mensaje: errores.length
          ? `${validas.length} de ${filas.length} filas son válidas. Corrija los errores o importe solo las filas válidas.`
          : `Las ${filas.length} filas son válidas. Ya puede importarlas.`,
      };
    }

    if (!validas.length) return { ...base, ok: false, mensaje: "No hay filas válidas para importar." };
    await prisma.$transaction(
      async (tx) => {
        for (const v of validas) {
          const pacienteId = await resolverPaciente(tx, v.datos.pacienteNombre, v.datos.pacienteDni);
          await tx.atencion.create({ data: { ...v.data.data, pacienteId } });
        }
      },
      { timeout: 120_000 },
    );
    revalidatePath("/atenciones");
    revalidatePath("/dashboard");
    revalidatePath("/reportes", "layout");
    return {
      ...base,
      ok: true,
      importadas: validas.length,
      mensaje: `Se importaron ${validas.length} atenciones.${errores.length ? ` Se omitieron ${errores.length} filas con errores.` : ""}`,
    };
  } catch (e) {
    const r = manejarError(e);
    return { ok: false, mensaje: r.mensaje };
  }
}
