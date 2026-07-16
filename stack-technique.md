# Runly — Recommandation de stack technique (MVP)

> Basée sur tes choix (Expo/RN, react-native-healthkit, react-native-paper, zustand, zod), vérifiés par recherche le 16/07/2026. Résout la question ouverte de stack de la spec.

## Parti pris

**Expo (SDK 56, dev build obligatoire) + React Native + TypeScript strict.** Validé : une seule codebase iOS/Android, les besoins natifs du MVP (HealthKit, Health Connect, GPS background, audio) sont tous couverts par des config plugins sans module natif custom — sauf une réserve sur le TTS écran verrouillé iOS (voir risques). Expo Go ne suffira pas : partir directement en **dev client + EAS Build**.

## Stack retenue

### Front

| Besoin | Choix | Statut |
|---|---|---|
| Framework | **Expo SDK 56** + dev build (CNG/prebuild), TypeScript strict | ✅ validé |
| Navigation | **expo-router** (file-based, 4 tabs + stacks conformes au diagramme de navigation) | recommandé |
| State local | **zustand** (ton choix) — stores par domaine : session player, préférences | ✅ validé |
| State serveur | **TanStack Query** en complément — cache, retry, sync des données backend. Zustand ne doit pas porter le cache serveur | ajout recommandé |
| Validation | **zod** (ton choix) — schémas centralisés dans un module commun de l'app (`src/schemas`) : séances, workouts, profil physio. C'est lui qui garantit l'intégrité des données santé multi-sources | ✅ validé |
| UI kit | **react-native-paper v5 (MD3)** : ⚠️ réserve — voir ci-dessous | ⚠️ à trancher |
| Jauge ACWR | **@shopify/react-native-skia** en direct (arc + Reanimated, ~50 lignes, contrôle total) | recommandé |
| Graphes de charge | **victory-native XL** (backend Skia) | recommandé |
| Animations | **react-native-reanimated** (déjà requis par victory/skia) | recommandé |

**La réserve react-native-paper** : Paper est thémable mais reste structurellement Material (ripples, elevation, anatomie des composants). Notre charte est un dark custom éloigné de Material — la jauge, le player, les stat-cards, la timeline seront de toute façon des composants maison en Skia/RN. Recommandation : **composants maison sur primitives RN pour les 8-10 composants signatures de la charte** (c'est une app de ~15 écrans), et si tu veux garder Paper, le cantonner aux basiques peu identitaires (inputs, dialogs, snackbars) avec thème dark custom. Alternative si tu préfères un kit : gluestack-ui (copy-paste, plus neutre). À trancher en sprint 0.

### Données santé & intégrations

| Besoin | Choix | Statut |
|---|---|---|
| HealthKit iOS | **@kingstinct/react-native-healthkit v14** (ton choix) : lecture/écriture workouts, route GPS via `getWorkoutRoutes()`. Attention : releases fréquentes avec breaking changes (v9→v14 en un an) → **pinner la version** | ✅ validé |
| Health Connect Android | **react-native-health-connect (matinzd) 3.5.3** : sessions, séries FC, permission background OK. Deux points à prototyper : ExerciseRoute (bug de routes vides connu) et permission historique >30 j (nécessaire pour amorcer la charge chronique) | ✅ + spike |
| Strava | **expo-auth-session** (OAuth) + webhooks côté backend. Demander la sortie du « Single Player Mode » dès le sprint 0 (délai de review Strava) | recommandé |
| Sync périodique | **expo-background-task** (WorkManager/BGTaskScheduler) : différable, ≥15 min, suffisant pour l'ingestion santé (pas de temps réel nécessaire) + refresh au foreground | recommandé |

### Player (le module le plus exigeant)

- GPS : **expo-location + expo-task-manager** — foreground service Android avec notification persistante (évite la permission `ACCESS_BACKGROUND_LOCATION` et sa review Play Store renforcée ; si on la demande quand même : formulaire + vidéo démo à prévoir).
- Écran éveillé : **expo-keep-awake**.
- Annonces audio : **expo-audio** (⚠️ pas expo-av, déprécié) + `UIBackgroundModes: ["audio"]` + **expo-speech** pour le TTS. **Risque n°1 du MVP** : bug connu de TTS qui s'estompe en arrière-plan iOS — à prototyper en sprint 0 ; plan B : annonces pré-enregistrées (fichiers audio) au lieu du TTS.
- Persistance de séance en cours : **expo-sqlite** (crash-safe, offline-first — une séance ne doit jamais se perdre).
- **Live Activity iOS** (écran verrouillé + Dynamic Island) : timer du bloc via `Text(timerInterval:)` (auto-rafraîchi, zéro update), allure cible et prochain bloc mis à jour aux transitions uniquement (throttling ActivityKit). Implémentation : `expo-apple-targets` (target SwiftUI, contrôle total) ou package `expo-live-activity`. iOS 16.2 min. **Ne remplace pas l'audio** (purement visuel) mais dégrade élégamment le scénario si le TTS s'avère fragile. Équivalent Android : notification riche du foreground service.

### Backend

**Supabase, région Francfort ou Paris** : Auth, Postgres + RLS, Edge Functions. C'est le meilleur ratio vitesse/robustesse pour un MVP, RGPD-défendable avec DPA + minimisation des données (stocker les agrégats de séance — durée, distance, FC moyenne, charge — plutôt que les séries FC brutes, qui de toute façon ne servent pas à l'ACWR).

- ⚠️ Caveat à documenter avec le DPO : Supabase = société US sur AWS → exposition CLOUD Act même en région UE. Pour le MVP c'est généralement défendable ; si le juridique bloque, plan B : Supabase self-hosted sur Scaleway/OVH (la stack applicative ne change pas).
- **Le générateur de plan = module TypeScript pur** (`src/training-engine`) dans l'app, validé par les schémas zod communs : fonction pure (profil, objectif, historique) → plan. Testable unitairement, exécuté côté client (offline) ; les Edge Functions se limitent à l'ingestion (webhook Strava).
- Webhooks Strava + ingestion → Edge Functions.

### Qualité & outillage

CI/CD : **EAS Build + Submit** + GitHub Actions. Tests : **jest** (unitaires — en priorité le training-engine et le calcul ACWR) + **Maestro** (E2E parcours critiques : onboarding, player, RPE). Crash/monitoring : **Sentry**. Pas d'analytics produit tiers au MVP (décision D10) : les KPI de la spec §10 sont calculés par requêtes directes sur la base Supabase. Distribution beta : TestFlight + Play Internal Testing via EAS.

## Risques techniques à lever en sprint 0 (par ordre de priorité)

1. **Audio/TTS écran verrouillé iOS** (player) — prototype 2 j ; plan B : audio pré-enregistré.
2. **ExerciseRoute + historique >30 j via react-native-health-connect** avec une vraie Garmin/Coros — prototype 2 j (rejoint le spike sources de données).
3. **Précision GPS/allure temps réel** (lissage de l'allure instantanée, notoirement bruitée) — prototype terrain 2 j, algo de lissage (fenêtre glissante/Kalman simple).
4. **Thème Paper vs composants maison** — décision après un essai d'1 j sur 2 écrans.
5. Demandes tierces à lancer immédiatement (délais externes) : montée de quotas **Strava**, comptes développeur Apple/Google, déclaration des types de données santé.
