# Note réglementaire — Risque de qualification en dispositif médical (MDR 2017/745)

> Résout la question ouverte n°2 de la spec MVP. Analyse du 16/07/2026.
> ⚠️ Cette note est une analyse préparatoire, pas un avis juridique. À faire valider par un avocat spécialisé DM/e-santé avant le lancement.

## Verdict

**Risque faible et maîtrisable — à condition de discipliner le wording.** La qualification en DM ne dépend pas de la technologie (ACWR, RPE, FC) mais de la **destination revendiquée** (intended purpose), qui s'apprécie sur l'UI, la fiche App Store, les pubs et les CGU. Le même produit est hors champ ou classe IIa selon les mots choisis.

## Fondements

### Ce qui nous protège

1. **L'art. 2 MDR, lecture littérale** : la « prévention » n'y est rattachée qu'à la *maladie*, pas à la *blessure* (le volet blessure couvre diagnostic, contrôle, traitement, atténuation — pas la prévention). « Prévenir une blessure sportive » n'est donc pas, littéralement, une destination médicale.
2. **ANSM (doc mis à jour janv. 2026)** : exclusion explicite des logiciels « destinés à la pratique d'entraînements sportifs ou d'amélioration sportive ». Mieux : démontrer qu'un entraînement « diminue un risque sur la santé » **ne suffit pas** à créer une finalité médicale.
3. **MDCG 2019-11 rev.1** : « wellness or fitness apps do not qualify » ; **MHRA** : il faut un lien avec « a specific disease, injury or handicap » ; **BfArM** : apps sport/fitness hors champ si aucune destination médicale revendiquée.
4. **Pratique de marché** : Garmin (Training Load/Status), Whoop (strain), TrainingPeaks opèrent sous l'exclusion bien-être/sport. Aucun ne revendique la « prévention des blessures » comme fonction produit — le thème n'apparaît que dans leur contenu éditorial (blogs).
5. CJUE *Snitem* (C-329/16) : c'est la destination donnée par le fabricant qui est déterminante, module par module.

### Ce qui nous ferait basculer (classe IIa, règle 11)

- Revendiquer « **prévention des blessures** » comme fonction du produit, ou nommer des pathologies (tendinopathie, périostite, fracture de stress, surentraînement) → active l'exemple MDCG rev.1 « prévention du risque de pathologies par analyse de paramètres physiologiques » = classe IIa.
- Des **alertes à finalité santé** (« risque de blessure détecté ») plutôt que des conseils d'entraînement — critère ANSM explicite : analyse de signaux physiologiques individuels + alertes à finalité médicale = DM.
- Utiliser la FC pour détecter des anomalies (« consultez un médecin, FC anormale ») au lieu de calibrer des zones.
- Cibler des populations médicalisées (retour de blessure, réathlétisation, usage kiné).
- Claims cliniques : « réduit le risque de X % », « validé cliniquement », « medical-grade », « recommandé par des kinés ».

Si qualification : classe IIa quasi certaine (la classe I est illusoire pour un logiciel d'analyse physiologique avec alertes) → organisme notifié, ISO 13485, évaluation clinique : **25-110 k€ et 12-18 mois**. Incompatible avec l'économie du MVP.

### La leçon Whoop (FDA, 2025-2026)

Warning letter FDA sur la feature « Blood Pressure Insights », aggravée par le marketing « medical-grade » ; class action dans la foulée ; clôture en juin 2026 après re-wording. Transposable à l'UE : **deux mots de marketing suffisent à déclencher l'enforcement, un re-wording suffit à le clore.** Un disclaimer ne sauve pas un claim médical (position BfArM) — c'est la cohérence globale qui compte.

## Décisions pour Runly

### Positionnement

- La destination officielle du produit (App Store, CGU, site) : **« application d'entraînement et de performance en course à pied »**. La prévention blessure reste notre *North Star produit interne* et un *thème éditorial* (blog, pédagogie des séances), **jamais une revendication produit**.
- L'accroche « progresser sans se blesser » : ne pas l'utiliser en tagline principale. Alternatives validées : « **Progresse durablement** », « La bonne charge, au bon moment », « Cours plus intelligemment ».

### Wording — à proscrire / à utiliser

| ❌ Proscrit | ✅ Recommandé |
|---|---|
| « Prévient / réduit les blessures » | « Optimise ta progression », « progresse durablement » |
| « Risque de blessure élevé » | « Pic de charge : envisage une semaine plus légère » |
| « Alerte santé », « ton corps est en danger » | « Ta charge augmente vite — conseil d'entraînement » |
| Pathologies nommées (tendinopathie, périostite…) | « charge », « fatigue », « récupération » |
| « Validé cliniquement », « medical-grade » | « fondé sur la littérature en sciences du sport » |
| « Détecte le surmenage » | « équilibre charge / récupération » |

### Garde-fous opérationnels

1. **Revue de wording systématique** : tout texte produit (UI, notifications, App Store, pubs) passe le filtre du tableau ci-dessus. Intégré à la charte design (règle UX writing n°6, déjà alignée).
2. **CGU** : « informations à finalité d'entraînement sportif uniquement ; ne constitue pas un avis médical ; ne diagnostique, ne traite ni ne prévient aucune maladie ou blessure ; en cas de douleur ou symptôme, consultez un professionnel de santé ».
3. **Documenter une analyse de qualification** (étapes MDCG 2019-11) datée et signée, à produire en cas de question d'une autorité — c'est peu coûteux et très protecteur.
4. **Vigilance P1/P2** : la cartographie des douleurs (P1) et toute corrélation charge/douleur affichée à l'utilisateur se rapprochent de la ligne rouge — re-passer cette analyse avant de les shipper. Idem pour le coach IA (P2).
5. Faire relire cette note et les CGU par un avocat DM/e-santé avant le lancement (budget à prévoir, quelques k€).

## Sources principales

MDCG 2019-11 rev.1 (Commission UE) · Manuel Borderline & Classification · ANSM « Le logiciel relève-t-il du statut de DM ? » (MAJ 06/01/2026) · BfArM FAQ Medical Apps · MHRA Guidance stand-alone software · CJUE C-329/16 Snitem · FDA warning letter Whoop (14/07/2025) et closeout (17/06/2026) · FDA General Wellness guidance révisée (janv. 2026) · CGU TrainingPeaks · disclaimers Garmin.
