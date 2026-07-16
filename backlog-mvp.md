# Runly — Backlog MVP

> Découpage des P0 de la spec v0.3 en epics et stories estimées. Prêt à importer dans Jira/Linear.
> Estimations en points (1/2/3/5/8/13), calibrées pour une équipe de 2 devs RN + 1 back (partagé). Vélocité hypothèse : ~20 pts/sprint de 2 semaines.
> **MAJ cadrage 16/07/2026** (`decisions-cadrage-mvp.md`) : total 185→203 pts. Correction de coquille sur E5 (26 → 31, puis **29** après retrait de la FC temps réel — D6, valeur du tableau ci-dessous) + intégration des 12 décisions. Le périmètre croît légèrement : les ajouts (compte, semaine type + CRUD objectif, i18n-ready, KPI en base) dépassent les retraits (FC live, analytics tiers). À noter : ces choix évitent des coûts plus lourds (plomberie freemium, CMP/ATT, matching robuste) qui auraient sinon gonflé le total.

## Vue d'ensemble

| Epic | Points | Dépend de |
|---|---|---|
| E0 — Fondations techniques | 23 | — |
| E1 — Onboarding, compte & profil | 22 | E0 |
| E2 — Références physiologiques | 13 | E0 |
| E3 — Moteur de plan périodisé | 21 | E2 |
| E4 — Bibliothèque pédagogique & builder | 16 | E0 |
| E5 — Player de séance | 29 | E0, E4 |
| E6 — Ingestion des séances | 22 | E0 |
| E7 — Charge & jauge ACWR | 18 | E6 |
| E8 — Plan, timeline, objectif & flexibilité | 18 | E3 |
| E9 — Notifications & récap hebdo | 8 | E7 |
| E10 — RGPD, réglages & release | 13 | tout |
| **Total** | **~203 pts ≈ 10 sprints bruts → 7 sprints à 3 devs** | |

---

## E0 — Fondations techniques (23 pts)

- **E0-1** (7) Setup projet : app Expo SDK 56 seule (**pas de monorepo — yarn**, dev client, TS strict, expo-router 4 tabs), **i18n-ready dès le départ (strings externalisés, formats via lib — FR + métrique au MVP, D7)**, modules internes `src/schemas` (zod) et `src/training-engine`, EAS Build + GitHub Actions.
- **E0-2** (3) Supabase région UE : projet, auth (email + Apple/Google), schéma Postgres initial + RLS, environnements dev/staging/prod.
- **E0-3** (5) Design system : tokens de la charte (`design-system-runly.md`) en thème RN, composants de base (Button, Card, Chip, StatCard, Label), décision Paper vs maison (spike 1 j).
- **E0-4** (5) Spikes sprint 0 : TTS écran verrouillé iOS (plan B audio pré-enregistré), ExerciseRoute/historique Health Connect sur vraie montre, lissage allure GPS.
- **E0-5** (3) Sentry (crash) ; **pas d'analytics comportemental tiers au MVP (D10)** — les KPI §10 seront calculés par requêtes Supabase (voir E10-5) ; demandes externes : quotas Strava, comptes stores.

## E1 — Onboarding, compte & profil (22 pts)

- **E1-1** (3) Écrans permissions santé avec pré-explication (pas de prompt à froid) ; flux iOS (HealthKit) et Android (Health Connect) ; refus → mode déclaratif.
- **E1-2** (5) Import historique 26 semaines (workouts course) → normalisation zod → base ; état « jauge en calibration » si < 4 semaines.
- **E1-3** (3) Profil : âge (**minimum 16 ans, vérifié — D12**), sexe, poids optionnel, antécédents blessure (type, ancienneté) → flag prudence.
- **E1-4** (2) Contexte : séances/sem (min 2), jours dispo, volume actuel pré-rempli.
- **E1-5** (2) Objectif **(optionnel, skippable — D5)** : distance (5K/10K/semi/marathon), date, ambition, nom épreuve ; garde-fou « objectif irréaliste » (date trop proche vs volume actuel) avec alternatives. Sans objectif → semaine type (E8-6).
- **E1-6** (3) Restitution : récap plan + 3 écrans pédagogie jauge ; guides d'activation du partage par marque de montre (friction n°1 identifiée au spike).
- **E1-7** (1) Onboarding complet skippable avec défauts ; reprise là où on s'est arrêté.
- **E1-8** (3) Création de compte en fin d'onboarding (email + Apple/Google — D2) : données locales avant compte, rattachement + sync à la création. **Restauration multi-device** (D14) : données app retrouvées sur réinstall / nouveau device via Supabase ; historique santé re-importé localement par l'OS.

## E2 — Références physiologiques (13 pts)

- **E2-1** (5) Estimation VMA depuis l'historique (meilleurs efforts 5-12 min, modèle puissance critique simplifié) — dans `@runly/training-engine`, testé unitairement sur jeux de données réels.
- **E2-2** (2) FCmax : max observé historique sinon Tanaka (208 − 0,7 × âge) ; SV1/SV2 en % VMA ; indice de confiance par valeur (mesuré/estimé/défaut).
- **E2-3** (2) Dérivation allures cibles (tables VMA → 5K/10K/semi/marathon croisées avec ambition) et 5 zones FC.
- **E2-4** (3) Écran Profil > Références physio : édition, badges de provenance, historique des révisions ; protocole demi-Cooper expliqué (test guidé = P1).
- **E2-5** (1) Proposition de recalcul quand une perf récente contredit l'estimation (jamais imposé).

## E3 — Moteur de plan périodisé (21 pts) — le cœur algorithmique

- **E3-1** (8) `@runly/training-engine` : génération de plan = fonction pure (profil, objectif, historique), **déclenchée uniquement si un objectif daté existe (sinon semaine type manuelle, E8-6)** → phases (générale/spécifique/affûtage), semaines allégées 1/3-4, ~80 % EF + 1-2 qualités/sem, progression ≤ 10 % (5-8 % si antécédent), refus < 2 séances/sem. Couverture de tests exhaustive (golden files par persona).
- **E3-2** (5) Placement des séances sur les jours dispo avec règles d'enchaînement (pas 2 qualités d'affilée, qualité ≠ veille de sortie longue).
- **E3-3** (3) Re-génération du plan restant (changement de dispo, séances manquées ≥ 2 sem → re-périodisation proposée).
- **E3-4** (3) Validation du contenu des plans par un coach/expert running (revue des sorties du moteur sur 6 personas) — *tâche non-dev, à lancer tôt*.
- **E3-5** (2) Séance manquée à J+1 : re-proposition de la séance clé, abandon de la secondaire (règle « on n'empile jamais »).

## E4 — Bibliothèque pédagogique & builder (16 pts)

- **E4-1** (3) Modèle de séance en blocs sérialisable (zod) : répétitions × durée|distance @ allure|zone|RPE, récups — base commune player/plan/builder.
- **E4-2** (5) Contenu : 7 types de séance × fiche pédagogique (quoi, pourquoi, pour quel objectif, RPE attendu, conseils, erreurs, variantes) — *rédaction contenu + revue coach, en parallèle du dev*.
- **E4-3** (3) Onglet Séances : liste par type, fiche séance, calcul auto distance/durée totales, actions « Ajouter à ma semaine » / « Faire maintenant ».
- **E4-4** (5) Builder : création par blocs, séries imbriquées, sauvegarde, duplication.

## E5 — Player de séance (29 pts) — le module le plus risqué

- **E5-1** (5) Machine à états de séance (blocs, transitions, pause/reprise/abandon) sur expo-sqlite — crash-safe : une séance ne se perd jamais.
- **E5-2** (3) Tracking : expo-location en foreground service, allure lissée (algo du spike E0-4), distance cumulée. **Pas de FC temps réel au MVP (D6)** ; **perte de signal GPS = dégradation gracieuse (D13)** : timer et structure continuent, allure figée + badge « signal faible », distance reprend au retour.
- **E5-3** (5) UI player conforme charte : timer géant, barre d'allure cible avec curseur, trio stats (**allure / distance / durée — sans FC live, D6**), coaching (« dans la cible / un poil vite »), prochain bloc.
- **E5-4** (5) Annonces audio écran verrouillé : transitions de blocs, allures cibles (TTS ou pré-enregistré selon spike).
- **E5-5** (3) Fin de séance : récap (distance, durée, FC moy, allure sur les blocs cibles) + écriture du workout vers HealthKit/Health Connect.
- **E5-6** (3) Mode carte (courir avec sa montre) : brief consultable, matching différé avec la séance remontée.
- **E5-7** (5) Live Activity iOS (écran verrouillé + Dynamic Island) : timer de bloc auto-rafraîchi, allure cible, prochain bloc (updates aux transitions) — target SwiftUI via expo-apple-targets ; notification riche équivalente côté Android (foreground service).

## E6 — Ingestion des séances (22 pts)

- **E6-1** (5) Couche d'ingestion normalisée multi-sources (santé, Strava, player, manuel) → `Workout` zod unique ; déduplication par date/durée/distance (priorité Strava > santé).
- **E6-2** (3) Lecture HealthKit : nouveaux workouts course (observer + refresh foreground).
- **E6-3** (5) Lecture Health Connect : polling expo-background-task + refresh foreground ; permissions historique et background.
- **E6-4** (5) Connexion Strava : OAuth (expo-auth-session), webhooks → Edge Function, import activités + streams.
- **E6-5** (3) Matching séance réalisée ↔ planifiée (filtre « course », même jour ± tolérance) + **correction manuelle : ré-associer / dissocier en 1-2 taps** pour ambigus et faux positifs (D11).
- **E6-6** (1) Saisie manuelle (durée, distance, RPE) — mode sans montre.

## E7 — Charge & jauge ACWR (18 pts) — le différenciateur

- **E7-1** (3) Calcul de charge : sRPE (RPE × durée) avec fallback durée × zone moyenne ; ACWR 7 j / 28 j (**rolling au MVP ; EWMA en P1 — D16**) ; état « calibration » < 4 semaines ; tests unitaires exhaustifs (trous de données, blessure, reprise).
- **E7-2** (5) Jauge Skia : arc 3 zones, aiguille animée (Reanimated), valeur, pill de statut, écran « Comment ça marche ? ».
- **E7-3** (3) ACWR prévisionnel (si je suis le plan de la semaine) affiché sur la jauge.
- **E7-4** (5) Moteur d'alertes : pic > 1,3 → suggestion de substitution 1 tap + « Garder mon plan » ; sous-charge > 2 sem ; RPE ≥ 8 × 2 séances ; max 1 alerte charge/48 h ; wording conforme note réglementaire (revue systématique).
- **E7-5** (2) Saisie RPE : écran post-séance + notification 30 min après détection d'un workout importé ; échelle 0-10 avec ancres émoji.

## E8 — Plan, timeline, objectif & flexibilité (18 pts)

- **E8-1** (3) Accueil : semaine 7 jours fixes avec jours de repos affichés, volume prévu, statut des séances.
- **E8-2** (3) Onglet Plan : timeline continue passé (réalisé vs prévu, RPE, charge) / futur (phases, semaines allégées marquées).
- **E8-3** (3) Déplacer une séance : bottom sheet choix du jour, recalcul ACWR prévisionnel, avertissement (jamais blocage) sur enchaînements déconseillés.
- **E8-4** (2) Ajouter une séance spontanée (depuis bibliothèque ou course libre) → entre dans la charge, suggestion d'allègement seulement si sortie de zone.
- **E8-5** (2) Détail séance passée : comparaison prévu/réalisé par bloc.
- **E8-6** (3) Mode **semaine type manuelle** (objectif absent) : composer sa semaine depuis la bibliothèque/builder, la jauge arbitre (D5, D9).
- **E8-7** (2) **Gestion de l'objectif dans l'onglet Plan** : créer / modifier / supprimer l'objectif daté ; bascule plan généré ↔ semaine type (D5).

## E9 — Notifications & récap hebdo (8 pts)

- **E9-1** (3) Notifications : « ta semaine » (lundi), rappel séance du jour, demande RPE ; préférences par type.
- **E9-2** (5) Récap hebdo (dimanche soir) : réalisé vs prévu, évolution ACWR, message d'adaptation éventuel. *(Leviers d'engagement avancés — streaks, relance d'inactivité, récap mensuel — hors MVP, évalués post-beta selon la rétention réelle — D15.)*

## E10 — RGPD, réglages & release (13 pts)

- **E10-1** (4) Réglages : permissions, notifications, objectif (géré dans l'onglet Plan), compte, **âge (16+)** ; suppression de compte = purge complète (RGPD).
- **E10-2** (2) CGU + politique de confidentialité (wording note réglementaire, **âge minimum 16 ans**) ; disclaimer sur les écrans de charge.
- **E10-3** (2) Registre des traitements, minimisation validée (agrégats, pas de séries FC brutes), DPA Supabase.
- **E10-4** (3) Release : fiches stores (wording validé, **« gratuit » — D1**, rating 16+), déclarations données santé Apple/Google, vidéo Play si background location, beta TestFlight/Play Internal (50-100 coureurs).
- **E10-5** (2) **KPI produit §10 par requêtes Supabase** (pas d'analytics tiers — D10) : plans générés, séances jouées, taux de RPE, alertes affichées/acceptées ; tableau de suivi pour la revue S2/M1/M3.

---

## Proposition de plan de sprints (3 devs, sprints de 2 semaines)

| Sprint | Contenu | Jalon |
|---|---|---|
| **S0** (léger, en parallèle du design) | E0 complet — spikes, fondations, décisions | Stack dérisquée |
| **S1** | E1 onboarding + E2 références physio | Onboarding → profil calculé |
| **S2** | E3 moteur de plan + E4-1/E4-3 (modèle de séance, bibliothèque lecture) | **Démo : objectif → plan complet** |
| **S3** | E6 ingestion (santé + manuel) + E7-1/E7-5 (calcul charge, RPE) | Séances réelles ingérées, charge calculée |
| **S4** | E5 player (grosse marche) + E6-4 Strava | **Démo : séance guidée de bout en bout** |
| **S5** | E7 jauge + alertes + E8 accueil/timeline/flexibilité | **Le différenciateur visible** |
| **S6** | E4-4 builder + E9 notifications/récap + E10 + stabilisation | Beta fermée |
| **S7-S8** | Beta 4 semaines : corrections, mesure RPE/jauge (métriques spec §10) | GO/NO-GO launch |

Chemin critique : E3 (moteur de plan) et E5 (player) — y mettre le dev le plus senior. E4-2 (contenu pédagogique) et E3-4 (validation coach) sont des tâches contenu à lancer dès S0, elles ne bloquent pas le dev mais bloquent la beta.
