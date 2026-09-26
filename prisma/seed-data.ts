/**
 * Datos de ejemplo realistas para una clínica dental en Lima (precios en soles, 2026).
 */

export const MATERIALES: { nombre: string; unidad: string; costoUnitario: number }[] = [
  { nombre: "Anestesia lidocaína 2% (carpule)", unidad: "carpule", costoUnitario: 2.5 },
  { nombre: "Aguja dental corta", unidad: "unidad", costoUnitario: 0.6 },
  { nombre: "Guantes de nitrilo", unidad: "par", costoUnitario: 0.7 },
  { nombre: "Mascarilla quirúrgica", unidad: "unidad", costoUnitario: 0.3 },
  { nombre: "Gorro descartable", unidad: "unidad", costoUnitario: 0.2 },
  { nombre: "Babero descartable", unidad: "unidad", costoUnitario: 0.25 },
  { nombre: "Campo quirúrgico descartable", unidad: "unidad", costoUnitario: 1.5 },
  { nombre: "Eyector de saliva", unidad: "unidad", costoUnitario: 0.2 },
  { nombre: "Gasas estériles", unidad: "unidad", costoUnitario: 0.1 },
  { nombre: "Rollos de algodón", unidad: "unidad", costoUnitario: 0.05 },
  { nombre: "Vaso descartable", unidad: "unidad", costoUnitario: 0.1 },
  { nombre: "Pasta profiláctica", unidad: "g", costoUnitario: 0.4 },
  { nombre: "Copa de profilaxis", unidad: "unidad", costoUnitario: 1.2 },
  { nombre: "Flúor gel", unidad: "ml", costoUnitario: 0.5 },
  { nombre: "Punta de ultrasonido (desgaste)", unidad: "unidad", costoUnitario: 60 },
  { nombre: "Resina compuesta", unidad: "g", costoUnitario: 12 },
  { nombre: "Ácido grabador 37%", unidad: "ml", costoUnitario: 3 },
  { nombre: "Adhesivo universal", unidad: "ml", costoUnitario: 25 },
  { nombre: "Fresa diamantada", unidad: "unidad", costoUnitario: 5 },
  { nombre: "Tira matriz y cuña", unidad: "unidad", costoUnitario: 0.5 },
  { nombre: "Limas endodónticas (juego)", unidad: "juego", costoUnitario: 45 },
  { nombre: "Hipoclorito de sodio 5%", unidad: "ml", costoUnitario: 0.02 },
  { nombre: "Conos de gutapercha", unidad: "unidad", costoUnitario: 0.3 },
  { nombre: "Conos de papel", unidad: "unidad", costoUnitario: 0.1 },
  { nombre: "Cemento sellador endodóntico", unidad: "g", costoUnitario: 4 },
  { nombre: "Radiografía periapical (película)", unidad: "unidad", costoUnitario: 3 },
  { nombre: "Sutura seda 3/0", unidad: "unidad", costoUnitario: 8 },
  { nombre: "Esponja hemostática", unidad: "unidad", costoUnitario: 6 },
  { nombre: "Kit de blanqueamiento en consultorio", unidad: "kit", costoUnitario: 180 },
  { nombre: "Ligaduras elásticas", unidad: "unidad", costoUnitario: 0.2 },
  { nombre: "Arco NiTi", unidad: "unidad", costoUnitario: 8 },
  { nombre: "Silicona de impresión", unidad: "g", costoUnitario: 0.6 },
  { nombre: "Cemento definitivo", unidad: "g", costoUnitario: 6 },
  { nombre: "Acrílico para provisional", unidad: "g", costoUnitario: 1.5 },
  { nombre: "Hilo retractor", unidad: "cm", costoUnitario: 0.3 },
  { nombre: "Implante dental (fijación)", unidad: "unidad", costoUnitario: 850 },
  { nombre: "Pilar protésico", unidad: "unidad", costoUnitario: 250 },
];

export const EQUIPOS: { nombre: string; costoAdquisicion: number; vidaUtilHoras: number }[] = [
  { nombre: "Unidad dental (sillón)", costoAdquisicion: 25000, vidaUtilHoras: 20000 },
  { nombre: "Compresor dental", costoAdquisicion: 4000, vidaUtilHoras: 15000 },
  { nombre: "Lámpara de fotocurado", costoAdquisicion: 1200, vidaUtilHoras: 3000 },
  { nombre: "Pieza de mano de alta velocidad", costoAdquisicion: 1500, vidaUtilHoras: 1500 },
  { nombre: "Micromotor y contraángulo", costoAdquisicion: 1800, vidaUtilHoras: 2000 },
  { nombre: "Cavitador ultrasónico", costoAdquisicion: 2500, vidaUtilHoras: 3000 },
  { nombre: "Localizador de ápices", costoAdquisicion: 2500, vidaUtilHoras: 3000 },
  { nombre: "Motor de endodoncia", costoAdquisicion: 3500, vidaUtilHoras: 3000 },
  { nombre: "Equipo de rayos X portátil", costoAdquisicion: 6000, vidaUtilHoras: 5000 },
  { nombre: "Lámpara de blanqueamiento", costoAdquisicion: 3000, vidaUtilHoras: 2000 },
  { nombre: "Motor de implantes", costoAdquisicion: 12000, vidaUtilHoras: 3000 },
];

export const ODONTOLOGOS = [
  { clave: "general", nombre: "Dra. Ana Torres Salazar", especialidad: "Odontología general", cop: "COP 25841", email: "ana.torres@clinica.pe" },
  { clave: "endo", nombre: "Dr. Luis Quispe Mamani", especialidad: "Endodoncia", cop: "COP 19327", email: "luis.quispe@clinica.pe" },
  { clave: "orto", nombre: "Dra. María Rojas Vega", especialidad: "Ortodoncia", cop: "COP 21456", email: "maria.rojas@clinica.pe" },
  { clave: "cirugia", nombre: "Dr. Carlos Mendoza Ríos", especialidad: "Cirugía e implantología", cop: "COP 17602", email: "carlos.mendoza@clinica.pe" },
] as const;
export type ClaveOdontologo = (typeof ODONTOLOGOS)[number]["clave"];

type Categoria =
  | "PREVENTIVA" | "RESTAURADORA" | "ENDODONCIA" | "CIRUGIA"
  | "ORTODONCIA" | "ESTETICA" | "PROTESIS" | "IMPLANTOLOGIA";

export interface ServicioSeed {
  nombre: string;
  categoria: Categoria;
  precio: number;
  duracionMin: number;
  sesiones: number;
  costoEsterilizacion: number;
  /** Peso relativo en la mezcla de ventas */
  peso: number;
  /** Odontólogos que lo realizan (el primero es el principal) */
  odontologos: ClaveOdontologo[];
  materiales: [string, number][];
  manoObra: { rol: "ODONTOLOGO" | "ASISTENTE"; minutos: number; costoHora: number }[];
  equipos: [string, number][];
  tercerizados: { tipo: "LABORATORIO" | "RADIOGRAFIA_EXTERNA"; descripcion: string; costo: number }[];
}

/** Bioseguridad básica que se usa en toda atención */
const BIOSEGURIDAD: [string, number][] = [
  ["Guantes de nitrilo", 2],
  ["Mascarilla quirúrgica", 2],
  ["Gorro descartable", 2],
  ["Babero descartable", 1],
  ["Vaso descartable", 1],
  ["Eyector de saliva", 1],
];

const ASISTENTE = 10; // S/ por hora
const GENERAL = 40;
const ESPECIALISTA = 70;
const IMPLANTOLOGO = 100;

export const SERVICIOS: ServicioSeed[] = [
  {
    nombre: "Profilaxis", categoria: "PREVENTIVA", precio: 90, duracionMin: 30, sesiones: 1, costoEsterilizacion: 3,
    peso: 18, odontologos: ["general"],
    materiales: [...BIOSEGURIDAD, ["Pasta profiláctica", 3], ["Copa de profilaxis", 1], ["Flúor gel", 2], ["Rollos de algodón", 2]],
    manoObra: [{ rol: "ODONTOLOGO", minutos: 30, costoHora: GENERAL }, { rol: "ASISTENTE", minutos: 30, costoHora: ASISTENTE }],
    equipos: [["Unidad dental (sillón)", 30], ["Compresor dental", 30], ["Micromotor y contraángulo", 15]],
    tercerizados: [],
  },
  {
    nombre: "Destartraje", categoria: "PREVENTIVA", precio: 150, duracionMin: 45, sesiones: 1, costoEsterilizacion: 4,
    peso: 10, odontologos: ["general"],
    materiales: [...BIOSEGURIDAD, ["Punta de ultrasonido (desgaste)", 0.02], ["Pasta profiláctica", 3], ["Gasas estériles", 4], ["Rollos de algodón", 2]],
    manoObra: [{ rol: "ODONTOLOGO", minutos: 45, costoHora: GENERAL }, { rol: "ASISTENTE", minutos: 45, costoHora: ASISTENTE }],
    equipos: [["Unidad dental (sillón)", 45], ["Compresor dental", 45], ["Cavitador ultrasónico", 30]],
    tercerizados: [],
  },
  {
    nombre: "Resina simple", categoria: "RESTAURADORA", precio: 120, duracionMin: 30, sesiones: 1, costoEsterilizacion: 4,
    peso: 14, odontologos: ["general", "endo"],
    materiales: [
      ...BIOSEGURIDAD, ["Anestesia lidocaína 2% (carpule)", 1], ["Aguja dental corta", 1], ["Resina compuesta", 0.3],
      ["Ácido grabador 37%", 0.1], ["Adhesivo universal", 0.05], ["Fresa diamantada", 0.2], ["Tira matriz y cuña", 1], ["Rollos de algodón", 4],
    ],
    manoObra: [{ rol: "ODONTOLOGO", minutos: 30, costoHora: GENERAL }, { rol: "ASISTENTE", minutos: 30, costoHora: ASISTENTE }],
    equipos: [["Unidad dental (sillón)", 30], ["Compresor dental", 30], ["Pieza de mano de alta velocidad", 10], ["Lámpara de fotocurado", 3]],
    tercerizados: [],
  },
  {
    nombre: "Resina compuesta", categoria: "RESTAURADORA", precio: 180, duracionMin: 45, sesiones: 1, costoEsterilizacion: 4,
    peso: 12, odontologos: ["general", "endo"],
    materiales: [
      ...BIOSEGURIDAD, ["Anestesia lidocaína 2% (carpule)", 1], ["Aguja dental corta", 1], ["Resina compuesta", 0.7],
      ["Ácido grabador 37%", 0.15], ["Adhesivo universal", 0.08], ["Fresa diamantada", 0.3], ["Tira matriz y cuña", 1], ["Rollos de algodón", 4],
    ],
    manoObra: [{ rol: "ODONTOLOGO", minutos: 45, costoHora: GENERAL }, { rol: "ASISTENTE", minutos: 45, costoHora: ASISTENTE }],
    equipos: [["Unidad dental (sillón)", 45], ["Compresor dental", 45], ["Pieza de mano de alta velocidad", 15], ["Lámpara de fotocurado", 5]],
    tercerizados: [],
  },
  {
    nombre: "Endodoncia unirradicular", categoria: "ENDODONCIA", precio: 400, duracionMin: 60, sesiones: 2, costoEsterilizacion: 10,
    peso: 5, odontologos: ["endo"],
    materiales: [
      ...BIOSEGURIDAD.map(([n, c]) => [n, c * 2] as [string, number]), ["Anestesia lidocaína 2% (carpule)", 2], ["Aguja dental corta", 2],
      ["Limas endodónticas (juego)", 0.25], ["Hipoclorito de sodio 5%", 20], ["Conos de gutapercha", 4], ["Conos de papel", 6],
      ["Cemento sellador endodóntico", 0.5], ["Radiografía periapical (película)", 3], ["Fresa diamantada", 0.3], ["Resina compuesta", 0.3],
    ],
    manoObra: [{ rol: "ODONTOLOGO", minutos: 120, costoHora: ESPECIALISTA }, { rol: "ASISTENTE", minutos: 120, costoHora: ASISTENTE }],
    equipos: [
      ["Unidad dental (sillón)", 120], ["Compresor dental", 120], ["Motor de endodoncia", 50], ["Localizador de ápices", 15],
      ["Equipo de rayos X portátil", 3], ["Pieza de mano de alta velocidad", 10],
    ],
    tercerizados: [],
  },
  {
    nombre: "Endodoncia multirradicular", categoria: "ENDODONCIA", precio: 750, duracionMin: 90, sesiones: 2, costoEsterilizacion: 12,
    peso: 4, odontologos: ["endo"],
    materiales: [
      ...BIOSEGURIDAD.map(([n, c]) => [n, c * 2] as [string, number]), ["Anestesia lidocaína 2% (carpule)", 3], ["Aguja dental corta", 2],
      ["Limas endodónticas (juego)", 0.5], ["Hipoclorito de sodio 5%", 40], ["Conos de gutapercha", 10], ["Conos de papel", 15],
      ["Cemento sellador endodóntico", 1], ["Radiografía periapical (película)", 4], ["Fresa diamantada", 0.5], ["Resina compuesta", 0.5],
    ],
    manoObra: [{ rol: "ODONTOLOGO", minutos: 180, costoHora: ESPECIALISTA }, { rol: "ASISTENTE", minutos: 180, costoHora: ASISTENTE }],
    equipos: [
      ["Unidad dental (sillón)", 180], ["Compresor dental", 180], ["Motor de endodoncia", 90], ["Localizador de ápices", 25],
      ["Equipo de rayos X portátil", 4], ["Pieza de mano de alta velocidad", 15],
    ],
    tercerizados: [],
  },
  {
    nombre: "Extracción simple", categoria: "CIRUGIA", precio: 120, duracionMin: 30, sesiones: 1, costoEsterilizacion: 6,
    peso: 8, odontologos: ["general", "cirugia"],
    materiales: [...BIOSEGURIDAD, ["Anestesia lidocaína 2% (carpule)", 2], ["Aguja dental corta", 1], ["Gasas estériles", 6], ["Campo quirúrgico descartable", 1]],
    manoObra: [{ rol: "ODONTOLOGO", minutos: 30, costoHora: GENERAL }, { rol: "ASISTENTE", minutos: 30, costoHora: ASISTENTE }],
    equipos: [["Unidad dental (sillón)", 30], ["Compresor dental", 30]],
    tercerizados: [],
  },
  {
    nombre: "Extracción de tercera molar", categoria: "CIRUGIA", precio: 350, duracionMin: 60, sesiones: 1, costoEsterilizacion: 15,
    peso: 3, odontologos: ["cirugia"],
    materiales: [
      ...BIOSEGURIDAD, ["Anestesia lidocaína 2% (carpule)", 4], ["Aguja dental corta", 2], ["Gasas estériles", 10],
      ["Campo quirúrgico descartable", 2], ["Sutura seda 3/0", 1], ["Esponja hemostática", 1], ["Fresa diamantada", 0.5],
    ],
    manoObra: [{ rol: "ODONTOLOGO", minutos: 60, costoHora: ESPECIALISTA }, { rol: "ASISTENTE", minutos: 60, costoHora: ASISTENTE }],
    equipos: [["Unidad dental (sillón)", 60], ["Compresor dental", 60], ["Micromotor y contraángulo", 20]],
    tercerizados: [{ tipo: "RADIOGRAFIA_EXTERNA", descripcion: "Radiografía panorámica", costo: 35 }],
  },
  {
    nombre: "Blanqueamiento", categoria: "ESTETICA", precio: 600, duracionMin: 60, sesiones: 2, costoEsterilizacion: 4,
    peso: 3, odontologos: ["general"],
    materiales: [...BIOSEGURIDAD.map(([n, c]) => [n, c * 2] as [string, number]), ["Kit de blanqueamiento en consultorio", 1], ["Rollos de algodón", 6], ["Gasas estériles", 4]],
    manoObra: [{ rol: "ODONTOLOGO", minutos: 60, costoHora: GENERAL }, { rol: "ASISTENTE", minutos: 120, costoHora: ASISTENTE }],
    equipos: [["Unidad dental (sillón)", 120], ["Lámpara de blanqueamiento", 90]],
    tercerizados: [],
  },
  {
    nombre: "Ortodoncia (mensualidad)", categoria: "ORTODONCIA", precio: 200, duracionMin: 30, sesiones: 1, costoEsterilizacion: 3,
    peso: 15, odontologos: ["orto"],
    materiales: [...BIOSEGURIDAD, ["Ligaduras elásticas", 20], ["Arco NiTi", 0.5], ["Rollos de algodón", 2]],
    manoObra: [{ rol: "ODONTOLOGO", minutos: 30, costoHora: ESPECIALISTA }, { rol: "ASISTENTE", minutos: 30, costoHora: ASISTENTE }],
    equipos: [["Unidad dental (sillón)", 30], ["Compresor dental", 10]],
    tercerizados: [],
  },
  {
    nombre: "Corona", categoria: "PROTESIS", precio: 900, duracionMin: 60, sesiones: 2, costoEsterilizacion: 8,
    peso: 3, odontologos: ["general", "endo"],
    materiales: [
      ...BIOSEGURIDAD.map(([n, c]) => [n, c * 2] as [string, number]), ["Anestesia lidocaína 2% (carpule)", 2], ["Aguja dental corta", 1],
      ["Silicona de impresión", 30], ["Acrílico para provisional", 3], ["Cemento definitivo", 1], ["Hilo retractor", 5], ["Fresa diamantada", 1],
    ],
    manoObra: [{ rol: "ODONTOLOGO", minutos: 120, costoHora: GENERAL }, { rol: "ASISTENTE", minutos: 120, costoHora: ASISTENTE }],
    equipos: [["Unidad dental (sillón)", 120], ["Compresor dental", 120], ["Pieza de mano de alta velocidad", 30]],
    tercerizados: [{ tipo: "LABORATORIO", descripcion: "Corona metal-porcelana", costo: 280 }],
  },
  {
    nombre: "Carilla", categoria: "ESTETICA", precio: 900, duracionMin: 60, sesiones: 2, costoEsterilizacion: 6,
    peso: 2, odontologos: ["general"],
    materiales: [
      ...BIOSEGURIDAD.map(([n, c]) => [n, c * 2] as [string, number]), ["Silicona de impresión", 20], ["Ácido grabador 37%", 0.2],
      ["Adhesivo universal", 0.1], ["Cemento definitivo", 0.5], ["Fresa diamantada", 1],
    ],
    manoObra: [{ rol: "ODONTOLOGO", minutos: 120, costoHora: GENERAL }, { rol: "ASISTENTE", minutos: 120, costoHora: ASISTENTE }],
    equipos: [["Unidad dental (sillón)", 120], ["Compresor dental", 120], ["Pieza de mano de alta velocidad", 20], ["Lámpara de fotocurado", 5]],
    tercerizados: [{ tipo: "LABORATORIO", descripcion: "Carilla de porcelana (disilicato)", costo: 250 }],
  },
  {
    nombre: "Implante", categoria: "IMPLANTOLOGIA", precio: 3500, duracionMin: 90, sesiones: 2, costoEsterilizacion: 30,
    peso: 1.2, odontologos: ["cirugia"],
    materiales: [
      ...BIOSEGURIDAD.map(([n, c]) => [n, c * 2] as [string, number]), ["Anestesia lidocaína 2% (carpule)", 4], ["Aguja dental corta", 2],
      ["Campo quirúrgico descartable", 3], ["Gasas estériles", 15], ["Sutura seda 3/0", 1], ["Implante dental (fijación)", 1],
      ["Pilar protésico", 1], ["Silicona de impresión", 20],
    ],
    manoObra: [{ rol: "ODONTOLOGO", minutos: 180, costoHora: IMPLANTOLOGO }, { rol: "ASISTENTE", minutos: 180, costoHora: ASISTENTE }],
    equipos: [["Unidad dental (sillón)", 180], ["Compresor dental", 60], ["Motor de implantes", 60], ["Equipo de rayos X portátil", 3]],
    tercerizados: [
      { tipo: "RADIOGRAFIA_EXTERNA", descripcion: "Tomografía cone beam", costo: 150 },
      { tipo: "LABORATORIO", descripcion: "Corona sobre implante", costo: 450 },
    ],
  },
];

type CategoriaGasto =
  | "ALQUILER" | "LUZ" | "AGUA" | "INTERNET_TELEFONO" | "SUELDOS_ADMINISTRATIVOS" | "MARKETING"
  | "SOFTWARE" | "CONTABILIDAD" | "LIMPIEZA" | "MANTENIMIENTO" | "SEGUROS" | "LICENCIAS" | "OTROS";

/** Gastos fijos mensuales base; `variacion` es la fluctuación relativa aleatoria por mes. */
export const GASTOS_BASE: { categoria: CategoriaGasto; descripcion: string; monto: number; variacion: number }[] = [
  { categoria: "ALQUILER", descripcion: "Alquiler del local (2 consultorios)", monto: 4500, variacion: 0 },
  { categoria: "LUZ", descripcion: "Recibo de luz", monto: 450, variacion: 0.15 },
  { categoria: "AGUA", descripcion: "Recibo de agua", monto: 120, variacion: 0.1 },
  { categoria: "INTERNET_TELEFONO", descripcion: "Internet y telefonía fija/móvil", monto: 180, variacion: 0 },
  { categoria: "SUELDOS_ADMINISTRATIVOS", descripcion: "Secretaria", monto: 1500, variacion: 0 },
  { categoria: "SUELDOS_ADMINISTRATIVOS", descripcion: "Cajera", monto: 1300, variacion: 0 },
  { categoria: "SUELDOS_ADMINISTRATIVOS", descripcion: "Telemarketing", monto: 1200, variacion: 0 },
  { categoria: "SUELDOS_ADMINISTRATIVOS", descripcion: "Administración", monto: 3000, variacion: 0 },
  { categoria: "MARKETING", descripcion: "Publicidad en redes sociales", monto: 1500, variacion: 0.25 },
  { categoria: "SOFTWARE", descripcion: "Software de gestión y facturación electrónica", monto: 250, variacion: 0 },
  { categoria: "CONTABILIDAD", descripcion: "Estudio contable", monto: 600, variacion: 0 },
  { categoria: "LIMPIEZA", descripcion: "Servicio de limpieza", monto: 900, variacion: 0 },
  { categoria: "MANTENIMIENTO", descripcion: "Mantenimiento preventivo de equipos", monto: 400, variacion: 0.4 },
  { categoria: "SEGUROS", descripcion: "Seguro multirriesgo y responsabilidad civil", monto: 300, variacion: 0 },
  { categoria: "LICENCIAS", descripcion: "Licencia municipal y autorizaciones sanitarias (prorrateo)", monto: 150, variacion: 0 },
  { categoria: "OTROS", descripcion: "Útiles de oficina y gastos menores", monto: 300, variacion: 0.3 },
];

export const NOMBRES = [
  "José", "Luis", "Carlos", "Jorge", "Juan", "Miguel", "Pedro", "César", "Víctor", "Raúl", "Diego", "Renzo", "Bruno", "Paolo",
  "Alonso", "Sebastián", "Mateo", "Rodrigo", "Martín", "Fernando", "María", "Rosa", "Carmen", "Ana", "Lucía", "Milagros",
  "Patricia", "Julia", "Gabriela", "Fiorella", "Claudia", "Daniela", "Valeria", "Camila", "Andrea", "Karina", "Silvia",
  "Elena", "Sofía", "Ximena", "Katherine", "Mónica", "Yolanda", "Guadalupe", "Jimena",
];

export const APELLIDOS = [
  "Quispe", "Flores", "Sánchez", "Rodríguez", "García", "Rojas", "Huamán", "Mamani", "Chávez", "Vásquez", "Ramírez",
  "Torres", "Mendoza", "Castillo", "Díaz", "Gutiérrez", "Espinoza", "Vargas", "Pérez", "Ramos", "Cruz", "Castro",
  "Romero", "Salazar", "Paredes", "Silva", "Córdova", "Cárdenas", "Ríos", "Aguilar", "Medina", "Palacios", "Condori",
  "Ccahuana", "Villanueva", "Huertas", "Zapata", "Benites", "Alvarado", "Ticona",
];
