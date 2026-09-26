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
