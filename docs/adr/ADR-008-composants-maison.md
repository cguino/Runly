# ADR-008 — Composants maison (pas de react-native-paper)

**Statut** : accepté (arbitrage Cédric, 16/07/2026 — plan v1.1)

## Contexte

`stack-technique.md` avait une réserve sur react-native-paper : structurellement
Material (ripples, elevation, anatomie), loin de la charte dark custom de
`design-system-runly.md` v1.1. Les composants identitaires (jauge, player,
stat-cards, timeline) auraient de toute façon été faits main.

## Décision

**Pas de react-native-paper ni d'autre UI kit.** Composants maison sur
primitives React Native dans `src/ui`, stylés exclusivement avec les tokens
typés de `design-system-runly.md` (couleurs, rayons, espacements, typo).
Règles associées : aucune couleur/taille/rayon en dur hors thème (règle lint
au Lot 2) ; le rouge `danger` est réservé à la jauge > 1,3 et aux alertes de
pic ; `tabular-nums` sur tout chiffre dynamique.

## Conséquences

- ~8–10 composants signatures à construire au Lot 2 (galerie de revue 🔍).
- Zéro dépendance UI tierce à suivre ; le design system est la seule
  autorité visuelle.
