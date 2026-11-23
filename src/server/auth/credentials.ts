import { z } from "zod";

export const loginSchema = z.object({
  // Nettoyage (espaces, majuscules) AVANT la vérification du format.
  email: z
    .string("Adresse e-mail invalide.")
    .trim()
    .toLowerCase()
    .pipe(z.email("Adresse e-mail invalide.")),
  password: z.string().min(1, "Le mot de passe est obligatoire."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export type AuthenticatedAdmin = { id: string; email: string; name: string };

type AdminRecord = AuthenticatedAdmin & { passwordHash: string };

export type CredentialsDeps = {
  findAdminByEmail: (email: string) => Promise<AdminRecord | null>;
  verifyPassword: (password: string, hash: string) => Promise<boolean>;
};

// Hash bcrypt d'un mot de passe aléatoire, comparé quand l'e-mail est inconnu :
// la réponse prend alors le même temps que pour un compte existant, ce qui
// empêche de deviner les adresses des administrateurs en mesurant la durée.
const DUMMY_HASH =
  "$2b$12$qEQle/2I0l.3LISHqp0YVOHPhKuk6EM4AP/ySD5G0c35q2Nc/Cyby";

/**
 * Vérifie des identifiants d'administrateur.
 * Retourne l'administrateur, ou `null` si les identifiants sont invalides
 * (sans préciser si c'est l'e-mail ou le mot de passe qui est faux).
 */
export async function verifyAdminCredentials(
  rawInput: unknown,
  deps: CredentialsDeps,
): Promise<AuthenticatedAdmin | null> {
  const parsed = loginSchema.safeParse(rawInput);
  if (!parsed.success) return null;

  const { email, password } = parsed.data;
  const admin = await deps.findAdminByEmail(email);

  if (!admin) {
    await deps.verifyPassword(password, DUMMY_HASH);
    return null;
  }

  const valid = await deps.verifyPassword(password, admin.passwordHash);
  if (!valid) return null;

  return { id: admin.id, email: admin.email, name: admin.name };
}
