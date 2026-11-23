// Données de départ insérées par prisma/seed.ts.
//
// Les tarifs, cautions et quantités sont des EXEMPLES, à remplacer par les
// valeurs réelles après le cadrage avec la cliente (questions 2 et 3 de la
// section 12 des spécifications). Ils restent modifiables depuis le back-office.

import type { PriceUnit, ResourceType } from "../src/generated/prisma/enums";

export type SeedResource = {
  /** Identifiant fixe : permet de relancer le seed sans créer de doublons. */
  id: string;
  type: ResourceType;
  name: string;
  description: string;
  priceCents: number;
  priceUnit: PriceUnit;
  depositCents: number;
  quantityTotal: number;
};

export const seedResources: SeedResource[] = [
  {
    id: "seed-salle",
    type: "SALLE",
    name: "Salle de spectacle",
    description:
      "Salle de 550 m² pour vos spectacles, concerts, conférences et événements.",
    priceCents: 80000,
    priceUnit: "JOUR",
    depositCents: 150000,
    quantityTotal: 1,
  },
  {
    id: "seed-enceinte",
    type: "MATERIEL",
    name: "Enceinte amplifiée",
    description:
      "Enceinte active 1000 W, idéale pour la sonorisation de salle.",
    priceCents: 4000,
    priceUnit: "JOUR",
    depositCents: 30000,
    quantityTotal: 4,
  },
  {
    id: "seed-table-mixage",
    type: "MATERIEL",
    name: "Table de mixage",
    description: "Console de mixage 16 voies avec effets intégrés.",
    priceCents: 6000,
    priceUnit: "JOUR",
    depositCents: 50000,
    quantityTotal: 1,
  },
  {
    id: "seed-micro",
    type: "MATERIEL",
    name: "Micro sans fil",
    description: "Micro main sans fil avec récepteur.",
    priceCents: 1500,
    priceUnit: "JOUR",
    depositCents: 10000,
    quantityTotal: 6,
  },
  {
    id: "seed-projecteur-led",
    type: "MATERIEL",
    name: "Projecteur LED",
    description: "Projecteur LED RGBW pour l'éclairage de scène.",
    priceCents: 2000,
    priceUnit: "JOUR",
    depositCents: 15000,
    quantityTotal: 8,
  },
  {
    id: "seed-videoprojecteur",
    type: "MATERIEL",
    name: "Vidéoprojecteur",
    description: "Vidéoprojecteur haute luminosité avec écran de projection.",
    priceCents: 5000,
    priceUnit: "FORFAIT",
    depositCents: 40000,
    quantityTotal: 1,
  },
];

export type SeedPage = { slug: string; title: string; content: string };

const aCompleter = "_Contenu à compléter depuis le back-office._";

export const seedPages: SeedPage[] = [
  {
    slug: "accueil",
    title: "Accueil",
    content: `Bienvenue au Zénith de Bel Air, salle de spectacle de 550 m².\n\n${aCompleter}`,
  },
  {
    slug: "association",
    title: "L'association",
    content: `Présentation de l'association qui soutient le projet du Zénith de Bel Air.\n\n${aCompleter}`,
  },
  {
    slug: "mentions-legales",
    title: "Mentions légales",
    content: aCompleter,
  },
  {
    slug: "confidentialite",
    title: "Politique de confidentialité",
    content: aCompleter,
  },
  {
    slug: "conditions-generales",
    title: "Conditions générales de location",
    content: aCompleter,
  },
];

/** Paramètres de l'organisation (section 6.7), modifiables dans le back-office. */
export const seedSettings: Record<string, string> = {
  "organisation.nom": "Zénith de Bel Air",
  "organisation.adresse": "",
  "organisation.siret": "",
  "organisation.email": "",
  "organisation.telephone": "",
  "paiement.delaiHeures": "72",
};
