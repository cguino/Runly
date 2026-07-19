# ADR-003 — Supabase Auth, compte créé en fin d'onboarding (D2)

**Statut** : accepté (décision D2, `decisions-cadrage-mvp.md`)

## Contexte

Exiger un compte à l'ouverture de l'app tue la conversion ; mais sans compte,
pas de sync multi-device (D14) ni de persistance serveur.

## Décision

- **Supabase Auth** : email + Apple + Google.
- Le compte est créé **en fin d'onboarding** (OB4 du mermaid), après le
  profil, le contexte et l'objectif (skippable). Âge minimum **16 ans
  vérifié** (D12) — contrainte portée aussi en base (`users_minimum_age`).
- Les données saisies avant la création de compte vivent en local, puis sont
  **rattachées au compte et synchronisées** à la création (test unitaire de
  non-perte exigé au Lot 4).

## Conséquences

- Tout le flux d'onboarding doit fonctionner sans session Supabase.
- La restauration multi-device passe par Supabase ; l'historique santé se
  ré-importe localement via l'OS (les permissions natives ne migrent pas).
