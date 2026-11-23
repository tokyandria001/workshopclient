import "server-only";

import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { verifyAdminCredentials } from "@/server/auth/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: (credentials) =>
        verifyAdminCredentials(credentials, {
          findAdminByEmail: (email) =>
            prisma.adminUser.findUnique({
              where: { email },
              select: { id: true, email: true, name: true, passwordHash: true },
            }),
          verifyPassword: (password, hash) => bcrypt.compare(password, hash),
        }),
    }),
  ],
});
