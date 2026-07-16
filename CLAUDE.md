# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ce qu'est ce dépôt

Documentation produit du projet **Runly** : une app mobile d'entraînement running (Expo/React Native + Supabase) dont le différenciateur est la jauge de charge ACWR + sRPE. **Il n'y a pas encore de code** — pas de build, lint ni tests. Le travail ici consiste à maintenir la cohérence de la documentation et à préparer/exécuter le plan d'implémentation. La langue de travail est le français.

## Hiérarchie documentaire (source de vérité)

En cas de conflit entre documents, l'autorité est la suivante :

1. `specs-mvp-app-running.md` (v0.3) — spec fonctionnelle canonique (US, critères d'acceptation, modèle de données §9, métriques §10).
2. `decisions-cadrage-mvp.md` — 16 décisions actées (D1–D16), non renégociables sans demande explicite de Cédric.
3. `plan-implementation-agents.md` (v1.1) — plan d'exécution en 12 lots pour agents IA : règles transverses, architecture cible, gates humains, ordonnancement.
4. `backlog-mvp.md` — découpage en epics E0–E10 (~203 pts) et plan de sprints.
5. `stack-technique.md`, `design-system-runly.md` (v1.1), `navigation-app-running.mermaid` — canoniques dans leur domaine (stack, UI, navigation).
6. `note-reglementaire-dm.md` — **bloquant** pour tout texte visible par l'utilisateur (voir ci-dessous).
7. Références : `synthese-lantelme.md` (fondation scientifique), `spike-sources-donnees.md` (couverture santé/Strava), `kit-test-utilisateur.md`, `LANTELME.pdf` (source primaire, 4 Mo).
8. `prototype-mvp-running.html` — **non canonique** : proto de démo obsolète (3 onglets, FC live), écart assumé, ne pas s'y fier ni le mettre à jour.

**Toute modification d'un document doit être répercutée dans les documents qui le référencent** (les incohérences passées venaient de correctifs appliqués à un doc et pas aux autres). La spec porte un numéro de version en en-tête : l'incrémenter en cas de changement de fond.

## Contraintes non négociables

- **Wording réglementaire** (risque de qualification en dispositif médical, classe IIa) : jamais « prévient les blessures », « risque de blessure », ni pathologie nommée dans un texte produit (UI, notifs, stores, docs destinés à l'utilisateur). Utiliser le tableau proscrit/recommandé de `note-reglementaire-dm.md`. Destination officielle : « application d'entraînement et de performance en course à pied ». La prévention blessure est la North Star *interne*, jamais une revendication.
- **Posture éditoriale** : aide à la décision, jamais de prédiction (« ta charge augmente vite, prudence » — jamais « tu vas te blesser »). Ton coach bienveillant, tutoiement.
- **L'utilisateur décide toujours** : toute alerte propose une action 1 tap + « Garder mon plan » ; l'app avertit, n'interdit jamais.

## Arbitrages d'architecture déjà tranchés (ne pas rouvrir)

- **Mono-app Expo SDK 56 + yarn** — pas de monorepo, pas de Turborepo/pnpm. Modules internes : `src/schemas` (zod), `src/training-engine` (fonctions pures, zéro import React), `src/ui`, `src/features`, `src/services`, `src/i18n` ; `supabase/` dans le même repo.
- **Pas de react-native-paper** : composants maison sur primitives RN, tokens de `design-system-runly.md` uniquement (le rouge `danger` est réservé aux pics de charge).
- Objectif daté **optionnel** (D5) ; compte créé **en fin** d'onboarding (D2) ; pas de FC temps réel dans le player (D6) ; ACWR rolling 7/28 j (D16) ; gratuit au MVP (D1) ; pas d'analytics tiers, Sentry crash seul, KPI par requêtes Supabase (D10) ; FR + métrique mais i18n-ready (D7) ; âge minimum 16 ans (D12).
- Hypothèses **assumées** le 16/07/2026 (re-vérifiées en beta, pas avant) : jauge comprise (H1), RPE accepté (H2), données santé remontant correctement (spikes device mis de côté).

## Quand le code arrivera

Suivre `plan-implementation-agents.md` : ses 10 règles transverses (§1), son architecture (§2) et sa boucle qualité par PR (§6) font foi. Les lots 3 (moteur de plan), 4 (onboarding), 6 (player), 7 (jauge) et 11 (RGPD/release) exigent une validation humaine avant merge. Le moteur de plan se vérifie par golden files par persona ; tout changement de ses sorties doit être justifié en PR.

## Commandes yarn (depuis le Lot 0, le code vit à la racine du dépôt)

```bash
yarn install          # dépendances (yarn 1.x — pas de pnpm, pas de npm)
yarn prebuild:ios / yarn prebuild:android   # bare workflow : régénère ios/ et android/ (jamais versionnés)
yarn ios / yarn android                     # build natif local + lancement (expo run:*)
yarn start            # Metro seul (--clear)
yarn lint / yarn lint:fix                   # ESLint (expo lint, 0 warning toléré)
yarn type-check       # tsc --noEmit (TypeScript strict)
yarn test             # jest (préréglage jest-expo)
yarn pre-pr           # lint + type-check + tests avec couverture, avant chaque PR
yarn db:start         # Supabase local (Docker requis)
yarn db:reset         # ré-applique les migrations + seed en local
```

Règles agents, architecture des modules `src/` et frontières ESLint :
voir `AGENTS.md`. Décisions d'architecture : `docs/adr/`.
