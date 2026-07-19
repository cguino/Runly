# ADR-006 — zod à toutes les frontières de données

**Statut** : accepté (règle transverse n°1)

## Contexte

Les données entrent dans l'app depuis des sources hétérogènes et non fiables :
HealthKit, Health Connect, Strava, formulaires, base Supabase.

## Décision

**Aucune donnée externe n'entre dans le domaine sans passer par un schéma
zod de `src/schemas`.** Les schémas sont la source de vérité des types
métier (`z.infer`), partagés par le moteur, les services et l'UI.
`src/schemas` reste un module TypeScript pur (zéro import React/Expo,
règle ESLint).

## Conséquences

- Les services d'ingestion (Lot 5) parsent systématiquement (`safeParse`)
  et rejettent/loggent les payloads invalides au lieu de les propager.
- Le modèle de séance en blocs (`SessionBlock`, Lot 1) doit rester
  sérialisable (jsonb en base, P2 montre).
