/** Columnas de la plantilla de importación de atenciones. */
export interface ColumnaImportacion {
  clave: string;
  encabezado: string;
  obligatorio: boolean;
  ancho: number;
  nota: string;
}

export const COLUMNAS: ColumnaImportacion[] = [
  { clave: "fecha", encabezado: "Fecha", obligatorio: true, ancho: 12, nota: "dd/mm/aaaa. No puede ser futura." },
  { clave: "paciente", encabezado: "Paciente", obligatorio: true, ancho: 30, nota: "Nombres y apellidos." },
  { clave: "dni", encabezado: "DNI", obligatorio: false, ancho: 12, nota: "Opcional. 8 dígitos (o carné de extranjería)." },
  { clave: "servicio", encabezado: "Servicio", obligatorio: true, ancho: 30, nota: "Tal como figura en el catálogo (ver hoja Listas)." },
  { clave: "odontologo", encabezado: "Odontólogo", obligatorio: true, ancho: 28, nota: "Tal como figura en el sistema (ver hoja Listas)." },
  { clave: "turno", encabezado: "Turno", obligatorio: true, ancho: 10, nota: "Mañana o Tarde." },
  { clave: "precioLista", encabezado: "Precio lista", obligatorio: false, ancho: 12, nota: "Opcional. Si se deja vacío se usa el precio del catálogo." },
  { clave: "descuento", encabezado: "Descuento", obligatorio: false, ancho: 11, nota: "Monto en soles. Vacío = 0." },
  { clave: "incluyeIgv", encabezado: "Incluye IGV", obligatorio: false, ancho: 11, nota: "Sí o No. Vacío = Sí." },
  { clave: "metodoPago", encabezado: "Método de pago", obligatorio: true, ancho: 15, nota: "Efectivo, Tarjeta, Yape/Plin o Transferencia." },
  { clave: "estadoPago", encabezado: "Estado", obligatorio: false, ancho: 11, nota: "Pagado, Pendiente o Parcial. Vacío = Pagado." },
  { clave: "montoPagado", encabezado: "Monto pagado", obligatorio: false, ancho: 13, nota: "Solo si el estado es Parcial." },
  { clave: "canal", encabezado: "Canal", obligatorio: false, ancho: 16, nota: "Telemarketing, Redes sociales, Referido, Pasante / walk-in u Otro. Vacío = Otro." },
  { clave: "observaciones", encabezado: "Observaciones", obligatorio: false, ancho: 30, nota: "Opcional." },
];
