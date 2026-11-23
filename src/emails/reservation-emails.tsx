// Modèles des e-mails envoyés au client (étape 7). Composants purs : toutes
// les données (déjà formatées en français) sont fournies par l'appelant.

import {
  ActionButton,
  EmailLayout,
  Paragraph,
  ReservationSummary,
  type Organization,
  type SummaryLine,
} from "./layout";

export type ReservationEmailData = {
  organization: Organization;
  firstName: string;
  reference: string;
  /** Période déjà formatée : « du lundi 1 mars 2027 au … ». */
  period: string;
  lines: SummaryLine[];
  total: string;
  deposit: string;
  /** Lien absolu vers la page de suivi. */
  trackingUrl: string;
};

export function ReservationReceivedEmail(data: ReservationEmailData) {
  return (
    <EmailLayout
      preview={`Demande ${data.reference} bien reçue`}
      organization={data.organization}
    >
      <Paragraph>Bonjour {data.firstName},</Paragraph>
      <Paragraph>
        Nous avons bien reçu votre demande de réservation. Notre équipe va
        l&apos;étudier et revient vers vous rapidement. Aucun paiement
        n&apos;est demandé à cette étape.
      </Paragraph>
      <ReservationSummary {...data} />
      <Paragraph>
        Vous pouvez suivre l&apos;avancement de votre demande à tout moment :
      </Paragraph>
      <ActionButton href={data.trackingUrl}>Suivre ma demande</ActionButton>
      <Paragraph>
        Conservez cet e-mail : le lien ci-dessus est personnel.
      </Paragraph>
    </EmailLayout>
  );
}

export function ReservationAcceptedEmail(
  data: ReservationEmailData & {
    /** Date limite de paiement déjà formatée (heure de Paris). */
    paymentDue: string;
  },
) {
  return (
    <EmailLayout
      preview={`Votre demande ${data.reference} est acceptée`}
      organization={data.organization}
    >
      <Paragraph>Bonjour {data.firstName},</Paragraph>
      <Paragraph>
        Bonne nouvelle : votre demande de réservation est acceptée. Pour la
        confirmer, merci de régler <strong>{data.total}</strong> en ligne avant
        le <strong>{data.paymentDue}</strong>. Passé ce délai, la demande sera
        annulée et les dates libérées.
      </Paragraph>
      <ReservationSummary {...data} />
      <ActionButton href={data.trackingUrl}>
        Accéder à ma réservation et payer
      </ActionButton>
      <Paragraph>
        Le paiement est sécurisé et réalisé par notre prestataire Stripe ; nous
        ne conservons aucune donnée bancaire. Une fois le paiement reçu, vous
        recevrez votre contrat de location et votre reçu.
      </Paragraph>
    </EmailLayout>
  );
}

export function ReservationRefusedEmail(
  data: ReservationEmailData & { reason: string },
) {
  return (
    <EmailLayout
      preview={`Votre demande ${data.reference} n'a pas pu être acceptée`}
      organization={data.organization}
    >
      <Paragraph>Bonjour {data.firstName},</Paragraph>
      <Paragraph>
        Nous sommes désolés : nous ne pouvons pas donner suite à votre demande
        de réservation {data.reference} ({data.period}).
      </Paragraph>
      <Paragraph>
        <strong>Motif :</strong> {data.reason}
      </Paragraph>
      <Paragraph>
        Aucun paiement n&apos;a été effectué. N&apos;hésitez pas à nous
        contacter ou à faire une nouvelle demande pour d&apos;autres dates.
      </Paragraph>
      <ActionButton href={data.trackingUrl}>Voir ma demande</ActionButton>
    </EmailLayout>
  );
}

/** Envoyé après paiement (branché aux étapes 8 et 9, avec les PDF joints). */
export function PaymentConfirmedEmail(data: ReservationEmailData) {
  return (
    <EmailLayout
      preview={`Réservation ${data.reference} confirmée`}
      organization={data.organization}
    >
      <Paragraph>Bonjour {data.firstName},</Paragraph>
      <Paragraph>
        Nous avons bien reçu votre paiement : votre réservation est confirmée.
        Vous trouverez en pièces jointes votre contrat de location et votre
        reçu.
      </Paragraph>
      <ReservationSummary {...data} />
      <ActionButton href={data.trackingUrl}>Voir ma réservation</ActionButton>
      <Paragraph>
        La caution indiquée ci-dessus vous sera demandée lors de la remise du
        matériel ou de l&apos;accès à la salle.
      </Paragraph>
    </EmailLayout>
  );
}
