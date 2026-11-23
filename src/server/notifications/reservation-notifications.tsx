import "server-only";

import {
  PaymentConfirmedEmail,
  ReservationAcceptedEmail,
  ReservationReceivedEmail,
  ReservationRefusedEmail,
  type ReservationEmailData,
} from "@/emails/reservation-emails";
import { fromDbDate, formatPeriodFr } from "@/lib/dates";
import { sendEmail } from "@/lib/email";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { PRICE_UNIT_LABELS } from "@/server/resources/schema";

// Envoi des e-mails liés à une réservation. Chaque fonction relit la
// réservation en base (données à jour) et ne lève jamais d'exception.

const ORGANIZATION_KEYS = {
  name: "organisation.nom",
  email: "organisation.email",
  phone: "organisation.telephone",
  address: "organisation.adresse",
} as const;

async function getOrganization() {
  const settings = await prisma.setting.findMany({
    where: { key: { in: Object.values(ORGANIZATION_KEYS) } },
  });
  const value = (key: string) =>
    settings.find((s) => s.key === key)?.value.trim() || undefined;
  return {
    name: value(ORGANIZATION_KEYS.name) ?? "Zénith de Bel Air",
    email: value(ORGANIZATION_KEYS.email),
    phone: value(ORGANIZATION_KEYS.phone),
    address: value(ORGANIZATION_KEYS.address),
  };
}

/** URL publique de l'application, sans « / » final. */
export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export const trackingUrl = (accessToken: string) =>
  `${appUrl()}/suivi/${accessToken}`;

const paymentDueFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

/** Charge la réservation et prépare les données communes aux e-mails. */
async function loadEmailData(reservationId: string) {
  const [reservation, organization] = await Promise.all([
    prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        customer: { select: { firstName: true, email: true } },
        items: {
          include: { resource: { select: { name: true, priceUnit: true } } },
        },
      },
    }),
    getOrganization(),
  ]);
  if (!reservation) return null;

  const data: ReservationEmailData = {
    organization,
    firstName: reservation.customer.firstName,
    reference: reservation.reference,
    period: formatPeriodFr(
      fromDbDate(reservation.startDate),
      fromDbDate(reservation.endDate),
    ),
    lines: reservation.items.map((item) => ({
      label: `${item.resource.name} × ${item.quantity} (${formatCents(
        item.unitPriceCents,
      )} ${PRICE_UNIT_LABELS[item.resource.priceUnit]})`,
      amount: formatCents(item.subtotalCents),
    })),
    total: formatCents(reservation.totalCents),
    deposit: formatCents(reservation.depositCents),
    trackingUrl: trackingUrl(reservation.accessToken),
  };
  return {
    data,
    to: reservation.customer.email,
    replyTo: organization.email,
    paymentDueAt: reservation.paymentDueAt,
  };
}

async function safely(task: () => Promise<boolean>): Promise<boolean> {
  try {
    return await task();
  } catch (error) {
    console.error("[e-mail] Préparation impossible :", error);
    return false;
  }
}

export function sendReservationReceived(reservationId: string) {
  return safely(async () => {
    const loaded = await loadEmailData(reservationId);
    if (!loaded) return false;
    return sendEmail({
      to: loaded.to,
      replyTo: loaded.replyTo,
      subject: `Demande de réservation reçue – ${loaded.data.reference}`,
      react: <ReservationReceivedEmail {...loaded.data} />,
    });
  });
}

export function sendReservationAccepted(reservationId: string) {
  return safely(async () => {
    const loaded = await loadEmailData(reservationId);
    if (!loaded?.paymentDueAt) return false;
    return sendEmail({
      to: loaded.to,
      replyTo: loaded.replyTo,
      subject: `Demande acceptée – paiement à effectuer – ${loaded.data.reference}`,
      react: (
        <ReservationAcceptedEmail
          {...loaded.data}
          paymentDue={paymentDueFormatter.format(loaded.paymentDueAt)}
        />
      ),
    });
  });
}

export function sendReservationRefused(reservationId: string, reason: string) {
  return safely(async () => {
    const loaded = await loadEmailData(reservationId);
    if (!loaded) return false;
    return sendEmail({
      to: loaded.to,
      replyTo: loaded.replyTo,
      subject: `Demande de réservation non retenue – ${loaded.data.reference}`,
      react: <ReservationRefusedEmail {...loaded.data} reason={reason} />,
    });
  });
}

/** Branché à l'étape 8 (webhook Stripe), PDF joints à l'étape 9. */
export function sendPaymentConfirmed(
  reservationId: string,
  attachments: { filename: string; content: Buffer }[] = [],
) {
  return safely(async () => {
    const loaded = await loadEmailData(reservationId);
    if (!loaded) return false;
    return sendEmail({
      to: loaded.to,
      replyTo: loaded.replyTo,
      subject: `Réservation confirmée – ${loaded.data.reference}`,
      react: <PaymentConfirmedEmail {...loaded.data} />,
      attachments,
    });
  });
}
