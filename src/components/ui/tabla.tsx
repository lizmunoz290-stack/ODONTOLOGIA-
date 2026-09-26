/** Contenedor con desplazamiento horizontal para que las tablas no rompan el diseño en celulares. */
export function ContenedorTabla({ children }: { children: React.ReactNode }) {
  return (
    <div className="tarjeta overflow-hidden">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function FilaVacia({ columnas, mensaje = "No hay registros." }: { columnas: number; mensaje?: string }) {
  return (
    <tr>
      <td colSpan={columnas} className="px-3 py-10 text-center text-sm text-slate-500">
        {mensaje}
      </td>
    </tr>
  );
}
