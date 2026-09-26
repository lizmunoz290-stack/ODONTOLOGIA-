import { casilla, entero, id, monto, numero, texto, textoOpcional, z } from "./comun";
import { CATEGORIAS, ROLES_MANO_OBRA, TIPOS_TERCERIZADO } from "../constantes";

const claves = <T extends Record<string, string>>(m: T) => Object.keys(m) as [keyof T & string, ...(keyof T & string)[]];

export const esquemaServicio = z.object({
  nombre: texto(80),
  categoria: z.enum(claves(CATEGORIAS)),
  precio: monto().refine((v) => v > 0, "El precio debe ser mayor a 0"),
  duracionMin: entero().pipe(z.number().min(5, "Mínimo 5 minutos").max(600, "Máximo 600 minutos")),
  sesiones: entero().pipe(z.number().min(1, "Mínimo 1 sesión").max(60)),
  costoEsterilizacion: monto().default(0),
  activo: casilla(),
});

export const esquemaMaterial = z.object({
  nombre: texto(80),
  unidad: texto(20),
  costoUnitario: monto().refine((v) => v > 0, "El costo debe ser mayor a 0"),
  activo: casilla(),
});

export const esquemaEquipo = z.object({
  nombre: texto(80),
  costoAdquisicion: monto().refine((v) => v > 0, "El costo debe ser mayor a 0"),
  vidaUtilHoras: numero().pipe(z.number().min(1, "Mínimo 1 hora").max(200000)),
  activo: casilla(),
});

export const esquemaOdontologo = z.object({
  nombre: texto(80),
  especialidad: texto(60),
  cop: textoOpcional(20),
  activo: casilla(),
});

export const esquemaFichaMaterial = z.object({
  materialId: id(),
  cantidad: numero().pipe(z.number().gt(0, "La cantidad debe ser mayor a 0").max(10000)),
});

export const esquemaFichaManoObra = z.object({
  rol: z.enum(claves(ROLES_MANO_OBRA)),
  minutos: entero().pipe(z.number().min(1, "Mínimo 1 minuto").max(1440)),
  costoHora: monto().refine((v) => v > 0, "El costo por hora debe ser mayor a 0"),
});

export const esquemaFichaEquipo = z.object({
  equipoId: id(),
  minutosUso: entero().pipe(z.number().min(1, "Mínimo 1 minuto").max(1440)),
});

export const esquemaFichaTercerizado = z.object({
  tipo: z.enum(claves(TIPOS_TERCERIZADO)),
  descripcion: texto(80),
  costo: monto().refine((v) => v > 0, "El costo debe ser mayor a 0"),
});

export const esquemaEsterilizacion = z.object({ costoEsterilizacion: monto() });
