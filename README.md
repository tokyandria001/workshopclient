# Zénith de Bel Air – Réservation en ligne

Application web de réservation de la salle et du matériel du Zénith de Bel Air : catalogue, demandes de réservation, paiement en ligne, contrats et reçus PDF, back-office et vitrine.

Projet réalisé dans le cadre du workshop client du MBA Développeur Full Stack (MyDigitalSchool).

Les spécifications complètes sont dans [docs/SPECIFICATIONS.md](docs/SPECIFICATIONS.md).

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind CSS 4 · shadcn/ui · Vitest · Playwright · ESLint · Prettier.

À venir (étapes suivantes) : PostgreSQL + Prisma, Auth.js, Stripe, Resend, @react-pdf/renderer.

## Prérequis

- Node.js 20.9 ou plus récent (développé avec Node 24)
- npm

## Installation

```bash
npm install                       # génère aussi le client Prisma
npx playwright install chromium   # navigateur pour les tests e2e
cp .env.example .env              # puis renseigner les valeurs
npm run db:deploy                 # applique les migrations
npm run db:seed                   # admin, salle, matériels et pages par défaut
npm run storage:setup             # crée le bucket des photos
```

La base de données est un PostgreSQL hébergé chez Supabase (région West EU – Irlande). Dans le tableau de bord Supabase, bouton **Connect** → onglet **ORMs** → **Prisma** : copier `DATABASE_URL` (port 6543) et `DIRECT_URL` (port 5432) dans `.env`.

Les photos sont stockées dans Supabase Storage (bucket public `ressources`). `STORAGE_URL` = URL du projet (`https://xxxx.supabase.co`) ; `STORAGE_KEY` = clé secrète (**Project Settings** → **API Keys** → **Secret keys**, `sb_secret_…`), utilisée uniquement côté serveur.

## Commandes

| Commande                   | Rôle                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `npm run dev`              | Serveur de développement sur http://localhost:3000                                   |
| `npm run build`            | Build de production                                                                  |
| `npm run start`            | Lance le build de production                                                         |
| `npm run lint`             | Analyse ESLint                                                                       |
| `npm run typecheck`        | Génère les types de routes Next.js et vérifie TypeScript                             |
| `npm run format`           | Formate le code avec Prettier                                                        |
| `npm run format:check`     | Vérifie le formatage sans modifier les fichiers                                      |
| `npm run test`             | Tests unitaires (Vitest)                                                             |
| `npm run test:watch`       | Tests unitaires en mode surveillance                                                 |
| `npm run test:integration` | Tests d'intégration sur la vraie base (concurrence des réservations)                 |
| `npm run test:e2e`         | Tests de bout en bout sur le build de production (port 3100, mobile 360 px + bureau) |
| `npm run db:migrate`       | Crée et applique une migration (développement)                                       |
| `npm run db:deploy`        | Applique les migrations existantes (production)                                      |
| `npm run db:seed`          | Insère les données de départ (relançable sans doublons)                              |
| `npm run db:studio`        | Ouvre Prisma Studio pour consulter les données                                       |
| `npm run storage:setup`    | Crée ou met à jour le bucket des photos (relançable)                                 |

## Structure

```
docs/            Spécifications et documentation du projet
prisma/          Schéma, migrations et seed de la base de données
scripts/         Scripts utilitaires (lanceur Vitest)
src/app/(public) Pages du site public
src/app/admin    Back-office
src/app/api      Webhooks Stripe, tâches planifiées, routes techniques
src/components   Composants UI (ui/ = shadcn/ui)
src/lib          Clients et utilitaires (prisma, auth, stripe, email, pdf…)
src/server       Logique métier (services) et actions serveur
src/types        Types partagés
tests/unit       Tests unitaires
tests/integration Tests d'intégration (base de données réelle)
tests/e2e        Tests de bout en bout
```

## Remarque Windows

`npm run test` passe par [scripts/run-vitest.mjs](scripts/run-vitest.mjs) : si le terminal ouvre le projet avec une lettre de lecteur en minuscule (`c:\`), Vitest échoue sinon avec « failed to find the current suite ». Toujours lancer les tests via les scripts npm plutôt qu'avec `npx vitest`.
