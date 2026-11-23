@AGENTS.md

# Projet : réservation du Zénith de Bel Air

La référence fonctionnelle est [docs/SPECIFICATIONS.md](docs/SPECIFICATIONS.md). La lire avant toute nouvelle étape. Le développement suit le plan de la section 10, étape par étape : ne pas passer à l'étape suivante sans validation du développeur, et ne rien développer de la section 11 (hors périmètre) sans validation.

## Conventions

- Interface, contenus, messages d'erreur et noms de tests en **français**. Code (variables, fonctions, fichiers) en anglais, sauf les valeurs d'enum métier définies dans la spec (`EN_ATTENTE`, `SALLE`…).
- TypeScript strict, pas de `any`. Imports via l'alias `@/`.
- Mobile first : styles de base pour mobile, puis `sm:` / `md:` / `lg:`. Aucune page ne doit défiler horizontalement à 360 px.
- Logique métier dans `src/server/`, indépendante des pages et testée unitairement. Toute donnée entrante validée avec Zod côté serveur.
- Montants en centimes (entiers). Dates de réservation = dates calendaires, fuseau `Europe/Paris`.

## Authentification du back-office (Auth.js v5)

- `src/proxy.ts` ne fait qu'une redirection rapide (cookie uniquement) : **ce n'est pas une protection suffisante**.
- **Chaque page, action serveur et route du back-office doit appeler `requireAdmin()`** (`@/server/auth/session`) avant toute lecture ou écriture. Dans une page, l'appeler dans un composant placé sous `<Suspense>` (exigence de Next.js 16 avec `cacheComponents`).
- Pages du back-office dans `src/app/admin/(espace)/` (en-tête + déconnexion) ; la page de connexion est hors de ce groupe.
- Session JWT de 8 h, `AUTH_SECRET` obligatoire dans `.env`.

## Base de données (Prisma 7 + Supabase)

- Schéma : `prisma/schema.prisma`. Client généré dans `src/generated/prisma` (ignoré par Git, régénéré par `postinstall`). Importer `prisma` depuis `@/lib/prisma` (serveur uniquement), les types depuis `@/generated/prisma/client`.
- `DATABASE_URL` (pooler, port 6543) pour l'application ; `DIRECT_URL` (port 5432) pour la CLI Prisma (`prisma.config.ts`).
- Après chaque modification du schéma : `npm run db:migrate -- --name <nom>`.
- **Toute nouvelle table** doit recevoir `ALTER TABLE "<Table>" ENABLE ROW LEVEL SECURITY;` dans sa migration (défense en profondeur, voir la migration `enable_rls`).
- Seed idempotent (`upsert` avec `update: {}`) : ne jamais écraser des données modifiées depuis le back-office.
- Ne jamais lancer `prisma migrate reset` ni `db push --force-reset` sans l'accord explicite du développeur.
- Composants shadcn/ui ajoutés avec `npx shadcn@latest add <composant>` dans `src/components/ui/`.
- Une branche par étape (`etape-N-<nom>`), commits conventionnels en français (`feat: …`, `fix: …`, `test: …`, `docs: …`, `chore: …`).

## Commandes de vérification

Avant de terminer une étape : `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build`.

Toujours lancer Vitest via `npm run test` (et non `npx vitest`) : voir la remarque Windows du README.

## Fin d'étape

Chaque étape se termine par : code fonctionnel, tests associés, documentation mise à jour, résumé de ce qui a été fait.
