# Décisions de cadrage MVP — comblement des « trous dans la raquette »

> Issue d'une session de revue documentaire + interview de cadrage, 16/07/2026.
> Ce document acte 12 décisions et liste les correctifs à répercuter dans les specs, le backlog et la charte.
> Statut : à valider par Cédric, puis à intégrer dans les documents canoniques.

## 1. Les 12 décisions

| # | Sujet | Décision | Rationale |
|---|---|---|---|
| D1 | **Monétisation** | Gratuit au MVP ; monétisation en P1 | Valider rétention/PMF et taux de RPE d'abord. Aucune plomberie de paiement (StoreKit/Billing/RevenueCat) au périmètre. L'intention de paiement se teste en entretien (H5), pas in-app. |
| D2 | **Compte & auth** | Onboarding d'abord, création de compte à la fin | Atteindre la valeur (le plan / la semaine) avant de demander un compte. Données locales tant que pas de compte, sync cloud après. |
| D3 | **Player device** | Téléphone = usage principal | On assume la course téléphone en main/poche ; player guidé audio + Live Activity investis. À dé-risquer tôt (test T4 + spikes E0-4). |
| D4 | **Charge d'amorçage** | Historique importé valorisé en durée×zone FC ; sRPE pour les séances futures | Jauge active vite sans attendre des RPE. Impose de normaliser les UA entre les deux méthodes et de tester la continuité de la charge chronique à la bascule. |
| D5 | **Cible / objectif** | Objectif daté **optionnel**. CRUD de l'objectif dans l'onglet **Plan**. Avec objectif → plan pré-défini proposé ; sans objectif → semaine type définie par l'utilisateur | Élargit la cible au coureur « sans dossard ». Confirme la **jauge comme cœur indépendant de l'objectif**. Le générateur E3 devient une commodité optionnelle. |
| D6 | **FC dans le player** | Allure GPS pilote ; **pas de FC temps réel** au MVP | Une montre Garmin/Coros n'expose pas sa FC en BLE au téléphone. FC uniquement post-séance via la santé. Simplifie E5 et l'UI player. |
| D7 | **Unités / i18n** | FR + métrique, mais **i18n-ready** (strings externalisés) | Marché francophone au lancement. Ni traduction ni impérial au MVP, mais architecture prête. Dette évitée à coût quasi nul. |
| D8 | **Contenu & coach** | Rédaction interne + relecture coach **ponctuelle** | Réduit la dépendance externe bloquante pour la beta. ⚠️ reste à **identifier le coach relecteur** — argument de crédibilité. |
| D9 | **Semaine type (sans objectif)** | 100 % manuel via la bibliothèque / builder | Aucune génération à construire : réutilise la bibliothèque + la flexibilité déjà prévues. La jauge arbitre. |
| D10 | **Tracking / analytics** | **Pas d'analytics produit tiers au MVP** (crash Sentry seul) | Simplifie (pas d'ATT ni de CMP). ⚠️ voir §4 : mesurer les métriques §10 par requête sur la base Supabase. |
| D11 | **Matching séance** | Matching simple (date/durée/distance) + **correction manuelle facile** (ré-associer/dissocier en 1-2 taps) | Assume l'imperfection, rend la correction triviale. Bon ratio coût/valeur. E6-5 reste à ~2 pts + petite UI de correction. |
| D12 | **Âge minimum** | **16+** | Seuil sûr multi-pays UE pour le consentement autonome à la donnée santé. Contrôle d'âge à l'onboarding + CGU alignées. |
| D13 | **Perte de signal GPS (player)** | Dégradation gracieuse : timer + structure continuent, allure figée + badge « signal faible », reprise au retour | Le player ne s'interrompt jamais et ne fausse pas la séance. Simple et robuste. |
| D14 | **Multi-device / migration** | Sync cloud des données app via Supabase ; historique santé re-importé par l'OS | Données retrouvées sur réinstall / nouveau device. iOS↔Android : les données app migrent, pas les permissions santé natives. |
| D15 | **Rétention / engagement** | Notifs de base au MVP ; leviers (streaks, relance, récap mensuel) évalués post-beta | Éviter de sur-investir avant de mesurer la rétention réelle et de préserver le ton « coach pas alarme ». |
| D16 | **Calcul ACWR** | Rolling 7/28 j au MVP ; EWMA en P1 | Plus simple à expliquer, tester, implémenter. Résout la question ouverte #5 ; EWMA si les données beta le justifient. |

## 2. Correctifs appliqués, document par document

> ✅ Tous appliqués le 16/07/2026 (spec v0.3, backlog v0.3, charte v1.1, mermaid). Les pointeurs §X ci-dessous indiquent où.

### `specs-mvp-app-running.md`
- **§3 Cible / §6.1 Onboarding** : l'objectif daté devient **optionnel** (étape skippable). Décrire le parcours « sans objectif » → semaine type manuelle (D5, D9).
- **§6.1** : insérer l'étape **création de compte en fin d'onboarding**, juste avant génération/sync ; préciser l'état « données locales avant compte » (D2).
- **§7.2** : le générateur de plan devient un **chemin optionnel** (déclenché si objectif défini), pas le tronc commun.
- **§7.4 / §7.6** : retirer la FC temps réel du player ; les zones FC restent des cibles affichées, non mesurées en live (D6).
- **§7.7** : ajouter la **correction manuelle** du matching (ré-association/dissociation) ; filtrer les activités « course » à l'ingestion pour limiter les faux positifs (D11).
- **§7.10 / navigation** : l'onglet **Plan** porte le CRUD de l'objectif (créer/modifier/supprimer) + l'édition de la semaine type (D5).
- **§10 Métriques** : préciser que les KPI seront calculés **côté base** (pas d'analytics tiers) ; segmenter « avec / sans objectif daté » (D10, D5).
- **§11 Questions ouvertes** : #4 (modèle éco) → **résolu D1** ; #6 (RPE) reste au test utilisateur. Ajouter D5, D6, D10, D12 comme décisions actées.
- **Nouveau** : mention **âge minimum 16+** et sa vérification (D12).

### `backlog-mvp.md`
- **Corriger les chiffres** : en-tête E5 = **31 pts** (pas 26) ; total recalculé après décisions = **~203 pts** (la coquille corrigée donnait 190, les 12 décisions ajoutent ~+13 net). Cohérence interne.
- **E1** : + story « création de compte en fin d'onboarding + reprise des données locales » ; + « contrôle d'âge 16+ » ; l'étape Objectif devient skippable.
- **E3 / E8** : + story « mode semaine type manuelle (objectif absent) » ; + « CRUD objectif dans l'onglet Plan ». Le générateur E3 reste mais sur chemin optionnel.
- **E5** : retirer la gestion capteur BLE / FC temps réel (E5-2 allégé, E5-3 sans widget FC) → **léger gain de points**.
- **E0 / E1** : + « i18n-ready : externalisation des strings, formats via lib » (petit).
- **E6-5** : conserver ~2 pts + petite UI de correction manuelle du matching.
- **E10** : retirer la story analytics produit (PostHog) ; **conserver Sentry** ; + story « calcul des KPI §10 par requêtes Supabase » ; + « âge 16+ dans CGU / rating stores ». Pas de CMP/ATT à prévoir (conséquence de D10).
- **Bilan périmètre (corrigé après recalcul)** : les retraits (D6 FC live, D10 analytics tiers) sont **dépassés par les ajouts** (D2 compte, D5/D9 semaine type + CRUD objectif, D7 i18n-ready, D10 KPI en base) → **net légèrement plus lourd (~+13 pts, total ~203)**. Mais ces choix évitent des coûts bien supérieurs qu'auraient imposés les alternatives (plomberie freemium, CMP/ATT, matching robuste).

### `design-system-runly.md`
- **§4 Tab bar** : passer de **3 à 4 onglets** (Accueil / Plan / Séances / Profil) — aligner sur la spec §7.10 et le mermaid.
- **§4 Player** : retirer la FC temps réel du trio de stats (remplacer par Allure / Distance / Durée p.ex.) (D6).

### `prototype-mvp-running.html`
- Proto de démo : tab bar à 3 onglets et `curHr` (FC live) désormais désalignés. À mettre à jour **seulement si** le proto resert au test utilisateur ; sinon le laisser tel quel et noter l'écart.

### `note-reglementaire-dm.md`
- RAS sur le fond. La suppression de l'analytics comportemental (D10) **réduit** encore la surface RGPD. Relecture avocat DM/e-santé toujours requise avant lancement.

## 3. Trous restants — tous tranchés (tour 4 + hygiène)

| Sujet | Décision / résolution | Statut |
|---|---|---|
| Perte de signal GPS (player) | Dégradation gracieuse (D13) — spec §7.4 + backlog E5-2 | ✅ Résolu |
| Multi-device & migration iOS↔Android | Sync cloud Supabase, santé re-importée par l'OS (D14) — spec §9 + backlog E1-8 | ✅ Résolu |
| Stratégie de rétention | Notifs de base au MVP, leviers post-beta (D15) — spec §8 P1 + backlog E9-2 | ✅ Résolu |
| ACWR rolling vs EWMA | Rolling 7/28 au MVP, EWMA en P1 (D16) — spec §11 Q5 + backlog E7-1 | ✅ Résolu |
| Incohérences doc (chiffres, onglets) | E5→31, total→~203, tab bar 3→4 — backlog + charte + mermaid | ✅ Résolu |

### Validations / dépendances externes encore en attente (déjà tracées ailleurs)
- **Relecture avocat DM/e-santé** des CGU et de la note réglementaire avant lancement (`note-reglementaire-dm.md`).
- **Spikes techniques sprint 0** : TTS écran verrouillé iOS, ExerciseRoute/historique Health Connect sur vraie montre, lissage GPS (`stack-technique.md`, backlog E0-4).
- **Validation coach** des sorties du moteur de plan + relecture des fiches (D8, backlog E3-4/E4-2).
- **Test utilisateur H1–H5** avant dev, dont l'échelle RPE emoji vs chiffres (question ouverte #6) (`kit-test-utilisateur.md`).

## 4. Points de vigilance

1. **Mesure sans analytics (conséquence de D10)** — mesurer les métriques §10, en particulier le **taux de saisie RPE (cible 70 %, condition de survie de la jauge)**, par **requête directe sur la base Supabase**. Données détenues, base légale RGPD, ni ATT ni consentement requis (ce n'est pas du tracking). Sans ça, le GO/NO-GO de fin de beta serait aveugle.
2. **Pari player téléphone (D3)** — c'est le risque produit n°1 : la cible court avec une montre. Valider en priorité au test utilisateur (T4) que les coureurs accepteront le téléphone. Plan de repli : renforcer le « mode carte » si le test est négatif.
3. **Coach relecteur (D8)** — l'identifier dès S0 ; la crédibilité des plans est un argument marketing, la relecture ne peut pas être sautée.
4. **Continuité de la charge (D4)** — tester que la bascule durée×zone → sRPE ne crée pas de marche dans l'ACWR chronique (UA comparables).
