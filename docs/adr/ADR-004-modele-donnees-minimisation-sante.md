# ADR-004 — Modèle de données & minimisation des données de santé

**Statut** : accepté (spec §9 ; règle transverse n°7)

## Contexte

Les données de santé sont sensibles (RGPD). L'ACWR n'a besoin que d'agrégats
par séance, pas des séries brutes.

## Décision

- Modèle relationnel = spec §9 : `users`, `physio_profiles`, `goals`,
  `training_plans`, `planned_weeks`, `planned_sessions`, `workouts`,
  `session_feedbacks`, `load_metrics`, `alerts` — **SessionBlock en jsonb**
  (structure pivot sérialisable, partagée player/plan/builder).
- **Minimisation** : Supabase ne stocke que des agrégats de séance (durée,
  distance, FC moyenne, cadence moyenne, charge). **Jamais** de séries FC
  brutes ni de GPS brut en base.
- **RLS sur toutes les tables** : chaque utilisateur ne voit que ses lignes
  (`auth.uid()`), via un `user_id` dénormalisé sur chaque table (politiques
  directes, pas de jointures dans les policies).
- Hébergement **UE (Francfort/Paris)** ; suppression de compte = purge
  complète (cascade depuis `auth.users`, test d'intégration au Lot 11).

## Conséquences

- Toute nouvelle table embarque `user_id` + politiques RLS dès sa migration.
- Le détail intra-séance (splits, séries) reste local au device s'il devient
  nécessaire ; le mettre en base exigerait une révision de cet ADR + DPO.
