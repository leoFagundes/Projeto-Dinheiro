import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-session";

/**
 * Checagem otimista de sessão admin, só pra /admin/*. A checagem de verdade
 * (que protege os dados) acontece de novo em app/admin/page.tsx e em cada
 * Server Action — o Proxy sozinho nunca é a única linha de defesa.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const isAuthed = await verifyAdminSessionToken(token);

  if (pathname === "/admin/login") {
    if (isAuthed) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  if (!isAuthed) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
