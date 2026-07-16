# ADR-007 — Conventions de développement

**Statut** : accepté (règles transverses n°8–10)

## Décision

- **Conventional Commits** (`feat:`, `fix:`, `chore:`, `docs:`, `ci:`, …).
- **Une PR par story** (ou groupe cohérent ≤ 5 pts) ; **jamais de merge
  direct sur `main`** ; CI verte obligatoire (lint, type-check, jest ;
  Maestro sur les lots parcours).
- **Definition of Done** : code + tests + `yarn lint && yarn type-check &&
  yarn test` verts + wording vérifié (`note-reglementaire-dm.md`) + revue
  humaine sur les lots 🔍 (3, 4, 6, 7, 11).
- **Un agent ne décide pas seul d'un écart à la spec** : toute contradiction
  ou impossibilité technique est remontée en issue avec proposition, jamais
  résolue silencieusement.
- Golden files du moteur de plan : toute modification = justification
  explicite en description de PR.

## Conséquences

- L'historique git raconte le produit ; les releases pourront être
  automatisées (semantic-release) plus tard sans réécriture.
