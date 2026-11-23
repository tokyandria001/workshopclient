"use server";

import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn, signOut } from "@/lib/auth";
import { loginSchema } from "@/server/auth/credentials";
import { ADMIN_LOGIN, safeAdminRedirect } from "@/server/auth/redirect";

export type LoginState = {
  error?: string;
  fieldErrors?: { email?: string[]; password?: string[] };
  email?: string;
};

export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({
    email,
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, email };
  }

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: safeAdminRedirect(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error:
          error.type === "CredentialsSignin"
            ? "E-mail ou mot de passe incorrect."
            : "La connexion a échoué. Veuillez réessayer.",
        email,
      };
    }
    // En cas de succès, la redirection est transmise sous forme d'exception :
    // elle doit être relancée.
    throw error;
  }
  return {};
}

export async function logout() {
  await signOut({ redirectTo: ADMIN_LOGIN });
}
