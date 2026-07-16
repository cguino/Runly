# ADR-009 — Offline-first : expo-sqlite local, Supabase en réconciliation

**Statut** : accepté (règle transverse n°6)

## Contexte

On court souvent sans réseau. Une séance en cours ne doit **jamais** se
perdre (crash, kill de process, avion).

## Décision

- Le **player et la saisie RPE fonctionnent 100 % offline** : la machine à
  états de séance est persistée sur **expo-sqlite à chaque transition**
  (crash-safe, Lot 6).
- La **sync Supabase est une réconciliation**, pas une condition : les
  écritures locales partent vers le serveur quand le réseau revient.
- Avant la création de compte (D2), toutes les données vivent en local puis
  sont rattachées au compte à sa création.

## Conséquences

- Chaque feature qui écrit des données définit sa stratégie de
  réconciliation (idempotence, horodatage) — revue au cas par cas en PR.
- Les tests du player incluent kill/restore de process (Lot 6).
