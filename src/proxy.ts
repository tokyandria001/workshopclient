import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_HOME, ADMIN_LOGIN } from "@/server/auth/redirect";

// Vérification rapide (cookie de session uniquement, sans base de données)
// pour rediriger tôt les visiteurs non connectés. La vraie vérification est
// faite côté serveur par requireAdmin() dans chaque page et action.
//
// Le cookie est seulement LU (signature et expiration vérifiées), jamais
// réécrit. Le wrapper `auth()` d'Auth.js renvoie le cookie de session à
// chaque requête pour prolonger la session : une requête en arrière-plan
// (préchargement d'un lien) terminée après la déconnexion pouvait alors
// recréer la session. La session dure donc 8 h fixes depuis la connexion.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    // Même nom de cookie qu'Auth.js : préfixe __Secure- en HTTPS.
    secureCookie: request.nextUrl.protocol === "https:",
  });
  const isLoggedIn = Boolean(token?.sub);
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
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
