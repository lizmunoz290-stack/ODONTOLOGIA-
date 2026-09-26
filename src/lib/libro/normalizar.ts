/**
 * Normalización de textos del libro contable: nombres de pacientes, medios de pago
 * y tipos de gasto (unifica variantes y reclasifica el cajón "OTROS" por la descripción).
 */

export type DestinoGasto = "DIRECTO_ORTODONCIA" | "DIRECTO_ODONTOLOGIA" | "DIRECTO_COMPARTIDO" | "INDIRECTO" | "NO_OPERATIVO";

/** "  maría  josé Pérez " → "MARIA JOSE PEREZ" */
export function claveTexto(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9Ñ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizarMedioPago(s: unknown): string {
  const t = claveTexto(s);
  if (!t) return "SIN DATO";
  if (t.startsWith("EFECT")) return "EFECTIVO";
  if (t.startsWith("DEPOS") || t.startsWith("TRANSF")) return "DEPOSITO";
  if (t.startsWith("TARJ") || t === "POS") return "TARJETA";
  if (t.includes("CTA") || t.includes("CUENTA CORRIENTE")) return "CTA CTE";
  if (t.includes("YAPE") || t.includes("PLIN")) return "YAPE/PLIN";
  return t;
}

export function normalizarEspecialidad(s: unknown): "ORTODONCIA" | "ODONTOLOGIA" | null {
  const t = claveTexto(s);
  if (t.startsWith("ORTO")) return "ORTODONCIA";
  if (t.startsWith("ODONT")) return "ODONTOLOGIA";
  return null;
}

/** Variantes de escritura del mismo tipo de gasto */
const SINONIMOS: Record<string, string> = {
  RYDENT: "RAYDENT",
  "LABORATORIO ORTODONCISTA": "LABORATORIO ORTODONCIA",
  "COMIISON BE": "COMISION BE",
  MATE: "MATERIALES",
  "TECNICO DE UNIDADES": "SERVICIO TECNICO UNIDADES",
  IMPUESTO: "IMPUESTOS",
  "LIMPIEZA DE SEDE": "LIMPIEZA",
  "SERVICIO DE LIMPIEZA": "LIMPIEZA",
  "COMISION ODONTOLOGO": "COMISION ODONTOLOGIA",
  "SERVICIOS OTROS": "OTROS",
  SERVICIOS: "OTROS",
  LETRA: "PRESTAMOS Y LETRAS",
  "DEVOLUCION PACIENTE": "DEVOLUCIONES A PACIENTES",
  CUMPLEANOS: "CUMPLEANOS Y EVENTOS",
};

/** Reglas por palabra clave para repartir el cajón "OTROS" (la primera que coincide gana). */
export const REGLAS_OTROS: [RegExp, string][] = [
  [/\bUTILIDAD/, "RETIRO DE UTILIDAD"],
  [/PRESTAMO|\bLETRA/, "PRESTAMOS Y LETRAS"],
  [/ALQUILER/, "ALQUILER"],
  [/\bLUZ\b|ENEL|LUZ DEL SUR/, "LUZ"],
  [/\bAGUA\b|SEDAPAL/, "AGUA"],
  [/ENTEL|CLARO|MOVISTAR|BITEL|TELEFON|INTERNET/, "TELEFONIA E INTERNET"],
  [/SUNAT|IMPUESTO|FRACCIONAMIENTO|DETRACCION/, "IMPUESTOS"],
  [/PUBLICIDAD|FACEBOOK|INSTAGRAM|TIKTOK|\bREDES\b|MARKETING/, "PUBLICIDAD"],
  [/LIMPIEZA/, "LIMPIEZA"],
  [/QUINCENA|SUELDO|GRATIFICACION|LIQUIDACION|\bCTS\b|PLANILLA|ESSALUD|AFP/, "SUELDO"],
  [/LABORATORIO/, "LABORATORIO (SIN ESPECIALIDAD)"],
  [/MATERIAL/, "MATERIALES"],
  [/\bTURNO/, "TURNOS (SIN ESPECIALIDAD)"],
  [/DEVOLUCION/, "DEVOLUCIONES A PACIENTES"],
  [/\bRAX\b|RAYDENT|RADIOGRAF|TOMOGRAF/, "RAYDENT"],
  [/MOVILIDAD|PASAJE|TAXI/, "MOVILIDAD"],
  [/CONTADOR|CONTABIL/, "CONTABILIDAD"],
];

/** Tipo de gasto final: unifica variantes y, si es "OTROS" o vacío, lo reclasifica por la descripción. */
export function tipoGastoFinal(tipo: unknown, descripcion: unknown): string {
  let t = claveTexto(tipo);
  t = SINONIMOS[t] ?? t;
  if (!t || t === "OTROS") {
    const d = claveTexto(descripcion);
    for (const [re, destino] of REGLAS_OTROS) if (re.test(d)) return destino;
    return "OTROS";
  }
  return t;
}

/** A qué va cada tipo de gasto por defecto (editable luego en la app). */
export function destinoPorDefecto(tipo: string): DestinoGasto {
  const t = claveTexto(tipo);
  if (/ORTODONCI|CONTENCION|MINITORNILLO|MARPHE|COMISION BE/.test(t)) return "DIRECTO_ORTODONCIA";
  if (/ODONTOLOG|CIRUJANO|IMPLANT|ENDODONC|PERIODONC|REHABILIT|COMISION LIMPIEZAS/.test(t)) return "DIRECTO_ODONTOLOGIA";
  if (/^MATERIALES$|RAYDENT|LABORATORIO|TURNOS/.test(t)) return "DIRECTO_COMPARTIDO";
  if (/RETIRO DE UTILIDAD|PRESTAMOS Y LETRAS/.test(t)) return "NO_OPERATIVO";
  return "INDIRECTO";
}

export const NOMBRE_DESTINO: Record<DestinoGasto, string> = {
  DIRECTO_ORTODONCIA: "Costo directo · Ortodoncia",
  DIRECTO_ODONTOLOGIA: "Costo directo · Odontología",
  DIRECTO_COMPARTIDO: "Costo directo compartido",
  INDIRECTO: "Gasto indirecto (fijo)",
  NO_OPERATIVO: "No operativo (fuera del resultado)",
};
