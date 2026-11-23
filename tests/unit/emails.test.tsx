import { render, toPlainText } from "@react-email/render";
import { describe, expect, it } from "vitest";

import {
  PaymentConfirmedEmail,
  ReservationAcceptedEmail,
  ReservationReceivedEmail,
  ReservationRefusedEmail,
  type ReservationEmailData,
} from "@/emails/reservation-emails";

const data: ReservationEmailData = {
  organization: {
    name: "Zénith de Bel Air",
    email: "contact@zenith.example",
    phone: "01 23 45 67 89",
  },
  firstName: "Camille",
  reference: "R27-K7MX4P",
  period: "du lundi 1 mars 2027 au mercredi 3 mars 2027",
  lines: [
    { label: "Micro sans fil × 2 (15,00 € par jour)", amount: "90,00 €" },
  ],
  total: "90,00 €",
  deposit: "200,00 €",
  trackingUrl: "https://zenith.example/suivi/jeton-secret",
};

async function renderBoth(element: React.ReactElement) {
  const html = await render(element);
  return { html, text: toPlainText(html) };
}

/** Vérifications communes à tous les e-mails. */
function expectCommon({ html, text }: { html: string; text: string }) {
  expect(html).toContain('lang="fr"');
  expect(text).toContain("Bonjour Camille");
  expect(text).toContain("Zénith de Bel Air");
  expect(text).toContain("contact@zenith.example");
  // Lien de suivi présent et cliquable dans la version HTML.
  expect(html).toContain('href="https://zenith.example/suivi/jeton-secret"');
  expect(text).toContain("https://zenith.example/suivi/jeton-secret");
  // Aucune donnée manquante affichée.
  expect(text).not.toMatch(/undefined|null|NaN/);
}

describe("e-mails de réservation", () => {
  it("demande reçue : récapitulatif et lien de suivi", async () => {
    const email = await renderBoth(<ReservationReceivedEmail {...data} />);
    expectCommon(email);
    expect(email.text).toContain("Nous avons bien reçu votre demande");
    expect(email.text).toContain("R27-K7MX4P");
    expect(email.text).toContain(
      "du lundi 1 mars 2027 au mercredi 3 mars 2027",
    );
    expect(email.text).toContain("Micro sans fil × 2");
    expect(email.text).toContain("Total : 90,00 €");
    expect(email.text).toContain("Caution (non prélevée en ligne) : 200,00 €");
    expect(email.text).toContain("Aucun paiement");
  });

  it("demande acceptée : montant et date limite de paiement", async () => {
    const email = await renderBoth(
      <ReservationAcceptedEmail
        {...data}
        paymentDue="jeudi 4 mars 2027 à 14:00"
      />,
    );
    expectCommon(email);
    expect(email.text).toContain("votre demande de réservation est acceptée");
    expect(email.text).toContain("90,00 €");
    expect(email.text).toContain("jeudi 4 mars 2027 à 14:00");
    expect(email.html).toContain("Accéder à ma réservation et payer");
    expect(email.text).toContain("aucune donnée bancaire");
  });

  it("demande refusée : motif affiché", async () => {
    const email = await renderBoth(
      <ReservationRefusedEmail
        {...data}
        reason="Salle déjà réservée ce jour-là."
      />,
    );
    expectCommon(email);
    expect(email.text).toContain("nous ne pouvons pas donner suite");
    expect(email.text).toContain("Salle déjà réservée ce jour-là.");
  });

  it("paiement confirmé : mention des pièces jointes", async () => {
    const email = await renderBoth(<PaymentConfirmedEmail {...data} />);
    expectCommon(email);
    expect(email.text).toContain("votre réservation est confirmée");
    expect(email.text).toContain("contrat de location et votre reçu");
  });

  it("échappe le contenu saisi par le client (pas d'injection HTML)", async () => {
    const { html } = await renderBoth(
      <ReservationRefusedEmail
        {...data}
        firstName={'<script>alert("x")</script>'}
        reason="<b>gras</b>"
      />,
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>gras</b>");
    expect(html).toContain("&lt;script&gt;");
  });
});
