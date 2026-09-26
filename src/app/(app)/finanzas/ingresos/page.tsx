import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { requerirSesion } from "@/lib/auth/sesion";
import { prisma } from "@/lib/db";
import { leerRango, periodosDisponibles } from "@/lib/libro/datos";
import { claveTexto } from "@/lib/libro/normalizar";
import { finDia, formatFecha, formatNumero, formatSoles, inicioDia } from "@/lib/formato";
import type { ParamsBusqueda } from "@/lib/filtros";
import { Encabezado } from "@/components/ui/encabezado";
import { Insignia } from "@/components/ui/insignia";
import { ContenedorTabla, FilaVacia } from "@/components/ui/tabla";
import { FiltroRango } from "@/components/finanzas/filtro-rango";
import { Paginacion } from "@/components/finanzas/paginacion";

export const metadata: Metadata = { title: "Ingresos" };
const POR_PAGINA = 100;
const ultimoDia = (p: string) => new Date(Date.UTC(Number(p.slice(0, 4)), Number(p.slice(5)), 0)).toISOString().slice(0, 10);

export default async function Ingresos({ searchParams }: { searchParams: Promise<ParamsBusqueda> }) {
  await requerirSesion("verCostos");
  const sp = await searchParams;
  const disponibles = await periodosDisponibles();
  const r = leerRango(sp, disponibles);
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const esp = sp.especialidad === "ORTODONCIA" || sp.especialidad === "ODONTOLOGIA" ? sp.especialidad : undefined;
  const medio = typeof sp.medio === "string" && sp.medio ? sp.medio : undefined;
  const repetidos = sp.repetidos === "1";
  const pagina = Math.max(1, Number(sp.pagina) || 1);
  const qNum = /^\d+$/.test(q) ? Number(q) : null;
  const where: Prisma.IngresoWhereInput = {
    fecha: { gte: inicioDia(`${r.desde}-01`), lte: finDia(ultimoDia(r.hasta)) },
    ...(esp ? { especialidad: esp } : {}),
    ...(medio ? { medioPago: medio } : {}),
    ...(repetidos ? { ticketRepetido: true } : {}),
    ...(q ? { OR: [{ pacienteClave: { contains: claveTexto(q) } }, ...(qNum !== null ? [{ ticket: qNum }] : [])] } : {}),
  };
  const [total, suma, filas, medios] = await Promise.all([
    prisma.ingreso.count({ where }),
    prisma.ingreso.aggregate({ where, _sum: { monto: true } }),
    prisma.ingreso.findMany({ where, orderBy: [{ fecha: "desc" }, { ticket: "desc" }], skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA }),
    prisma.ingreso.groupBy({ by: ["medioPago"], orderBy: { medioPago: "asc" } }),
  ]);

  return (
    <>
      <Encabezado titulo="Ingresos (libro de caja)" descripcion="Cobros importados del libro contable. Busque por paciente o número de ticket." />
      {disponibles.length > 0 && <FiltroRango desde={r.desde} hasta={r.hasta} disponibles={disponibles} rango={r.rango} />}
      <form className="tarjeta mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input type="hidden" name="desde" value={r.desde} />
        <input type="hidden" name="hasta" value={r.hasta} />
        <label className="text-xs text-slate-500">
          Paciente o ticket
          <input name="q" defaultValue={q} className="input mt-0.5" placeholder="Buscar…" />
        </label>
        <label className="text-xs text-slate-500">
          Especialidad
          <select name="especialidad" defaultValue={esp ?? ""} className="input mt-0.5">
            <option value="">Ambas</option>
            <option value="ORTODONCIA">Ortodoncia</option>
            <option value="ODONTOLOGIA">Odontología</option>
          </select>
        </label>
        <label className="text-xs text-slate-500">
          Medio de pago
          <select name="medio" defaultValue={medio ?? ""} className="input mt-0.5">
            <option value="">Todos</option>
            {medios.map((m) => (
              <option key={m.medioPago} value={m.medioPago}>
                {m.medioPago}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="repetidos" value="1" defaultChecked={repetidos} className="h-4 w-4 accent-marca-600" />
          Solo tickets repetidos
        </label>
        <button className="btn btn-primario self-end">Filtrar</button>
      </form>
      <p className="mb-2 text-sm text-slate-600">
        <b>{formatNumero(total, 0)}</b> cobros · <b>{formatSoles(suma._sum.monto ?? 0)}</b>
      </p>
      <ContenedorTabla>
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th className="num">Ticket</th>
              <th>Paciente</th>
              <th>Especialidad</th>
              <th>Medio de pago</th>
              <th className="num">Monto</th>
              <th>Observación</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && <FilaVacia columnas={7} mensaje="No hay cobros con estos filtros." />}
            {filas.map((x) => (
              <tr key={x.id}>
                <td className="whitespace-nowrap">{formatFecha(x.fecha)}</td>
                <td className="num">{x.ticket ?? "—"}</td>
                <td>{x.paciente}</td>
                <td>{x.especialidad === "ORTODONCIA" ? "Ortodoncia" : "Odontología"}</td>
                <td>{x.medioPago}</td>
                <td className="num">{formatSoles(x.monto)}</td>
                <td className="text-xs">
                  {x.ticketRepetido && <Insignia color="ambar">Ticket repetido</Insignia>}{" "}
                  {x.correccion && <span className="text-slate-500">{x.correccion}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ContenedorTabla>
      <Paginacion pagina={pagina} total={total} porPagina={POR_PAGINA} base="/finanzas/ingresos" params={sp} />
    </>
  );
}
