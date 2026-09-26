import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { requerirSesion } from "@/lib/auth/sesion";
import { puede } from "@/lib/auth/permisos";
import { prisma } from "@/lib/db";
import { leerFiltros, type ParamsBusqueda } from "@/lib/filtros";
import { CANALES, ESTADOS_PAGO, METODOS_PAGO, TURNOS, type EstadoPagoKey } from "@/lib/constantes";
import { finDia, formatFecha, formatNumero, formatSoles, inicioDia, redondear } from "@/lib/formato";
import { Encabezado } from "@/components/ui/encabezado";
import { ContenedorTabla, FilaVacia } from "@/components/ui/tabla";
import { Insignia } from "@/components/ui/insignia";
import { Alerta } from "@/components/ui/alerta";

export const metadata: Metadata = { title: "Atenciones" };

const POR_PAGINA = 50;
const COLOR_ESTADO = { PAGADO: "verde", PARCIAL: "ambar", PENDIENTE: "rojo" } as const;

export default async function PaginaAtenciones({ searchParams }: { searchParams: Promise<ParamsBusqueda> }) {
  const sesion = await requerirSesion("verAtenciones");
  const registrar = puede(sesion.rol, "registrarAtenciones");
  const sp = await searchParams;
  const filtros = leerFiltros(sp, "mes");
  const esOdontologo = sesion.rol === "ODONTOLOGO";
  if (esOdontologo) filtros.odontologoId = sesion.odontologoId ?? -1;
  const estado = typeof sp.estado === "string" && sp.estado in ESTADOS_PAGO ? (sp.estado as EstadoPagoKey) : undefined;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  const where: Prisma.AtencionWhereInput = {
    fecha: { gte: inicioDia(filtros.desde), lte: finDia(filtros.hasta) },
    ...(filtros.odontologoId ? { odontologoId: filtros.odontologoId } : {}),
    ...(filtros.servicioId ? { servicioId: filtros.servicioId } : {}),
    ...(filtros.turno ? { turno: filtros.turno } : {}),
    ...(estado ? { estadoPago: estado } : {}),
    ...(q ? { paciente: { OR: [{ nombre: { contains: q } }, { dni: { contains: q } }] } } : {}),
  };

  const [total, sumas, filas, servicios, odontologos] = await Promise.all([
    prisma.atencion.count({ where }),
    prisma.atencion.aggregate({ where, _sum: { precioCobrado: true, montoPagado: true } }),
    prisma.atencion.findMany({
      where,
      include: { paciente: true, servicio: { select: { nombre: true } }, odontologo: { select: { nombre: true } } },
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.servicio.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.odontologo.findMany({ select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);
  const cobrado = sumas._sum.precioCobrado ?? 0;
  const pagado = sumas._sum.montoPagado ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  const enlacePagina = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && k !== "pagina") u.set(k, v);
    u.set("pagina", String(p));
    return `/atenciones?${u.toString()}`;
  };

  return (
    <>
      <Encabezado
        titulo={esOdontologo ? "Mis atenciones" : "Atenciones"}
        descripcion="Registro de servicios realizados y cobros."
        acciones={
          registrar && (
            <>
              <Link href="/atenciones/importar" className="btn btn-secundario">
                Importar desde Excel
              </Link>
              <Link href="/atenciones/nueva" className="btn btn-primario">
                + Registrar atención
              </Link>
            </>
          )
        }
      />
      {sp.registrada && <Alerta tipo="exito" className="mb-4">Atención registrada correctamente.</Alerta>}
      {sp.guardada && <Alerta tipo="exito" className="mb-4">Cambios guardados.</Alerta>}
      {sp.eliminada && <Alerta tipo="info" className="mb-4">Atención eliminada.</Alerta>}

      <form className="tarjeta mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <label className="text-sm">
          <span className="etiqueta">Desde</span>
          <input type="date" name="desde" defaultValue={filtros.desde} className="input" />
        </label>
        <label className="text-sm">
          <span className="etiqueta">Hasta</span>
          <input type="date" name="hasta" defaultValue={filtros.hasta} className="input" />
        </label>
        {!esOdontologo && (
          <label className="text-sm">
            <span className="etiqueta">Odontólogo</span>
            <select name="odontologo" defaultValue={filtros.odontologoId ?? ""} className="input">
              <option value="">Todos</option>
              {odontologos.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-sm">
          <span className="etiqueta">Servicio</span>
          <select name="servicio" defaultValue={filtros.servicioId ?? ""} className="input">
            <option value="">Todos</option>
            {servicios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="etiqueta">Estado de pago</span>
          <select name="estado" defaultValue={estado ?? ""} className="input">
            <option value="">Todos</option>
            {Object.entries(ESTADOS_PAGO).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="etiqueta">Paciente o DNI</span>
          <input name="q" defaultValue={q} className="input" placeholder="Buscar…" />
        </label>
        <div className="flex items-end gap-2">
          <button className="btn btn-primario flex-1">Filtrar</button>
          <Link href="/atenciones" className="btn btn-fantasma">
            Limpiar
          </Link>
        </div>
      </form>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Atenciones", formatNumero(total, 0)],
          ["Total cobrado", formatSoles(cobrado)],
          ["Total pagado", formatSoles(pagado)],
          ["Saldo por cobrar", formatSoles(redondear(cobrado - pagado))],
        ].map(([k, v]) => (
          <div key={k} className="tarjeta p-3">
            <p className="text-xs text-slate-500">{k}</p>
            <p className="text-lg font-bold tabular-nums">{v}</p>
          </div>
        ))}
      </div>

      <ContenedorTabla>
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Paciente</th>
              <th>Servicio</th>
              {!esOdontologo && <th>Odontólogo</th>}
              <th>Turno</th>
              <th className="num">Precio lista</th>
              <th className="num">Descuento</th>
              <th className="num">Cobrado</th>
              <th className="num">Pagado</th>
              <th>Estado</th>
              <th>Pago</th>
              <th>Canal</th>
              {registrar && <th />}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && <FilaVacia columnas={13} mensaje="No hay atenciones con estos filtros." />}
            {filas.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap">{formatFecha(a.fecha)}</td>
                <td>
                  <span className="font-medium">{a.paciente.nombre}</span>
                  {a.paciente.dni && <span className="block text-xs text-slate-500">DNI {a.paciente.dni}</span>}
                </td>
                <td>{a.servicio.nombre}</td>
                {!esOdontologo && <td className="whitespace-nowrap">{a.odontologo.nombre}</td>}
                <td>{TURNOS[a.turno]}</td>
                <td className="num">{formatSoles(a.precioLista)}</td>
                <td className="num">{a.descuento ? formatSoles(a.descuento) : "—"}</td>
                <td className="num font-medium">
                  {formatSoles(a.precioCobrado)}
                  {!a.incluyeIgv && <span className="block text-[10px] font-normal text-slate-400">sin IGV</span>}
                </td>
                <td className="num">{formatSoles(a.montoPagado)}</td>
                <td>
                  <Insignia color={COLOR_ESTADO[a.estadoPago]}>{ESTADOS_PAGO[a.estadoPago]}</Insignia>
                </td>
                <td className="whitespace-nowrap">{METODOS_PAGO[a.metodoPago]}</td>
                <td className="whitespace-nowrap">{CANALES[a.canal]}</td>
                {registrar && (
                  <td>
                    <Link href={`/atenciones/${a.id}`} className="btn btn-sm btn-fantasma text-marca-700">
                      {a.estadoPago === "PAGADO" ? "Editar" : "Cobrar / editar"}
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </ContenedorTabla>

      {paginas > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginación">
          <span className="text-slate-500">
            Página {pagina} de {paginas}
          </span>
          <div className="flex gap-2">
            {pagina > 1 && (
              <Link href={enlacePagina(pagina - 1)} className="btn btn-secundario btn-sm">
                ‹ Anterior
              </Link>
            )}
            {pagina < paginas && (
              <Link href={enlacePagina(pagina + 1)} className="btn btn-secundario btn-sm">
                Siguiente ›
              </Link>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
