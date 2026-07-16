# ADR-001 — Mono-app Expo + yarn (pas de monorepo)

**Statut** : accepté (arbitrage Cédric, 16/07/2026 — plan d'implémentation v1.1)

## Contexte

Le MVP Runly (~15 écrans, spec v0.3) pouvait s'organiser en monorepo
(Turborepo/pnpm, packages séparés pour le moteur, les schémas, l'UI) ou en
projet Expo unique.

## Décision

**Un seul projet Expo géré avec yarn.** Pas de monorepo, pas de
Turborepo/pnpm. La séparation des responsabilités se fait par modules
internes (`src/schemas`, `src/training-engine`, `src/ui`, `src/features`,
`src/services`, `src/i18n`, `src/lib`), avec des frontières entre modules
imposées par règles ESLint (`no-restricted-imports`). `supabase/` vit dans
le même dépôt.

## Conséquences

- Outillage simple : un `package.json`, un lockfile, des scripts uniques
  (`yarn lint`, `yarn type-check`, `yarn test`).
- Les frontières de dépendances ne sont pas garanties par le packaging mais
  par le lint : `training-engine`/`schemas` sans React/Expo, `ui` sans
  `features`, `features` sans accès direct santé/Strava.
- Si un besoin de partage de code externe apparaît (P2 : app montre), la
  question du découpage en packages sera rouverte à ce moment-là.
