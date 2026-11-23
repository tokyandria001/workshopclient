import type { NextAuthConfig } from "next-auth";

import { ADMIN_LOGIN } from "@/server/auth/redirect";

/**
 * Configuration Auth.js partagée, sans accès à la base de données.
 * Utilisée seule par le proxy (vérification rapide du cookie de session) et
 * complétée par le fournisseur d'identifiants dans `src/lib/auth.ts`.
 */
export const authConfig = {
  pages: { signIn: ADMIN_LOGIN },
  session: {
    strategy: "jwt",
    // Session de 8 heures : une journée de travail, sans rester connecté
    // indéfiniment sur un poste partagé.
    maxAge: 8 * 60 * 60,
  },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
