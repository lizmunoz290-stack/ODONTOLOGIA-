/** Etiquetas en español para los valores de enumeraciones de la base de datos. */

export const CATEGORIAS = {
  PREVENTIVA: "Preventiva",
  RESTAURADORA: "Restauradora",
  ENDODONCIA: "Endodoncia",
  CIRUGIA: "Cirugía",
  ORTODONCIA: "Ortodoncia",
  ESTETICA: "Estética",
  PROTESIS: "Prótesis",
  IMPLANTOLOGIA: "Implantología",
} as const;
export type CategoriaKey = keyof typeof CATEGORIAS;

export const CATEGORIAS_GASTO = {
  ALQUILER: "Alquiler",
  LUZ: "Luz",
  AGUA: "Agua",
  INTERNET_TELEFONO: "Internet y teléfono",
  SUELDOS_ADMINISTRATIVOS: "Sueldos administrativos",
  MARKETING: "Marketing y publicidad",
  SOFTWARE: "Software",
  CONTABILIDAD: "Contabilidad",
  LIMPIEZA: "Limpieza",
  MANTENIMIENTO: "Mantenimiento de equipos",
  SEGUROS: "Seguros",
  LICENCIAS: "Licencias",
  OTROS: "Otros",
} as const;
export type CategoriaGastoKey = keyof typeof CATEGORIAS_GASTO;

export const ROLES_MANO_OBRA = { ODONTOLOGO: "Odontólogo", ASISTENTE: "Asistente dental" } as const;

export const TIPOS_TERCERIZADO = {
  LABORATORIO: "Laboratorio dental",
  RADIOGRAFIA_EXTERNA: "Radiografía externa",
} as const;

export const TURNOS = { MANANA: "Mañana", TARDE: "Tarde" } as const;
export type TurnoKey = keyof typeof TURNOS;

export const METODOS_PAGO = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  YAPE_PLIN: "Yape/Plin",
  TRANSFERENCIA: "Transferencia",
} as const;
export type MetodoPagoKey = keyof typeof METODOS_PAGO;

export const ESTADOS_PAGO = { PAGADO: "Pagado", PENDIENTE: "Pendiente", PARCIAL: "Parcial" } as const;
export type EstadoPagoKey = keyof typeof ESTADOS_PAGO;

export const CANALES = {
  TELEMARKETING: "Telemarketing",
  REDES_SOCIALES: "Redes sociales",
  REFERIDO: "Referido",
  PASANTE: "Pasante / walk-in",
  OTRO: "Otro",
} as const;
export type CanalKey = keyof typeof CANALES;

export const ROLES = {
  ADMIN: "Administrador",
  CAJA: "Caja / Secretaría",
  ODONTOLOGO: "Odontólogo",
} as const;
export type RolKey = keyof typeof ROLES;

/** Busca la clave de una enumeración a partir de su etiqueta o su clave (sin distinguir tildes ni mayúsculas). */
export function claveDesdeEtiqueta<T extends Record<string, string>>(mapa: T, texto: string): keyof T | null {
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const t = norm(texto);
  if (!t) return null;
  for (const [k, v] of Object.entries(mapa)) {
    if (norm(k) === t || norm(v) === t) return k as keyof T;
  }
  return null;
}
