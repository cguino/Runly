# ADR-005 — Edge Functions limitées à l'ingestion

**Statut** : accepté (plan §2 ; `stack-technique.md`)

## Contexte

On pourrait exécuter le moteur de plan côté serveur (Edge Functions Deno) ou
côté client. Le player et la saisie RPE doivent fonctionner offline (règle
transverse n°6).

## Décision

- Les **Edge Functions (Deno, `supabase/functions/`) se limitent à
  l'ingestion** : webhook Strava, normalisation d'imports.
- Le **moteur de plan s'exécute côté client** (`src/training-engine`,
  fonctions pures TypeScript) : génération et re-génération de plan
  disponibles offline, testables unitairement (golden files, Lot 3).

## Conséquences

- Pas de logique métier dupliquée client/serveur : le serveur ne « calcule »
  jamais un plan.
- Les Edge Functions restent hors du périmètre TypeScript de l'app
  (`tsconfig` et ESLint les excluent) ; elles ont leur propre toolchain Deno.
