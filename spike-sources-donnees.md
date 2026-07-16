# Spike — Sources d'ingestion des séances (Health Connect / HealthKit / Strava)

> Résout la question ouverte n°1 de la spec MVP. Recherche menée le 16/07/2026.

## Verdict

**Non, santé seule ne suffit pas. Recommandation : HealthKit + Health Connect comme socle par défaut, + connexion Strava optionnelle dès le MVP.**

## Couverture par marque (séances de course)

| Marque | iOS (Apple Santé) | Android (Health Connect) | Strava |
|---|---|---|---|
| **Garmin** | ✅ Workouts (durée, distance, cal., FC résumée) — ❌ pas de GPS, FC partielle | ✅ Depuis juil. 2025 (distance, FC, vitesse, dénivelé) — ⚠️ route GPS non documentée, sens unique | ✅ Complet (GPS + streams) |
| **Coros** | ✅ Workouts | ✅ Natif (détail des champs non documenté) | ✅ Complet |
| **Polar** | ✅ Workouts | ✅ Le plus complet (route GPS incluse, depuis mai 2024) | ✅ Complet |
| **Suunto** | ✅ Workouts — ❌ pas de GPS | ❌ **Absent de Health Connect** | ✅ Complet |
| **Apple Watch** | ✅ Natif complet | — | ✅ |

## Points clés

1. **Le socle santé couvre l'essentiel du MVP** : type de séance, durée, distance, FC résumée, calories — suffisant pour le suivi de plan, le matching séance planifiée↔réalisée et le calcul de charge (sRPE/ACWR). Gratuit, sans quota, sans validation partenaire.
2. **Les trous du socle santé** : Suunto absent de Health Connect (Android) ; trace GPS non fiable via les hubs (seul Polar la documente) ; métriques avancées (puissance, cadence, VO2max) jamais transmises ; opt-in manuel requis dans chaque app constructeur (friction d'onboarding à soigner) ; permission spéciale pour lire > 30 j d'historique (nécessaire pour amorcer la charge chronique — déclaration Google Play supplémentaire).
3. **Strava comble exactement ces trous** : couverture universelle des marques sur les 2 OS, webhooks (push), streams GPS/FC complets. Contraintes 2026 : démarrage en « Single Player Mode » (demander la montée de quotas tôt), abonnement développeur ~12 $/mois depuis juin 2026, données visibles uniquement par leur propriétaire (OK pour self-coaching, bloquant pour du social/coach humain), **interdiction d'entraîner des modèles IA sur les données Strava** (l'analyse pour l'utilisateur reste permise — à cadrer si coach IA en P2, privilégier les données santé pour l'IA).
4. **L'API directe Garmin est fermée aux nouveaux développeurs** (programme en pause, sans date) → impossible de suivre le pattern des leaders (Runna, Campus, TrainingPeaks) au MVP. Les APIs directes constructeurs (Coros, Polar AccessLink, Suunto) restent la cible post-MVP — seule voie pour pousser les séances *vers* la montre.
5. **À valider par un test technique réel** (docs muettes) : présence de l'ExerciseRoute et granularité FC dans Health Connect pour Garmin/Coros ; latence de sync réelle de bout en bout.

## Impact sur la spec

- §7.7 : ajouter « Connexion Strava (OAuth, optionnelle) » au P0 ; priorité de source en cas de doublon : Strava > santé (déduplication par date/durée/distance).
- §11 : question ouverte n°1 → résolue.
- Architecture : prévoir une couche d'ingestion multi-sources normalisée (santé, Strava, player interne, manuel) avec déduplication — déjà anticipé dans le modèle `Workout.source`.
- Onboarding : guider l'activation du partage dans l'app constructeur (écrans par marque) — friction principale identifiée.

## Sources principales

Android Central (données Garmin↔HC) · Gadgets & Wearables (lancement juil. 2025) · docs officielles Polar Health Connect · support Coros (apps tierces) · forum Suunto (absence HC) · Android Developers (data types, permission historique) · Garmin support (Apple Health FAQ) · Strava press (API agreement nov. 2024) · DC Rainmaker (analyse restrictions) · developers.strava.com (rate limits) · Strava community hub (developer program juin 2026) · TechCrunch (Strava pré-IPO) · Garmin Developer Program FAQ (pause) · support Runna · FAQ Campus Coach. URLs complètes disponibles sur demande.
