// Lecture des e-mails écrits sur disque par le serveur de test
// (EMAIL_DELIVERY=fichier, voir playwright.config.ts).

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { expect } from "@playwright/test";

const OUTBOX = ".emails-test";

export type CapturedEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments: string[];
};

async function readOutbox(): Promise<CapturedEmail[]> {
  const files = await readdir(OUTBOX).catch(() => [] as string[]);
  return Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .sort()
      .map(async (file) =>
        JSON.parse(await readFile(path.join(OUTBOX, file), "utf8")),
      ),
  );
}

/** Tous les e-mails déjà écrits pour ce destinataire. */
export async function emailsTo(to: string): Promise<CapturedEmail[]> {
  return (await readOutbox()).filter((email) => email.to === to);
}

/**
 * Attend l'e-mail adressé à `to` dont le sujet contient `subject` (les
 * e-mails partent après la réponse du serveur, d'où l'attente).
 */
export async function waitForEmail(
  to: string,
  subject: string,
): Promise<CapturedEmail> {
  let found: CapturedEmail | undefined;
  await expect
    .poll(
      async () => {
        found = (await readOutbox()).find(
          (email) => email.to === to && email.subject.includes(subject),
        );
        return Boolean(found);
      },
      { timeout: 15_000, message: `e-mail « ${subject} » pour ${to}` },
    )
    .toBe(true);
  return found!;
}

/** Chemin du lien de suivi contenu dans l'e-mail (/suivi/<jeton>). */
export function trackingPath(email: CapturedEmail): string {
  const match = /https?:\/\/[^\s"]+(\/suivi\/[\w-]{43})/.exec(email.html);
  expect(match, "lien de suivi dans l'e-mail").not.toBeNull();
  return match![1];
}
