/**
 * Carga datos de ejemplo: catálogo, fichas técnicas, gastos indirectos,
 * usuarios y ~6 meses de atenciones realistas.
 *
 * Uso: npm run db:seed   (borra y vuelve a crear todos los datos)
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calcularCostoDirecto, ingresoNeto, minutosSillon } from "../src/lib/costeo";
import { fechaISO, periodosEntre, redondear } from "../src/lib/formato";
import { claveTexto } from "../src/lib/libro/normalizar";
import {
  APELLIDOS, EQUIPOS, GASTOS_BASE, MATERIALES, NOMBRES, ODONTOLOGOS, SERVICIOS, type ClaveOdontologo,
} from "./seed-data";

const prisma = new PrismaClient();

// Generador pseudoaleatorio con semilla fija: el seed siempre produce los mismos datos.
function mulberry32(semilla: number) {
  return () => {
    semilla |= 0;
    semilla = (semilla + 0x6d2b79f5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260926);
const entre = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
const elegir = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];
function elegirPonderado<T>(items: readonly T[], peso: (i: T) => number): T {
  const total = items.reduce((s, i) => s + peso(i), 0);
  let r = rnd() * total;
  for (const i of items) {
    r -= peso(i);
    if (r <= 0) return i;
  }
  return items[items.length - 1];
}

async function limpiar() {
  await prisma.gasto.deleteMany();
  await prisma.tipoGasto.deleteMany();
  await prisma.ingreso.deleteMany();
  await prisma.inicio.deleteMany();
  await prisma.meta.deleteMany();
  await prisma.permiso.deleteMany();
  await prisma.atencion.deleteMany();
  await prisma.paciente.deleteMany();
  await prisma.gastoIndirecto.deleteMany();
  await prisma.fichaMaterial.deleteMany();
  await prisma.fichaManoObra.deleteMany();
  await prisma.fichaEquipo.deleteMany();
  await prisma.fichaTercerizado.deleteMany();
  await prisma.servicio.deleteMany();
  await prisma.material.deleteMany();
  await prisma.equipo.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.odontologo.deleteMany();
  await prisma.configuracion.deleteMany();
  // Reinicia los autoincrementales (solo SQLite) para que los IDs empiecen en 1
  await prisma.$executeRawUnsafe("DELETE FROM sqlite_sequence").catch(() => {});
}

async function main() {
  console.log("Limpiando base de datos…");
  await limpiar();

  await prisma.configuracion.create({
    data: {
      id: 1,
      nombreClinica: "Clínica Dental Sonrisa Perú",
      ruc: "20601234567",
      direccion: "Av. Javier Prado Este 1234, San Isidro, Lima",
      metodoProrrateo: "MINUTOS",
      igvPorcentaje: 0.18,
      margenMinimo: 0.2,
    },
  });

  // Catálogos
  await prisma.material.createMany({ data: MATERIALES });
  await prisma.equipo.createMany({ data: EQUIPOS });
  const materiales = new Map((await prisma.material.findMany()).map((m) => [m.nombre, m]));
  const equipos = new Map((await prisma.equipo.findMany()).map((e) => [e.nombre, e]));

  // Odontólogos y usuarios
  const odontologos = new Map<ClaveOdontologo, number>();
  for (const o of ODONTOLOGOS) {
    const creado = await prisma.odontologo.create({
      data: { nombre: o.nombre, especialidad: o.especialidad, cop: o.cop },
    });
    odontologos.set(o.clave, creado.id);
  }
  const hash = (p: string) => bcrypt.hashSync(p, 10);
  await prisma.usuario.createMany({
    data: [
      { nombre: "Administrador", email: "admin@clinica.pe", passwordHash: hash("admin123"), rol: "ADMIN" },
      { nombre: "Rosa Paredes (Caja)", email: "caja@clinica.pe", passwordHash: hash("caja123"), rol: "CAJA" },
      ...ODONTOLOGOS.map((o) => ({
        nombre: o.nombre,
        email: o.email,
        passwordHash: hash("odonto123"),
        rol: "ODONTOLOGO" as const,
        odontologoId: odontologos.get(o.clave)!,
      })),
    ],
  });

  // Servicios con ficha técnica
  const servicios: { id: number; seed: (typeof SERVICIOS)[number]; costoDirecto: number; minutos: number }[] = [];
  for (const s of SERVICIOS) {
    const mat = (nombre: string) => {
      const m = materiales.get(nombre);
      if (!m) throw new Error(`Material no encontrado en el catálogo: ${nombre}`);
      return m;
    };
    const eq = (nombre: string) => {
      const e = equipos.get(nombre);
      if (!e) throw new Error(`Equipo no encontrado en el catálogo: ${nombre}`);
      return e;
    };
    // Agrupa materiales repetidos (p. ej. bioseguridad + gasas adicionales)
    const matAgrupados = new Map<string, number>();
    for (const [n, c] of s.materiales) matAgrupados.set(n, (matAgrupados.get(n) ?? 0) + c);

    const creado = await prisma.servicio.create({
      data: {
        nombre: s.nombre,
        categoria: s.categoria,
        precio: s.precio,
        duracionMin: s.duracionMin,
        sesiones: s.sesiones,
        costoEsterilizacion: s.costoEsterilizacion,
        materiales: { create: [...matAgrupados].map(([n, cantidad]) => ({ materialId: mat(n).id, cantidad })) },
        manoObra: { create: s.manoObra },
        equipos: { create: s.equipos.map(([n, minutosUso]) => ({ equipoId: eq(n).id, minutosUso })) },
        tercerizados: { create: s.tercerizados },
      },
    });
    const directo = calcularCostoDirecto({
      materiales: [...matAgrupados].map(([n, cantidad]) => ({ cantidad, costoUnitario: mat(n).costoUnitario })),
      manoObra: s.manoObra,
      equipos: s.equipos.map(([n, minutosUso]) => ({ minutosUso, ...eq(n) })),
      tercerizados: s.tercerizados,
      costoEsterilizacion: s.costoEsterilizacion,
    });
    servicios.push({ id: creado.id, seed: s, costoDirecto: directo.total, minutos: minutosSillon(s.duracionMin, s.sesiones) });
  }

  // Rango: desde el primer día de hace 5 meses hasta hoy (≈ 6 meses)
  const hoy = new Date();
  const hoyISO = fechaISO(hoy);
  const [a, m] = hoyISO.split("-").map(Number);
  const inicio = new Date(Date.UTC(a, m - 1 - 5, 1));
  const inicioISO = inicio.toISOString().slice(0, 10);
  const periodos = periodosEntre(inicioISO, hoyISO);

  // Gastos indirectos de cada mes
  const gastos: Prisma.GastoIndirectoCreateManyInput[] = [];
  for (const periodo of periodos) {
    for (const g of GASTOS_BASE) {
      const factor = 1 + (rnd() * 2 - 1) * g.variacion;
      gastos.push({ periodo, categoria: g.categoria, descripcion: g.descripcion, monto: redondear(g.monto * factor) });
    }
  }
  await prisma.gastoIndirecto.createMany({ data: gastos });

  // Pacientes
  const pacientes: Prisma.PacienteCreateManyInput[] = [];
  const dnis = new Set<string>();
  for (let i = 0; i < 750; i++) {
    const nombre = `${elegir(NOMBRES)} ${elegir(APELLIDOS)} ${elegir(APELLIDOS)}`;
    let dni: string | null = null;
    if (rnd() < 0.75) {
      do dni = String(entre(10000000, 79999999));
      while (dnis.has(dni));
      dnis.add(dni);
    }
    pacientes.push({ nombre, dni });
  }
  await prisma.paciente.createMany({ data: pacientes });
  const idsPacientes = (await prisma.paciente.findMany({ select: { id: true } })).map((p) => p.id);
  const pacientesOrtodoncia = idsPacientes.slice(0, 45); // pacientes con tratamiento mensual

  // Atenciones
  const atenciones: Prisma.AtencionCreateManyInput[] = [];
  const canales = [
    { v: "TELEMARKETING", p: 25 }, { v: "REDES_SOCIALES", p: 30 }, { v: "REFERIDO", p: 25 },
    { v: "PASANTE", p: 15 }, { v: "OTRO", p: 5 },
  ] as const;
  const pagos = [
    { v: "EFECTIVO", p: 35 }, { v: "TARJETA", p: 25 }, { v: "YAPE_PLIN", p: 30 }, { v: "TRANSFERENCIA", p: 10 },
  ] as const;

  const diasTotales = Math.round((new Date(`${hoyISO}T00:00:00Z`).getTime() - inicio.getTime()) / 86400000);
  for (let d = 0; d <= diasTotales; d++) {
    const dia = new Date(inicio.getTime() + d * 86400000);
    const diaSemana = dia.getUTCDay(); // 0 = domingo
    if (diaSemana === 0) continue;
    const iso = dia.toISOString().slice(0, 10);
    const mesIndice = periodos.indexOf(iso.slice(0, 7));
    const crecimiento = 1 + mesIndice * 0.035; // la clínica crece ~3.5 % mensual
    const base = diaSemana === 6 ? 6 : 12;
    const n = Math.max(2, Math.round(base * crecimiento + (rnd() * 4 - 2)));
    const diasDesdeHoy = diasTotales - d;

    for (let i = 0; i < n; i++) {
      const s = elegirPonderado(servicios, (x) => x.seed.peso);
      const odontologo = s.seed.odontologos.length > 1 && rnd() < 0.3 ? s.seed.odontologos[1] : s.seed.odontologos[0];
      const turno = rnd() < 0.55 ? "MANANA" : "TARDE";
      const hora = turno === "MANANA" ? entre(9, 12) : entre(15, 19);
      const fecha = new Date(`${iso}T${String(hora).padStart(2, "0")}:${String(entre(0, 3) * 15).padStart(2, "0")}:00-05:00`);

      const canal = elegirPonderado(canales, (c) => c.p).v;
      const precioLista = s.seed.precio;
      const probDescuento = canal === "TELEMARKETING" ? 0.4 : 0.12;
      const descuento = rnd() < probDescuento ? Math.round(precioLista * elegir([0.05, 0.1, 0.15])) : 0;
      const precioCobrado = precioLista - descuento;
      const incluyeIgv = rnd() < 0.85;

      // Los tratamientos caros y recientes tienen más saldos pendientes
      const r = rnd();
      const probPendiente = diasDesdeHoy < 20 ? (precioCobrado >= 600 ? 0.35 : 0.1) : 0.03;
      const estadoPago = r < probPendiente / 2 ? "PENDIENTE" : r < probPendiente ? "PARCIAL" : "PAGADO";
      const montoPagado =
        estadoPago === "PAGADO" ? precioCobrado : estadoPago === "PARCIAL" ? redondear(precioCobrado * 0.5) : 0;

      atenciones.push({
        fecha,
        pacienteId: s.seed.categoria === "ORTODONCIA" ? elegir(pacientesOrtodoncia) : elegir(idsPacientes),
        servicioId: s.id,
        odontologoId: odontologos.get(odontologo)!,
        turno,
        precioLista,
        descuento,
        precioCobrado,
        incluyeIgv,
        ingresoNeto: ingresoNeto(precioCobrado, incluyeIgv),
        metodoPago: elegirPonderado(pagos, (p) => p.p).v,
        estadoPago,
        montoPagado,
        canal,
        costoDirectoSnapshot: s.costoDirecto,
        minutosSnapshot: s.minutos,
      });
    }
  }
  await prisma.atencion.createMany({ data: atenciones });

  // ───── Libro contable de ejemplo (datos ficticios derivados de las atenciones) ─────
  const pacientesPorId = new Map((await prisma.paciente.findMany()).map((p) => [p.id, p.nombre]));
  const categoriaServicio = new Map(servicios.map((s) => [s.id, s.seed.categoria]));
  const MEDIO: Record<string, string> = { EFECTIVO: "EFECTIVO", TARJETA: "TARJETA", YAPE_PLIN: "DEPOSITO", TRANSFERENCIA: "DEPOSITO" };
  let ticket = 20000;
  const ingresos: Prisma.IngresoCreateManyInput[] = atenciones
    .filter((a) => (a.montoPagado as number) > 0)
    .map((a) => {
      const nombre = pacientesPorId.get(a.pacienteId as number)!;
      ticket++;
      return {
        fecha: a.fecha as Date, ticket, paciente: nombre, pacienteClave: claveTexto(nombre), monto: a.montoPagado as number,
        medioPago: MEDIO[a.metodoPago as string], especialidad: categoriaServicio.get(a.servicioId as number) === "ORTODONCIA" ? "ORTODONCIA" : "ODONTOLOGIA",
        origen: "Datos de ejemplo", huella: `ejemplo-i-${ticket}`,
      };
    });
  await prisma.ingreso.createMany({ data: ingresos });

  const tiposLibro: [string, "DIRECTO_ORTODONCIA" | "DIRECTO_ODONTOLOGIA" | "DIRECTO_COMPARTIDO" | "INDIRECTO" | "NO_OPERATIVO"][] = [
    ["ORTODONCISTA", "DIRECTO_ORTODONCIA"], ["LABORATORIO ORTODONCIA", "DIRECTO_ORTODONCIA"], ["ODONTOLOGO", "DIRECTO_ODONTOLOGIA"],
    ["CIRUJANO", "DIRECTO_ODONTOLOGIA"], ["LABORATORIO ODONTOLOGIA", "DIRECTO_ODONTOLOGIA"], ["MATERIALES", "DIRECTO_COMPARTIDO"],
    ["RAYDENT", "DIRECTO_COMPARTIDO"], ["SUELDO", "INDIRECTO"], ["ALQUILER", "INDIRECTO"], ["LUZ", "INDIRECTO"], ["AGUA", "INDIRECTO"],
    ["TELEFONIA E INTERNET", "INDIRECTO"], ["PUBLICIDAD", "INDIRECTO"], ["IMPUESTOS", "INDIRECTO"], ["LIMPIEZA", "INDIRECTO"],
    ["OTROS", "INDIRECTO"], ["RETIRO DE UTILIDAD", "NO_OPERATIVO"],
  ];
  const idTipo = new Map<string, number>();
  for (const [nombre, destino] of tiposLibro) idTipo.set(nombre, (await prisma.tipoGasto.create({ data: { nombre, destino } })).id);
  const TIPO_DE_CATEGORIA: Record<string, string> = {
    ALQUILER: "ALQUILER", LUZ: "LUZ", AGUA: "AGUA", INTERNET_TELEFONO: "TELEFONIA E INTERNET", SUELDOS_ADMINISTRATIVOS: "SUELDO",
    MARKETING: "PUBLICIDAD", LIMPIEZA: "LIMPIEZA", CONTABILIDAD: "OTROS", SOFTWARE: "OTROS", MANTENIMIENTO: "OTROS", SEGUROS: "OTROS", LICENCIAS: "IMPUESTOS", OTROS: "OTROS",
  };
  const gastosLibro: Prisma.GastoCreateManyInput[] = [];
  let nGasto = 0;
  const agregarGasto = (fecha: Date, descripcion: string, monto: number, tipo: string) =>
    gastosLibro.push({
      fecha, descripcion, monto: redondear(monto), tipoGastoId: idTipo.get(tipo)!, tipoOriginal: tipo, medioPago: rnd() < 0.5 ? "EFECTIVO" : "DEPOSITO",
      comprobante: "RECIBO", numero: String(4000 + ++nGasto), origen: "Datos de ejemplo", huella: `ejemplo-g-${nGasto}`,
    });
  for (const g of gastos) agregarGasto(new Date(`${g.periodo}-05T12:00:00-05:00`), g.descripcion as string, g.monto as number, TIPO_DE_CATEGORIA[g.categoria as string]);
  for (const periodo of periodos) {
    const delMes = ingresos.filter((i) => fechaISO(i.fecha as Date).startsWith(periodo));
    const orto = delMes.filter((i) => i.especialidad === "ORTODONCIA").reduce((s, i) => s + (i.monto as number), 0);
    const odo = delMes.filter((i) => i.especialidad === "ODONTOLOGIA").reduce((s, i) => s + (i.monto as number), 0);
    for (let q = 0; q < 4; q++) {
      const f = new Date(`${periodo}-${String(7 + q * 7).padStart(2, "0")}T12:00:00-05:00`);
      agregarGasto(f, "TURNOS ORTODONCISTA SEMANA", (orto * 0.22) / 4, "ORTODONCISTA");
      agregarGasto(f, "TURNOS ODONTOLOGO SEMANA", (odo * 0.18) / 4, "ODONTOLOGO");
      agregarGasto(f, "COMPRA DE MATERIALES", ((orto + odo) * 0.07) / 4, "MATERIALES");
      agregarGasto(f, "RAX PACIENTES", ((orto + odo) * 0.02) / 4, "RAYDENT");
    }
    agregarGasto(new Date(`${periodo}-20T12:00:00-05:00`), "LABORATORIO BRACKETS Y CONTENCIONES", orto * 0.04, "LABORATORIO ORTODONCIA");
    agregarGasto(new Date(`${periodo}-20T12:00:00-05:00`), "LABORATORIO CORONAS", odo * 0.05, "LABORATORIO ODONTOLOGIA");
    agregarGasto(new Date(`${periodo}-22T12:00:00-05:00`), "HONORARIOS CIRUJANO", odo * 0.04, "CIRUJANO");
    agregarGasto(new Date(`${periodo}-28T12:00:00-05:00`), "RETIRO DE UTILIDAD SOCIOS", 3000, "RETIRO DE UTILIDAD");
  }
  await prisma.gasto.createMany({ data: gastosLibro });

  // Inicios: primera atención de cada paciente, con una asesora
  const vistos = new Set<number>();
  const iniciosLibro: Prisma.InicioCreateManyInput[] = [];
  for (const a of atenciones) {
    const pid = a.pacienteId as number;
    if (vistos.has(pid) || a.canal === "PASANTE") continue;
    vistos.add(pid);
    const nombre = pacientesPorId.get(pid)!;
    iniciosLibro.push({ fecha: a.fecha as Date, paciente: nombre, pacienteClave: claveTexto(nombre), asesora: elegir(["KARLA", "DIANA", "ELISA"]), cantidad: 1, origen: "Datos de ejemplo", huella: `ejemplo-n-${pid}` });
  }
  await prisma.inicio.createMany({ data: iniciosLibro });
  await prisma.meta.createMany({
    data: periodos.flatMap((periodo, i) => [
      { periodo, indicador: "ORTODONCIA" as const, valor: 9000 + i * 200 },
      { periodo, indicador: "ODONTOLOGIA" as const, valor: 62000 + i * 800 },
      { periodo, indicador: "INICIOS" as const, valor: 90 },
      { periodo, indicador: "UTILIDAD" as const, valor: 15000 },
    ]),
  });
  const enDias = (d: number) => new Date(Date.now() + d * 86_400_000);
  await prisma.permiso.createMany({
    data: [
      { detalle: "Licencia municipal de funcionamiento", vencimiento: null, notas: "Indeterminado" },
      { detalle: "Certificado de Defensa Civil (ITSE)", vencimiento: enDias(220) },
      { detalle: "Autorización sanitaria (MINSA / DIRIS)", vencimiento: enDias(35) },
      { detalle: "Recarga de extintores", vencimiento: enDias(150) },
      { detalle: "Saneamiento ambiental (fumigación)", vencimiento: enDias(-20) },
      { detalle: "Pozo a tierra", vencimiento: enDias(300) },
    ],
  });
  console.log(`✔ Libro contable de ejemplo: ${ingresos.length} ingresos, ${gastosLibro.length} gastos, ${iniciosLibro.length} inicios`);

  console.log(`✔ ${MATERIALES.length} materiales, ${EQUIPOS.length} equipos, ${SERVICIOS.length} servicios con ficha técnica`);
  console.log(`✔ ${ODONTOLOGOS.length} odontólogos, ${ODONTOLOGOS.length + 2} usuarios`);
  console.log(`✔ ${gastos.length} gastos indirectos (${periodos[0]} a ${periodos[periodos.length - 1]})`);
  console.log(`✔ ${pacientes.length} pacientes, ${atenciones.length} atenciones`);
  console.log("\nCostos directos por atención:");
  for (const s of servicios) {
    console.log(`  ${s.seed.nombre.padEnd(30)} precio S/ ${s.seed.precio.toFixed(2).padStart(8)}  costo directo S/ ${s.costoDirecto.toFixed(2).padStart(8)}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
