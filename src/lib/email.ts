import "server-only";

import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { render, toPlainText } from "@react-email/render";
import { Resend } from "resend";

export type OutgoingEmail = {
  to: string;
  subject: string;
  react: React.ReactElement;
  replyTo?: string;
  attachments?: { filename: string; content: Buffer }[];
};

/**
 * Mode d'envoi (variable EMAIL_DELIVERY) :
 * - "resend"  : envoi réel via Resend (par défaut si RESEND_API_KEY est définie) ;
 * - "fichier" : écrit chaque e-mail en JSON dans EMAIL_OUTBOX_DIR (développement
 *               sans clé, tests e2e) ;
 * - "console" : affiche l'e-mail dans les journaux du serveur.
 */
function deliveryMode(): "resend" | "fichier" | "console" {
  const mode = process.env.EMAIL_DELIVERY;
  if (mode === "resend" || mode === "fichier" || mode === "console")
    return mode;
  if (process.env.RESEND_API_KEY) return "resend";
  // Sans clé : fichiers en local ; en production (disque en lecture seule
  // sur Vercel), simple trace dans les journaux.
  return process.env.NODE_ENV === "production" ? "console" : "fichier";
}

let resend: Resend | undefined;

/**
 * Envoie un e-mail. Ne lève jamais d'exception : un échec d'envoi est
 * journalisé et ne doit pas bloquer l'action en cours (réservation, statut…).
 */
export async function sendEmail(email: OutgoingEmail): Promise<boolean> {
  try {
    const html = await render(email.react);
    const text = toPlainText(html);
    const from =
      process.env.EMAIL_FROM ?? "Zénith de Bel Air <onboarding@resend.dev>";

    switch (deliveryMode()) {
      case "resend": {
        resend ??= new Resend(process.env.RESEND_API_KEY);
        const { error } = await resend.emails.send({
          from,
          to: email.to,
          subject: email.subject,
          html,
          text,
          replyTo: email.replyTo,
          attachments: email.attachments,
        });
        if (error) throw new Error(`${error.name} : ${error.message}`);
        return true;
      }
      case "fichier": {
        const dir = process.env.EMAIL_OUTBOX_DIR ?? ".emails";
        await mkdir(dir, { recursive: true });
        const file = path.join(
          dir,
          `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`,
        );
        // Écriture puis renommage : un lecteur ne voit jamais un fichier partiel.
        await writeFile(
          `${file}.tmp`,
          JSON.stringify(
            {
              from,
              to: email.to,
              replyTo: email.replyTo,
              subject: email.subject,
              text,
              html,
              attachments: email.attachments?.map((a) => a.filename) ?? [],
              sentAt: new Date().toISOString(),
            },
            null,
            2,
          ),
        );
        await rename(`${file}.tmp`, file);
        return true;
      }
      case "console":
        console.info(`[e-mail] À : ${email.to} | ${email.subject}\n${text}`);
        return true;
    }
  } catch (error) {
    console.error(`[e-mail] Échec de l'envoi à ${email.to} :`, error);
    return false;
  }
}
