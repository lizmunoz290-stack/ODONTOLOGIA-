import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, verificarSesion } from "@/lib/auth/token";
import { permisoParaRuta, puede } from "@/lib/auth/permisos";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sesion = await verificarSesion(req.cookies.get(COOKIE_SESION)?.value);

  // La página de login verifica por sí misma (con la base de datos) si ya hay una sesión válida
  if (pathname === "/login") return NextResponse.next();
  if (!sesion) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("desde", pathname);
    return NextResponse.redirect(url);
  }
  const permiso = permisoParaRuta(pathname);
  if (permiso && !puede(sesion.rol, permiso)) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    return NextResponse.redirect(new URL("/sin-acceso", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
