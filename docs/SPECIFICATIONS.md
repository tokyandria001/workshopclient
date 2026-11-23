# Spécifications – Application de réservation du Zénith de Bel Air

> Document de référence pour le développement.
> Projet réalisé dans le cadre du workshop client du MBA Développeur Full Stack (MyDigitalSchool), de février à juin 2027.
> **Statut : version initiale, avant cadrage.** Les règles métier marquées _(à valider)_ doivent être confirmées avec la cliente lors de la réunion de cadrage, puis ce document doit être mis à jour.

---

## 1. Contexte

### 1.1 La cliente

Christelle Duquenoy est propriétaire de l'ancien Zénith de Bel Air, une salle de 550 m² en travaux pour devenir une salle de spectacle. Son projet global comprend aussi une pizzeria et un espace de coworking. Elle loue du matériel, et une association liée au projet aide à financer les travaux.

### 1.2 Le besoin

Aujourd'hui, les locations ne disposent pas d'outil dédié. La cliente souhaite une application web, utilisable sur mobile, permettant de :

1. louer la salle et du matériel en ligne ;
2. suivre la restitution du matériel ;
3. payer en ligne ;
4. générer des contrats et des reçus ;
5. présenter l'association et l'avancement des travaux (vitrine).

### 1.3 Principe de réalisation

Validé par le référent pédagogique : **toutes les fonctionnalités sont livrées dans une première version simple (MVP)**. Les améliorations sont listées en section 11 et ne doivent pas être développées sans validation.

---

## 2. Contraintes et critères d'évaluation

L'application est évaluée selon la grille suivante. Chaque étape de développement doit en tenir compte.

| Critère                                 | Points | Conséquence pour le développement                                                                   |
| --------------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| Structuration technique de qualité      | 5      | Architecture claire, code typé, séparation des responsabilités, conventions homogènes.              |
| Contraintes d'hébergement anticipées    | 3      | Choix d'hébergement documenté, variables d'environnement, données en région européenne.             |
| Back-office avec spécifications écrites | 5      | Back-office complet + document `docs/BACK-OFFICE.md` (spécifications fonctionnelles et techniques). |
| Recettage formalisé et corrections      | 4      | Tests automatisés + cahier de recette `docs/RECETTE.md`.                                            |
| Responsive et mobile first              | 3      | Conception d'abord pour mobile, vérifiée sur plusieurs tailles d'écran.                             |

Contraintes supplémentaires :

- **RGPD** : collecter uniquement les données nécessaires, données hébergées en Europe, mentions légales et politique de confidentialité.
- **Sécurité** : aucune donnée bancaire stockée (paiement hébergé par Stripe), back-office protégé par authentification.
- **Maintenance** : la cliente doit pouvoir administrer l'outil sans toucher au code.
- **Langue** : interface entièrement en français. Fuseau horaire d'affichage : `Europe/Paris`.

---

## 3. Stack technique

| Besoin                       | Choix                                                   |
| ---------------------------- | ------------------------------------------------------- |
| Framework                    | Next.js (App Router), TypeScript en mode strict         |
| Interface                    | Tailwind CSS + shadcn/ui                                |
| Base de données              | PostgreSQL (Supabase ou Neon, région européenne)        |
| ORM                          | Prisma                                                  |
| Validation des données       | Zod                                                     |
| Authentification back-office | Auth.js (connexion par e-mail et mot de passe)          |
| Paiement                     | Stripe Checkout + webhooks (mode test en développement) |
| Génération PDF               | @react-pdf/renderer                                     |
| E-mails                      | Resend (ou Brevo)                                       |
| Stockage des images          | Supabase Storage (ou équivalent compatible S3)          |
| Tests                        | Vitest (unitaires), Playwright (bout en bout)           |
| Qualité                      | ESLint, Prettier                                        |
| Hébergement                  | Vercel (région européenne pour les fonctions)           |
| Versionnement                | GitHub, une branche par étape, commits conventionnels   |

> Si le développeur préfère une autre stack, mettre à jour cette section **avant** de commencer l'étape 0.

---

## 4. Rôles

| Rôle              | Description                                                                                                    | Accès                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Visiteur / client | Toute personne qui consulte le site et réserve. Pas de compte : il renseigne ses coordonnées à la réservation. | Site public            |
| Administrateur    | La cliente et son équipe.                                                                                      | Back-office (`/admin`) |

Un seul rôle administrateur dans le MVP (pas de gestion fine des permissions).

---

## 5. Fonctionnalités – Front-office (site public)

### 5.1 Accueil et vitrine

- Page d'accueil : présentation du lieu, mise en avant de la salle et du matériel, lien vers la réservation.
- Page **Association** : présentation, objectifs, lien éventuel vers une page de soutien (dons).
- Page **Avancement des travaux** : liste chronologique des actualités (titre, date, texte, photo).
- Pages **Mentions légales**, **Politique de confidentialité**, **Conditions générales de location**.
- Tout ce contenu est modifiable depuis le back-office.

### 5.2 Catalogue

- Liste des ressources actives : la salle et le matériel, avec filtre par type.
- Fiche ressource : nom, description, photos, tarif, caution, quantité disponible.

### 5.3 Réservation

1. Le visiteur choisit une **date de début** et une **date de fin**.
2. Il ajoute une ou plusieurs ressources avec une quantité (la salle : quantité 1).
3. L'application **vérifie la disponibilité** en temps réel (voir section 7).
4. Il renseigne ses coordonnées : nom, prénom, e-mail, téléphone, organisation (facultatif), message (facultatif).
5. Il accepte les conditions générales de location (case obligatoire).
6. Il voit le récapitulatif : ressources, dates, montant total, caution.
7. Il envoie sa **demande de réservation** → statut `EN_ATTENTE`.
8. Il reçoit un e-mail de confirmation de réception de la demande.

### 5.4 Paiement

- Après acceptation par l'administrateur, le client reçoit un e-mail avec le lien vers sa **page de suivi** (section 5.5), qui affiche un bouton **« Payer »** et la date limite de paiement.
- Le clic sur « Payer » crée une session Stripe Checkout à la volée (une session Stripe expire au maximum 24 h après sa création, elle ne peut donc pas porter le délai de paiement de la réservation). Si une session encore ouverte existe déjà, elle est réutilisée.
- Après paiement, il est redirigé vers une page de confirmation.
- Il reçoit un e-mail avec le **contrat** et le **reçu** en PDF.

### 5.5 Suivi de réservation

- Page accessible via un lien unique et sécurisé (jeton) envoyé par e-mail : statut, récapitulatif, bouton de paiement (statut `A_PAYER` uniquement), téléchargement des documents.
- Pas de compte client dans le MVP.

---

## 6. Fonctionnalités – Back-office (`/admin`)

### 6.1 Authentification

- Connexion par e-mail et mot de passe. Mots de passe hachés.
- Toutes les routes `/admin` et les actions d'administration sont protégées côté serveur.
- Premier compte administrateur créé par le script de seed.

### 6.2 Tableau de bord

- Nombre de demandes en attente, réservations à venir, matériel actuellement sorti, retours en retard.
- Liste des prochaines réservations.

### 6.3 Gestion des ressources

- Créer, modifier, désactiver une ressource (pas de suppression définitive si elle a des réservations).
- Champs : type (`SALLE` / `MATERIEL`), nom, description, photos, tarif, unité de tarif, caution, quantité totale, actif.

### 6.4 Gestion des réservations

- Liste filtrable par statut, date, client.
- Fiche réservation : client, ressources, dates, montants, historique des statuts, paiement, documents.
- Actions selon le statut : **accepter**, **refuser** (avec motif), **annuler** (avec motif), **marquer comme sorti**, **marquer comme restitué** (avec remarque sur l'état du matériel).
- Accepter une demande revérifie la disponibilité, passe la réservation en `A_PAYER`, fixe la date limite de paiement (`paymentDueAt`) et envoie au client l'e-mail contenant le lien vers sa page de suivi.
- Un paiement reçu sur une réservation qui n'est plus `A_PAYER` (expirée ou annulée entre-temps) est enregistré et signalé dans la fiche pour remboursement manuel.

### 6.5 Planning

- Vue calendrier (mois / semaine) des réservations, avec code couleur par statut.
- Vue « matériel sorti » : ce qui est en location et les dates de retour prévues.

### 6.6 Gestion de la vitrine

- Modifier les pages (accueil, association, mentions légales, confidentialité, conditions générales).
- Créer, modifier, publier ou dépublier les actualités sur l'avancement des travaux.
- Éditeur simple (Markdown ou éditeur riche léger) + ajout d'une image.

### 6.7 Paramètres

- Coordonnées de l'organisation (nom, adresse, SIRET, e-mail, téléphone) utilisées dans les PDF et les e-mails.
- Délai de paiement après acceptation _(à valider, par défaut 72 h)_. Ce délai est géré par l'application (`paymentDueAt`), pas par Stripe.

---

## 7. Règles métier

### 7.1 Disponibilité

- Une réservation occupe une ressource du **début** à la **fin** (dates incluses, granularité : la journée) _(à valider : journée ou demi-journée)_.
- Seules les réservations aux statuts `EN_ATTENTE`, `A_PAYER`, `CONFIRMEE` et `EN_COURS` bloquent du stock.
- **Salle** : disponible si aucune réservation bloquante ne chevauche la période.
- **Matériel** : quantité disponible = quantité totale − **pic journalier** des quantités réservées sur la période, c'est-à-dire le maximum, sur chaque jour de la période, de la somme des quantités des réservations bloquantes qui couvrent ce jour. _(Décision du développeur : une somme simple sur toute la période refuserait des locations possibles, par exemple deux réservations successives qui ne se chevauchent pas entre elles.)_
- La vérification est faite **côté serveur** au moment de l'envoi de la demande, puis de nouveau au moment de l'acceptation, pour éviter les doubles réservations.
- **Concurrence** : une transaction seule ne suffit pas sous PostgreSQL (isolation `READ COMMITTED` par défaut). La vérification et l'écriture se font dans une transaction qui **verrouille les lignes `Resource` concernées** (`SELECT … FOR UPDATE`, dans un ordre stable par `id` pour éviter les interblocages). Deux demandes simultanées sur la même ressource sont ainsi traitées l'une après l'autre.
- Les dates sont des **dates calendaires** (sans heure), interprétées dans le fuseau `Europe/Paris`. Deux réservations se chevauchent si `debutA <= finB` et `debutB <= finA`.

### 7.2 Statuts d'une réservation

```
EN_ATTENTE ──accepter──► A_PAYER ──paiement reçu──► CONFIRMEE ──sortie──► EN_COURS ──restitution──► TERMINEE
   │    │                 │    │                        │
refuser annuler     expiration annuler               annuler
   ▼    ▼                 ▼    ▼                        ▼
REFUSEE ANNULEE      EXPIREE  ANNULEE                ANNULEE
```

Transitions autorisées (toute autre transition est refusée côté serveur) :

| Depuis       | Vers        | Déclencheur                                                  |
| ------------ | ----------- | ------------------------------------------------------------ |
| `EN_ATTENTE` | `A_PAYER`   | Administrateur (accepter)                                    |
| `EN_ATTENTE` | `REFUSEE`   | Administrateur (refuser, motif obligatoire)                  |
| `EN_ATTENTE` | `ANNULEE`   | Administrateur (annuler, par ex. à la demande du client)     |
| `A_PAYER`    | `CONFIRMEE` | Système (webhook Stripe)                                     |
| `A_PAYER`    | `EXPIREE`   | Système (délai de paiement dépassé)                          |
| `A_PAYER`    | `ANNULEE`   | Administrateur                                               |
| `CONFIRMEE`  | `EN_COURS`  | Administrateur (marquer comme sorti)                         |
| `CONFIRMEE`  | `ANNULEE`   | Administrateur (remboursement manuel)                        |
| `EN_COURS`   | `TERMINEE`  | Administrateur (marquer comme restitué, remarque sur l'état) |

- `EN_ATTENTE` : demande envoyée par le client.
- `A_PAYER` : acceptée par l'administrateur, e-mail avec lien vers la page de paiement envoyé.
- `EXPIREE` : paiement non reçu avant `paymentDueAt`. Le passage en `EXPIREE` est déclenché par une tâche planifiée quotidienne (Vercel Cron, route `/api/cron/expire` protégée par `CRON_SECRET`), et vérifié aussi à l'ouverture de la page de suivi et au clic sur « Payer ».
- `CONFIRMEE` : paiement reçu (webhook Stripe), contrat et reçu générés.
- `EN_COURS` : matériel sorti / salle occupée (`checkedOutAt` renseigné).
- `TERMINEE` : matériel restitué / location terminée (`returnedAt` renseigné).
- `REFUSEE`, `ANNULEE` : fins anticipées. Le remboursement éventuel se fait manuellement dans Stripe pour le MVP.
- **Retard** : une réservation `EN_COURS` dont la date de fin est passée est considérée en retard.
- Chaque changement de statut est enregistré dans un historique (date, ancien statut, nouveau statut, auteur, commentaire). Le motif de refus ou d'annulation et la remarque de restitution sont stockés dans le commentaire. L'auteur vaut l'e-mail de l'administrateur, ou `systeme` pour les transitions automatiques.

### 7.3 Tarifs

- Tarif par ressource et par unité : `JOUR` ou `FORFAIT` _(à valider avec la cliente)_.
- Montant d'une ligne = tarif × quantité × nombre de jours (ou × quantité pour un forfait).
- **Tous les montants sont stockés en centimes (entiers).**
- La caution est affichée et indiquée sur le contrat, mais **n'est pas encaissée en ligne** dans le MVP _(à valider)_.

### 7.4 Documents

- **Contrat de location** (PDF) : numéro, date, parties, ressources, dates, montants, caution, conditions générales de location, mention d'acceptation en ligne.
- **Reçu** (PDF) : numéro, date de paiement, montant payé, moyen de paiement, référence Stripe.
- Numérotation unique et séquentielle par année, par exemple `CTR-2027-0001` et `REC-2027-0001`. Les numéros sont attribués via la table `DocumentCounter`, incrémentée dans une transaction (`UPDATE … SET value = value + 1 RETURNING value`), pour éviter les doublons si deux webhooks arrivent en même temps.
- Les documents sont générés une seule fois et stockés ; ils ne sont pas régénérés si les paramètres changent ensuite.
- Les PDF contiennent des données personnelles : ils sont stockés dans un **bucket privé**. La base conserve la clé de stockage (`storageKey`), et le téléchargement passe par une **URL signée à durée courte**, générée après vérification du jeton client ou de la session administrateur.

### 7.5 Données personnelles (RGPD)

- Seules les données listées en section 5.3 sont collectées.
- Durée de conservation des données clients _(à valider, voir question 12)_. Les contrats et reçus peuvent devoir être conservés plus longtemps pour des raisons comptables.

---

## 8. Modèle de données (Prisma, indicatif)

```prisma
enum ResourceType { SALLE MATERIEL }
enum PriceUnit { JOUR FORFAIT }
enum ReservationStatus { EN_ATTENTE A_PAYER EXPIREE CONFIRMEE EN_COURS TERMINEE REFUSEE ANNULEE }
enum PaymentStatus { EN_ATTENTE PAYE ECHOUE REMBOURSE }
enum DocumentType { CONTRAT RECU }

model AdminUser {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  createdAt    DateTime @default(now())
}

model Resource {
  id            String       @id @default(cuid())
  type          ResourceType
  name          String
  description   String
  images        String[]
  priceCents    Int
  priceUnit     PriceUnit
  depositCents  Int          @default(0)
  quantityTotal Int          @default(1)
  active        Boolean      @default(true)
  items         ReservationItem[]
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}

model Customer {
  id           String   @id @default(cuid())
  firstName    String
  lastName     String
  email        String
  phone        String
  organization String?
  reservations Reservation[]
  createdAt    DateTime @default(now())
}

model Reservation {
  id          String            @id @default(cuid())
  reference   String            @unique
  accessToken String            @unique
  customer    Customer          @relation(fields: [customerId], references: [id])
  customerId  String
  startDate   DateTime          @db.Date
  endDate     DateTime          @db.Date
  status      ReservationStatus @default(EN_ATTENTE)
  paymentDueAt DateTime?
  checkedOutAt DateTime?
  returnedAt   DateTime?
  totalCents  Int
  depositCents Int
  message     String?
  adminNote   String?
  termsAcceptedAt DateTime
  items       ReservationItem[]
  payments    Payment[]
  documents   Document[]
  history     StatusChange[]
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@index([status])
  @@index([startDate, endDate])
}

model ReservationItem {
  id             String      @id @default(cuid())
  reservation    Reservation @relation(fields: [reservationId], references: [id])
  reservationId  String
  resource       Resource    @relation(fields: [resourceId], references: [id])
  resourceId     String
  quantity       Int
  unitPriceCents Int
  subtotalCents  Int
}

model Payment {
  id              String        @id @default(cuid())
  reservation     Reservation   @relation(fields: [reservationId], references: [id])
  reservationId   String
  stripeSessionId String        @unique
  amountCents     Int
  status          PaymentStatus @default(EN_ATTENTE)
  paidAt          DateTime?
  expiresAt       DateTime      // expiration de la session Stripe (≤ 24 h), distincte de Reservation.paymentDueAt
  needsRefund     Boolean       @default(false) // paiement reçu sur une réservation qui n'était plus A_PAYER
  createdAt       DateTime      @default(now())
}

model Document {
  id            String       @id @default(cuid())
  reservation   Reservation  @relation(fields: [reservationId], references: [id])
  reservationId String
  type          DocumentType
  number        String       @unique
  storageKey    String       // chemin dans le bucket privé, jamais d'URL publique
  createdAt     DateTime     @default(now())

  @@unique([reservationId, type])
}

model DocumentCounter {
  type  DocumentType
  year  Int
  value Int          @default(0)

  @@id([type, year])
}

model StatusChange {
  id            String            @id @default(cuid())
  reservation   Reservation       @relation(fields: [reservationId], references: [id])
  reservationId String
  fromStatus    ReservationStatus?
  toStatus      ReservationStatus
  author        String
  comment       String?
  createdAt     DateTime          @default(now())
}

model Page {
  id        String   @id @default(cuid())
  slug      String   @unique
  title     String
  content   String
  updatedAt DateTime @updatedAt
}

model NewsPost {
  id          String    @id @default(cuid())
  title       String
  content     String
  imageUrl    String?
  published   Boolean   @default(false)
  publishedAt DateTime?
  createdAt   DateTime  @default(now())
}

model Setting {
  key   String @id
  value String
}
```

---

## 9. Architecture du projet (indicative)

```
/
├── CLAUDE.md
├── docs/
│   ├── SPECIFICATIONS.md     ← ce document
│   ├── BACK-OFFICE.md        ← spécifications du back-office (étape 15)
│   ├── ARCHITECTURE.md       ← choix techniques et hébergement (étape 15)
│   ├── RECETTE.md            ← cahier de recette (étape 13)
│   └── GUIDE-UTILISATEUR.md  ← guide pour la cliente (étape 15)
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (public)/         ← pages du site public
│   │   ├── admin/            ← back-office
│   │   └── api/              ← webhooks Stripe, tâches planifiées (cron), routes techniques
│   ├── components/           ← composants UI réutilisables
│   ├── lib/                  ← prisma, auth, stripe, email, pdf, utilitaires
│   ├── server/               ← logique métier (services) et actions serveur
│   └── types/
├── tests/
│   ├── unit/
│   └── e2e/
└── .env.example
```

Principes :

- La **logique métier** (disponibilités, calcul des montants, transitions de statut) est isolée dans `src/server/` et testée unitairement, indépendamment des pages.
- Toute donnée entrante est validée avec Zod côté serveur.
- Les transitions de statut passent par une seule fonction qui vérifie qu'elles sont autorisées (tableau de la section 7.2) et écrit l'historique.
- Les dates calendaires sont manipulées sans heure et converties depuis/vers `Europe/Paris` à un seul endroit (`src/lib/dates.ts`).

### Variables d'environnement (`.env.example`)

```
DATABASE_URL=
AUTH_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
EMAIL_FROM=
STORAGE_URL=
STORAGE_KEY=
APP_URL=
CRON_SECRET=
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
```

---

## 10. Plan de développement, étape par étape

Chaque étape se termine par : le code fonctionnel, les tests associés, la mise à jour de la documentation, et un résumé de ce qui a été fait. **Ne pas passer à l'étape suivante sans validation du développeur.**

### Étape 0 – Initialisation

- Créer le projet Next.js (TypeScript strict, App Router, ESLint, Prettier, Tailwind, shadcn/ui).
- Configurer Vitest et Playwright.
- Créer `.env.example` et un README avec les commandes de lancement.
- **Critères d'acceptation** : `npm run dev`, `npm run lint` et `npm run test` fonctionnent ; page d'accueil vide responsive.

### Étape 1 – Base de données

- Écrire le schéma Prisma (section 8), la première migration et un script de seed : un administrateur, la salle, 5 matériels d'exemple, les pages par défaut.
- **Critères** : migration appliquée, seed exécutable, données visibles dans Prisma Studio.

### Étape 2 – Authentification du back-office

- Page `/admin/connexion`, déconnexion, protection de toutes les routes et actions `/admin`.
- **Critères** : impossible d'accéder à `/admin` sans être connecté ; test e2e de connexion.

### Étape 3 – Gestion des ressources (back-office)

- Liste, création, modification, désactivation, envoi de photos.
- **Critères** : CRUD complet, validation des formulaires, affichage mobile correct.

### Étape 4 – Catalogue public

- Pages liste et fiche ressource.
- **Critères** : seules les ressources actives sont visibles ; affichage mobile first.

### Étape 5 – Disponibilités et demande de réservation

- Service de calcul des disponibilités (section 7.1) avec **tests unitaires complets** (chevauchements, bornes, quantités, statuts bloquants).
- Service de calcul des montants (section 7.3) avec tests unitaires.
- Parcours de réservation public (section 5.3), création de la réservation `EN_ATTENTE` dans une transaction avec verrouillage des ressources (section 7.1).
- **Critères** : impossible de réserver au-delà du stock, y compris avec deux demandes simultanées (test d'intégration) ; test e2e d'une demande complète.

### Étape 6 – Gestion des réservations et planning (back-office)

- Liste, fiche, actions et transitions de statut avec historique (section 7.2).
- Tableau de bord et planning (sections 6.2 et 6.5).
- **Critères** : transitions interdites refusées côté serveur ; tests unitaires de la machine à états.

### Étape 7 – E-mails

- Modèles d'e-mails : demande reçue, demande acceptée (avec lien de paiement), demande refusée, paiement confirmé (avec PDF), rappel de restitution _(optionnel)_.
- **Critères** : e-mails envoyés en environnement de test, contenu en français, liens valides.

### Étape 8 – Paiement Stripe

- Bouton « Payer » sur la page de suivi : création d'une session Stripe Checkout à la volée (ou réutilisation d'une session encore ouverte), uniquement si la réservation est `A_PAYER` et que `paymentDueAt` n'est pas dépassé.
- Webhook `checkout.session.completed` : passage en `CONFIRMEE`, enregistrement du paiement. Webhook vérifié par signature et idempotent. Paiement reçu sur une réservation qui n'est plus `A_PAYER` → `needsRefund` et signalement dans le back-office.
- Tâche planifiée `/api/cron/expire` (Vercel Cron, protégée par `CRON_SECRET`) : réservations `A_PAYER` dont `paymentDueAt` est dépassé → `EXPIREE`.
- **Critères** : paiement de test réussi de bout en bout ; un même webhook reçu deux fois ne crée pas de doublon ; une réservation non payée dans le délai passe en `EXPIREE` et libère le stock.

### Étape 9 – Contrats et reçus PDF

- Génération du contrat et du reçu (section 7.4) après paiement, stockage dans un bucket privé, numérotation séquentielle via `DocumentCounter`.
- Téléchargement par URL signée depuis le back-office et depuis la page de suivi client.
- **Critères** : PDF lisibles, numéros uniques (y compris en cas de générations simultanées), mentions complètes, aucun PDF accessible sans autorisation.

### Étape 10 – Restitution du matériel

- Actions « sorti » et « restitué » avec remarque sur l'état (renseignent `checkedOutAt` / `returnedAt`) ; vue du matériel sorti et des retours en retard.
- **Critères** : le stock redevient disponible après restitution ; retards visibles dans le tableau de bord.

### Étape 11 – Vitrine et contenus

- Pages publiques Association, Avancement des travaux, Mentions légales, Confidentialité, Conditions générales.
- Gestion de ces contenus et des actualités dans le back-office.
- **Critères** : la cliente peut modifier tous les textes sans toucher au code.

### Étape 12 – Responsive, accessibilité et finitions

- Vérification de toutes les pages sur mobile (360 px), tablette et ordinateur.
- Accessibilité de base : contrastes, libellés de formulaires, navigation au clavier.
- Pages d'erreur 404 et 500, états vides et messages de chargement.
- **Critères** : aucun défilement horizontal sur mobile ; audit Lighthouse sans erreur bloquante.

### Étape 13 – Tests et recette

- Compléter les tests unitaires et e2e des parcours principaux.
- Rédiger `docs/RECETTE.md` : liste des cas de test (identifiant, scénario, résultat attendu, résultat obtenu, statut, correction), à faire exécuter par la cliente.
- **Critères** : tous les tests passent ; cahier de recette prêt à être utilisé.

### Étape 14 – Déploiement

- Déploiement sur l'hébergement retenu, base de données de production en région européenne, variables d'environnement, webhook Stripe de production, domaine.
- **Critères** : application accessible en ligne en HTTPS ; parcours complet testé en production avec Stripe en mode test.

### Étape 15 – Documentation finale

- `docs/BACK-OFFICE.md` : pour chaque écran du back-office, son objectif, ses fonctionnalités, ses règles et sa réalisation technique.
- `docs/ARCHITECTURE.md` : schéma d'architecture, choix techniques justifiés, hébergement, sécurité, RGPD, limites connues.
- `docs/GUIDE-UTILISATEUR.md` : guide simple pour la cliente, avec captures d'écran.
- README à jour.

---

## 11. Hors périmètre du MVP (améliorations futures)

À ne pas développer sans validation :

- Comptes clients avec historique.
- Encaissement de la caution en ligne et remboursements automatiques.
- Signature électronique des contrats.
- Réservation à l'heure ou à la demi-journée _(selon le cadrage)_.
- Gestion de plusieurs administrateurs avec des droits différents.
- Facturation complète et export comptable.
- Réservation de l'espace de coworking ou de la pizzeria.
- Application mobile native.
- Multilingue.

---

## 12. Questions à valider avec la cliente (cadrage)

1. Quelle structure loue la salle et le matériel (entreprise, association) ? Qui est le titulaire du compte Stripe ?
2. Liste du matériel, quantités, tarifs et cautions.
3. Tarifs et conditions de location de la salle.
4. Granularité des réservations : journée, demi-journée, heure ?
5. Toute demande doit-elle être validée manuellement, ou certaines réservations peuvent-elles être confirmées directement ?
6. Délai de paiement après acceptation.
7. Conditions d'annulation et de remboursement.
8. Gestion de la caution.
9. Contenu attendu du contrat et du reçu ; existe-t-il déjà des modèles ?
10. Contenu de la vitrine : textes, photos, fréquence des actualités sur les travaux.
11. Nom de domaine et hébergement existants.
12. Durée de conservation des données clients et des documents (contrats, reçus).
