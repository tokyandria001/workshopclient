import { describe, expect, it, vi } from "vitest";

import {
  verifyAdminCredentials,
  type CredentialsDeps,
} from "@/server/auth/credentials";

const admin = {
  id: "admin-1",
  email: "admin@zenith.fr",
  name: "Admin",
  passwordHash: "hash-du-bon-mot-de-passe",
};

function makeDeps(found: typeof admin | null = admin) {
  return {
    findAdminByEmail: vi.fn<CredentialsDeps["findAdminByEmail"]>(
      async () => found,
    ),
    verifyPassword: vi.fn<CredentialsDeps["verifyPassword"]>(
      async (password, hash) =>
        hash === admin.passwordHash && password === "bon-mot-de-passe",
    ),
  };
}

describe("verifyAdminCredentials", () => {
  it("accepte des identifiants valides et ne renvoie pas le hash", async () => {
    const result = await verifyAdminCredentials(
      { email: "admin@zenith.fr", password: "bon-mot-de-passe" },
      makeDeps(),
    );
    expect(result).toEqual({
      id: "admin-1",
      email: "admin@zenith.fr",
      name: "Admin",
    });
  });

  it("normalise l'e-mail (espaces et majuscules)", async () => {
    const deps = makeDeps();
    await verifyAdminCredentials(
      { email: "  Admin@Zenith.FR ", password: "bon-mot-de-passe" },
      deps,
    );
    expect(deps.findAdminByEmail).toHaveBeenCalledWith("admin@zenith.fr");
  });

  it("refuse un mauvais mot de passe", async () => {
    const result = await verifyAdminCredentials(
      { email: "admin@zenith.fr", password: "mauvais" },
      makeDeps(),
    );
    expect(result).toBeNull();
  });

  it("refuse un e-mail inconnu en vérifiant quand même un hash", async () => {
    const deps = makeDeps(null);
    const result = await verifyAdminCredentials(
      { email: "inconnu@zenith.fr", password: "peu-importe" },
      deps,
    );
    expect(result).toBeNull();
    // Même durée de traitement qu'un compte existant.
    expect(deps.verifyPassword).toHaveBeenCalledOnce();
  });

  it.each([
    [{ email: "pas-un-email", password: "x" }],
    [{ email: "admin@zenith.fr", password: "" }],
    [{}],
    [null],
  ])(
    "refuse une saisie invalide sans interroger la base : %j",
    async (input) => {
      const deps = makeDeps();
      expect(await verifyAdminCredentials(input, deps)).toBeNull();
      expect(deps.findAdminByEmail).not.toHaveBeenCalled();
    },
  );
});
