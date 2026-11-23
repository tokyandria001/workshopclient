export const ADMIN_HOME = "/admin";
export const ADMIN_LOGIN = "/admin/connexion";

/**
 * Valide l'URL de retour après connexion. Seuls les chemins internes du
 * back-office sont acceptés : on évite ainsi les redirections ouvertes vers un
 * site externe (`https://…`, `//site.com`, `/\site.com`).
 */
export function safeAdminRedirect(target: unknown): string {
  if (typeof target !== "string") return ADMIN_HOME;
  if (!target.startsWith("/admin")) return ADMIN_HOME;
  if (target.startsWith("//") || target.includes("\\")) return ADMIN_HOME;
  if (target === ADMIN_LOGIN || target.startsWith(`${ADMIN_LOGIN}?`)) {
    return ADMIN_HOME;
  }
  // "/administration" ne fait pas partie du back-office.
  const next = target.charAt("/admin".length);
  if (next !== "" && next !== "/" && next !== "?" && next !== "#") {
    return ADMIN_HOME;
  }
  return target;
}
