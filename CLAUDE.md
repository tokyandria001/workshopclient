@AGENTS.md

# Projet : réservation du Zénith de Bel Air

La référence fonctionnelle est [docs/SPECIFICATIONS.md](docs/SPECIFICATIONS.md). La lire avant toute nouvelle étape. Le développement suit le plan de la section 10, étape par étape : ne pas passer à l'étape suivante sans validation du développeur, et ne rien développer de la section 11 (hors périmètre) sans validation.

## Conventions

- Interface, contenus, messages d'erreur et noms de tests en **français**. Code (variables, fonctions, fichiers) en anglais, sauf les valeurs d'enum métier définies dans la spec (`EN_ATTENTE`, `SALLE`…).
- TypeScript strict, pas de `any`. Imports via l'alias `@/`.
- Mobile first : styles de base pour mobile, puis `sm:` / `md:` / `lg:`. Aucune page ne doit défiler horizontalement à 360 px.
- Logique métier dans `src/server/`, indépendante des pages et testée unitairement. Toute donnée entrante validée avec Zod côté serveur.
- Montants en centimes (entiers). Dates de réservation = dates calendaires, fuseau `Europe/Paris`.
- Composants shadcn/ui ajoutés avec `npx shadcn@latest add <composant>` dans `src/components/ui/`.
- Une branche par étape (`etape-N-<nom>`), commits conventionnels en français (`feat: …`, `fix: …`, `test: …`, `docs: …`, `chore: …`).

## Commandes de vérification

Avant de terminer une étape : `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`, `npm run build`.

Toujours lancer Vitest via `npm run test` (et non `npx vitest`) : voir la remarque Windows du README.

## Fin d'étape

Chaque étape se termine par : code fonctionnel, tests associés, documentation mise à jour, résumé de ce qui a été fait.
