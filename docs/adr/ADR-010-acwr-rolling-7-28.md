# ADR-010 — ACWR en fenêtres glissantes 7/28 jours (D16)

**Statut** : accepté (décision D16, `decisions-cadrage-mvp.md` ; spec §7.6)

## Contexte

Deux méthodes pour le ratio charge aiguë/chronique : fenêtres glissantes
(rolling) ou moyennes pondérées exponentielles (EWMA). La jauge doit rester
explicable en un écran de pédagogie.

## Décision

- **ACWR = charge aiguë 7 j (rolling) / charge chronique 28 j (rolling)** au
  MVP. EWMA réévalué en P1 si les données beta le justifient.
- Charge de séance = **sRPE (RPE × durée)** ; fallback d'amorçage
  durée × zone moyenne (D4) avec normalisation des UA entre méthodes.
- Zones de la jauge (charte §4) : bleu 0,6–0,8 (sous-charge), vert 0,8–1,3
  (favorable), rouge 1,3–1,6 (pic). **État calibration < 4 semaines de
  données** : alertes désactivées.
- Les constantes (`LOAD_WINDOWS`, `ACWR_ZONES`) vivent dans
  `src/training-engine` — implémentation complète au Lot 7.

## Conséquences

- Les tests exhaustifs (trous de données, reprise, bascule
  amorçage→sRPE, fenêtres partielles) sont exigés au Lot 7.
- Le wording de la jauge et des alertes passe le filtre
  `note-reglementaire-dm.md` : aide à la décision, jamais de prédiction.
