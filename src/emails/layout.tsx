import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

/** Coordonnées de l'organisation, lues dans les paramètres (section 6.7). */
export type Organization = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
};

const colors = {
  text: "#171717",
  muted: "#6b6b6b",
  border: "#e5e5e5",
  primary: "#171717",
};

export function EmailLayout({
  preview,
  organization,
  children,
}: {
  preview: string;
  organization: Organization;
  children: React.ReactNode;
}) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: "#f6f6f6",
          color: colors.text,
          fontFamily: "Arial, Helvetica, sans-serif",
          margin: 0,
          padding: "24px 0",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            maxWidth: 560,
            padding: "24px 28px",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px" }}>
            {organization.name}
          </Text>
          {children}
          <Hr style={{ borderColor: colors.border, margin: "24px 0 12px" }} />
          <Text style={{ color: colors.muted, fontSize: 12, margin: 0 }}>
            {organization.name}
            {organization.address && <> · {organization.address}</>}
            {organization.phone && <> · {organization.phone}</>}
            {organization.email && <> · {organization.email}</>}
          </Text>
          <Text
            style={{ color: colors.muted, fontSize: 12, margin: "4px 0 0" }}
          >
            Vous recevez ce message car vous avez fait une demande de
            réservation sur notre site.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <Text style={{ fontSize: 15, lineHeight: "22px", margin: "0 0 12px" }}>
      {children}
    </Text>
  );
}

export function ActionButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Section style={{ margin: "20px 0" }}>
      <Button
        href={href}
        style={{
          backgroundColor: colors.primary,
          borderRadius: 6,
          color: "#ffffff",
          fontSize: 15,
          fontWeight: 600,
          padding: "12px 20px",
          textDecoration: "none",
        }}
      >
        {children}
      </Button>
    </Section>
  );
}

export type SummaryLine = { label: string; amount: string };

/** Récapitulatif de la réservation (lignes, total, caution). */
export function ReservationSummary({
  reference,
  period,
  lines,
  total,
  deposit,
}: {
  reference: string;
  period: string;
  lines: SummaryLine[];
  total: string;
  deposit: string;
}) {
  const row = { fontSize: 14, margin: "0 0 4px" };
  return (
    <Section
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        margin: "16px 0",
        padding: "12px 16px",
      }}
    >
      <Text style={{ ...row, fontWeight: 700 }}>Réservation {reference}</Text>
      <Text style={{ ...row, color: colors.muted, marginBottom: 8 }}>
        Location {period}
      </Text>
      {lines.map((line) => (
        <Text key={line.label} style={row}>
          {line.label} : {line.amount}
        </Text>
      ))}
      <Text style={{ ...row, fontWeight: 700, marginTop: 8 }}>
        Total : {total}
      </Text>
      <Text style={{ ...row, color: colors.muted }}>
        Caution (non prélevée en ligne) : {deposit}
      </Text>
    </Section>
  );
}
