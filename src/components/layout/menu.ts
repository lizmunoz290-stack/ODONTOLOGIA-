import type { Permiso } from "@/lib/auth/permisos";

export interface ItemMenu {
  href: string;
  texto: string;
  icono: string;
  permiso: Permiso;
}

export const MENU: { grupo: string; items: ItemMenu[] }[] = [
  {
    grupo: "Análisis",
    items: [
      { href: "/dashboard", texto: "Dashboard", icono: "📊", permiso: "verDashboard" },
      { href: "/reportes", texto: "Reportes", icono: "📑", permiso: "verReportes" },
    ],
  },
  {
    grupo: "Finanzas (libro contable)",
    items: [
      { href: "/finanzas", texto: "Estado de resultados", icono: "💰", permiso: "verCostos" },
      { href: "/finanzas/ingresos", texto: "Ingresos", icono: "⬆️", permiso: "verCostos" },
      { href: "/finanzas/gastos", texto: "Gastos", icono: "⬇️", permiso: "verCostos" },
      { href: "/finanzas/clasificacion", texto: "Clasificación de gastos", icono: "🗂️", permiso: "verCostos" },
      { href: "/finanzas/metas", texto: "Metas e inicios", icono: "🎯", permiso: "verCostos" },
      { href: "/finanzas/permisos", texto: "Permisos y licencias", icono: "📋", permiso: "verCostos" },
      { href: "/finanzas/importar", texto: "Importar libro", icono: "📥", permiso: "editarCatalogo" },
    ],
  },
  {
    grupo: "Operación",
    items: [{ href: "/atenciones", texto: "Atenciones", icono: "🗓️", permiso: "verAtenciones" }],
  },
  {
    grupo: "Costeo",
    items: [
      { href: "/servicios", texto: "Servicios", icono: "🦷", permiso: "verCatalogo" },
      { href: "/materiales", texto: "Materiales", icono: "🧪", permiso: "verCostos" },
      { href: "/equipos", texto: "Equipos", icono: "⚙️", permiso: "verCostos" },
      { href: "/costos-indirectos", texto: "Costos indirectos", icono: "🏢", permiso: "verCostos" },
    ],
  },
  {
    grupo: "Administración",
    items: [
      { href: "/odontologos", texto: "Odontólogos", icono: "👩‍⚕️", permiso: "editarCatalogo" },
      { href: "/usuarios", texto: "Usuarios", icono: "👥", permiso: "gestionarUsuarios" },
      { href: "/configuracion", texto: "Configuración", icono: "🔧", permiso: "configurar" },
    ],
  },
];
