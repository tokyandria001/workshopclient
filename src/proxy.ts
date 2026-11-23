import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";
import { ADMIN_HOME, ADMIN_LOGIN } from "@/server/auth/redirect";

// Vérification rapide (cookie de session uniquement, sans base de données)
// pour rediriger tôt les visiteurs non connectés. La vraie vérification est
// faite côté serveur par requireAdmin() dans chaque page et action.
const { auth } = NextAuth(authConfig);

export const proxy = auth((request) => {
  const { pathname, search } = request.nextUrl;
  const isLoggedIn = Boolean(request.auth?.user);
  const isLoginPage = pathname === ADMIN_LOGIN;

  if (isLoginPage) {
    return isLoggedIn
      ? NextResponse.redirect(new URL(ADMIN_HOME, request.nextUrl))
      : NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL(ADMIN_LOGIN, request.nextUrl);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
