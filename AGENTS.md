# AGENTS.md — Runly

Règles pour tout agent travaillant sur ce dépôt. Reprend les règles
transverses (§1) et l'architecture (§2) de `plan-implementation-agents.md`
(v1.1), qui fait foi en cas de doute. Hiérarchie documentaire complète et
contraintes réglementaires : voir `CLAUDE.md`.

## Commandes

```bash
yarn install          # dépendances (yarn 1.x — pas de pnpm, pas de npm)
yarn start            # Metro / dev client (Expo Go ne suffit pas)
yarn ios / yarn android
yarn lint             # ESLint (expo lint, 0 warning toléré)
yarn type-check       # tsc --noEmit (TypeScript strict)
yarn test             # jest (préréglage jest-expo)
yarn db:start         # Supabase local (Docker requis)
yarn db:reset         # ré-applique les migrations + seed en local
```

Definition of Done d'une story : code + tests + `yarn lint &&
yarn type-check && yarn test` verts + wording vérifié + revue humaine si le
lot est marqué 🔍 (lots 3, 4, 6, 7, 11).

## Règles transverses (plan §1)

1. **TypeScript strict** partout ; aucune donnée externe (santé, Strava,
   formulaires) n'entre dans le domaine sans passer par un schéma zod de
   `src/schemas`.
2. **Wording réglementaire** : tout texte visible par l'utilisateur (UI,
   notifications, fiches, stores) respecte le tableau proscrit/recommandé de
   `note-reglementaire-dm.md`. Jamais « blessure », « risque de blessure »,
   ni pathologie nommée dans l'UI. Ton : coach bienveillant, tutoiement.
3. **i18n-ready (D7)** : aucune string en dur dans les composants — tout
   passe par `src/i18n` (FR seul au MVP) ; formats nombre/date/allure via
   les helpers centralisés (`4:59 /km`, virgule décimale française, « ≈ »).
4. **Design tokens obligatoires** : aucune couleur/taille/rayon en dur —
   uniquement les tokens de `src/ui` (source : `design-system-runly.md`).
   Le rouge `danger` est réservé à la jauge > 1,3 et aux alertes de pic.
5. **Logique métier = fonctions pures testées** dans `src/training-engine`
   (plan, VMA, allures, ACWR, alertes). Les composants React ne contiennent
   pas de règles métier.
6. **Offline-first** : le player et la saisie RPE fonctionnent sans réseau
   (expo-sqlite) ; la sync Supabase est une réconciliation, pas une
   condition.
7. **Données de santé minimisées** : Supabase ne stocke que des agrégats de
   séance (durée, distance, FC moyenne, cadence moyenne, charge) — jamais
   les séries FC brutes ni le GPS brut.
8. **Definition of Done** : voir ci-dessus.
9. **Conventions** : Conventional Commits ; une PR par story (ou groupe
   cohérent ≤ 5 pts) ; jamais de merge direct sur `main`.
10. **Un agent ne décide pas seul d'un écart à la spec** : tout écart
    découvert (contradiction, impossibilité technique) est remonté en issue
    avec proposition, jamais résolu silencieusement.

## Architecture (plan §2)

Mono-app Expo (SDK 57) + yarn — pas de monorepo. `supabase/` vit dans le
même dépôt.

```
runly/
├── app/                        # expo-router : 4 tabs + stacks conformes au mermaid
│   ├── (tabs)/                 #   accueil / plan / seances / profil
│   ├── onboarding/             #   (Lot 4)
│   └── player/                 #   modal plein écran (Lot 6)
├── src/
│   ├── schemas/                # zod : SessionBlock, Workout, Plan, Goal, PhysioProfile…
│   ├── training-engine/        # fonctions pures : plan, VMA, allures, ACWR, alertes (zéro import React)
│   ├── ui/                     # tokens du design system + composants signatures
│   ├── features/               # onboarding, plan, player, library, load, profile (écrans + stores zustand)
│   ├── services/               # healthkit, health-connect, strava, supabase, sqlite, notifications, audio
│   ├── i18n/                   # strings FR externalisées + helpers de format
│   └── lib/                    # utilitaires purs
├── supabase/
│   ├── functions/              # Edge Functions : webhook Strava, ingestion (rien d'autre)
│   ├── migrations/
│   └── seed/
├── docs/adr/                   # ADR-001…010
└── .github/workflows/ci.yml    # lint, type-check, test
```

Frontières de dépendances (imposées par ESLint, `eslint.config.js`) :

- `training-engine` et `schemas` n'importent **ni React ni Expo** ;
- `ui` n'importe pas `features` ;
- `features` ne touche jamais directement HealthKit/Health Connect/Strava —
  toujours via `services`.
- Les Edge Functions (Deno) restent limitées à l'ingestion — le moteur de
  plan s'exécute côté client.

## Stack (détail : `stack-technique.md` + ADR-002)

Expo SDK 57 + dev client + EAS ; expo-router ; zustand (état local) +
TanStack Query (état serveur) ; zod ; Skia + Reanimated (jauge) ;
victory-native XL (P1) ; @kingstinct/react-native-healthkit v14 (pinnée) ;
react-native-health-connect 3.5.3 ; expo-location/-task-manager/-audio/
-speech/-keep-awake/-sqlite/-background-task ; Supabase UE (Auth,
Postgres + RLS, Edge Functions) ; Sentry (crash uniquement, D10) ;
jest + Maestro.
