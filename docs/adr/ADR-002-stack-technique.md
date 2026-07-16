# ADR-002 — Stack technique

**Statut** : accepté (`stack-technique.md`, validé 16/07/2026)

## Contexte

Le MVP exige : HealthKit/Health Connect, GPS foreground, audio écran
verrouillé, offline-first, une jauge animée — sur iOS et Android avec une
petite équipe.

## Décision

- **Expo SDK 57 en workflow bare/prebuild** (arbitrage Cédric, 16/07/2026) :
  dossiers natifs générés par `expo prebuild --clean` (CNG, jamais
  versionnés), builds de dev **locaux** via `expo run:ios|android`
  (expo-dev-client embarqué) ; EAS Build reste l'outil de distribution
  beta/stores. TypeScript strict, **expo-router** (4 tabs conformes à
  `navigation-app-running.mermaid`).
- **zustand** (état local) + **TanStack Query** (état serveur) ; **zod** aux
  frontières (`src/schemas`).
- Jauge : **@shopify/react-native-skia** + **react-native-reanimated** ;
  graphes : victory-native XL (P1).
- Santé : **@kingstinct/react-native-healthkit v14 (pinnée)** ;
  **react-native-health-connect 3.5.3** ; Strava via expo-auth-session +
  webhook Edge Function (Lot 5).
- Player : expo-location/-task-manager/-audio/-speech/-keep-awake/-sqlite/
  -background-task (Lot 6).
- Backend : **Supabase UE** (Auth, Postgres + RLS, Edge Functions).
- Qualité : jest + Maestro ; **Sentry crash-only** (D10) ; CI GitHub Actions.

> **Écart documenté** : `stack-technique.md` et le plan v1.1 mentionnent
> SDK 56 (état de l'art à leur rédaction). Le Lot 0 a été demandé et livré
> en **SDK 57** (dernière stable au 16/07/2026). Les documents amont sont à
> mettre à jour — écart remonté, non résolu silencieusement (règle §1.10).

## Conséquences

- Expo Go ne suffit pas : `yarn prebuild:ios|android` puis `yarn ios|android`
  en local ; EAS n'intervient que pour la distribution.
- Les versions des libs santé sont pinnées ; toute montée de version passe
  par une PR dédiée avec tests d'ingestion.
