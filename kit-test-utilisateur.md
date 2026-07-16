# Kit de test utilisateur — Prototype Runly

> Objectif : valider les 5 hypothèses critiques du MVP auprès de 8-10 coureurs intermédiaires, avant d'écrire une ligne de code.
> Matériel : le prototype `prototype-mvp-running.html` (ou les maquettes Sleek), ce guide, 45 min par participant.

## 1. Hypothèses à valider

| # | Hypothèse | Critère de succès (sur 10 participants) |
|---|---|---|
| H1 | La jauge de charge est comprise sans explication | ≥ 7 verbalisent correctement l'idée (« ma semaine vs mon habitude ») en < 30 s |
| H2 | Les coureurs accepteraient de saisir leur RPE après chaque séance | ≥ 7 déclarent qu'ils le feraient ; ≤ 2 y voient une corvée |
| H3 | La pédagogie des séances (pourquoi un fartlek, à quoi sert le seuil) est perçue comme différenciante | ≥ 6 la citent spontanément parmi ce qui leur donnerait envie |
| H4 | La flexibilité (déplacer/ajouter une séance sans casser le plan) répond à une frustration réelle | ≥ 7 racontent une expérience vécue de plan abandonné pour rigidité |
| H5 | Intention de paiement | ≥ 5 se disent prêts à payer ; prix acceptable identifié (Van Westendorp light) |

Règle de décision : H1 et H2 sont **bloquantes** — si elles échouent, on repense la jauge/la saisie avant tout développement. H3-H5 orientent le positionnement et le pricing.

## 2. Recrutement (screener)

Profil cible — 5 questions filtre :

1. Cours-tu au moins 2 fois par semaine depuis plus d'un an ? → **oui requis**
2. Utilises-tu une montre GPS ou une app pour tracer tes sorties ? → **oui requis** (noter la marque)
3. As-tu déjà préparé (ou prépares-tu) une course datée : 10 km, semi, marathon ? → **oui requis**
4. As-tu déjà suivi un plan d'entraînement ? Comment ça s'est terminé ? → mixer : ~la moitié l'a abandonné
5. As-tu été blessé en lien avec la course ces 2 dernières années ? → mixer : viser 4-6 « oui »

Éviter : coachs et pros du sport (biais expert), débutants < 1 an, traileurs exclusifs. Panel : viser la parité H/F, âges 25-50, marques de montres variées. Sourcing : clubs locaux, groupes Strava/WhatsApp de coureurs, collègues coureurs (max 2).

## 3. Déroulé (45 min)

### Intro (5 min)
Cadre : « On teste le concept, pas toi. Il n'y a pas de bonne réponse. Pense à voix haute. » Pas de pitch du produit — surtout ne pas expliquer la jauge.

### Entretien contexte (12 min) — avant de montrer quoi que ce soit
- Raconte-moi ta dernière préparation de course. Comment tu t'es organisé ?
- Comment décides-tu de ce que tu fais à ta prochaine séance ?
- (Si plan suivi) Qu'est-ce qui a marché / cassé ? Que faisais-tu quand tu manquais une séance ?
- (Si blessure) Raconte. Avec le recul, tu l'expliques comment ?
- Comment sais-tu si tu t'entraînes « trop » ou « pas assez » ? *(question clé — noter le vocabulaire utilisé)*
- Qu'utilises-tu aujourd'hui (apps, montre, tableur) ? Qu'est-ce qui te manque ?

### Test du prototype (20 min) — tâches sans assistance

**T1 — Compréhension de la jauge (H1, la plus importante).** Ouvrir l'accueil. « Regarde cet écran 30 secondes. Explique-moi ce que tu comprends. » Ne rien dire. Noter : verbalisation de la jauge, du 1,12, des zones. Puis : « Que ferais-tu si l'aiguille était dans le rouge ? »

**T2 — Dérive de charge.** Déclencher la simulation (bouton démo). « Que s'est-il passé ? Que fais-tu ? » Noter : comprend-il l'alerte, choisit-il Adapter ou Garder, trouve-t-il le ton culpabilisant ou aidant ?

**T3 — Détail de séance.** Ouvrir le 2×2000 m. « Tu dois faire cette séance demain. As-tu toutes les infos ? Il en manque ? » Noter : réaction aux allures/FC calculées (confiance ?), au « Objectif : travailler ton allure cible ».

**T4 — Player.** Lancer la séance guidée (démo ×20). « Tu l'utiliserais en courant ? Téléphone ou montre ? » Noter la friction téléphone-en-main — croiser avec sa marque de montre.

**T5 — RPE (H2).** Écran de fin. « Après chaque séance, l'app te demande ça. Réaction honnête ? » Puis : « Et si je te dis que sans cette note, la jauge de l'écran d'accueil ne marche pas ? »

**T6 — Pédagogie & flexibilité (H3, H4 — verbal, pas dans le proto).** « Imagine un onglet bibliothèque : chaque type de séance expliqué — à quoi sert un fartlek, pourquoi du seuil pour un semi. Ça t'apporte quoi ? » Puis : « Tu veux décaler ta séance de mercredi à jeudi et ajouter une petite sortie pour tester des chaussures : qu'attends-tu de l'app ? »

### Clôture (8 min)
- « Décris l'app à un ami coureur en une phrase. » *(test du positionnement perçu — noter si "blessure", "charge" ou "plan" ressort)*
- Van Westendorp light : « À quel prix par mois ce serait une évidence ? Trop cher ? Suspect tellement c'est pas cher ? »
- « Qu'est-ce qui te ferait NE PAS l'utiliser ? »
- « Tu veux être bêta-testeur ? » *(le taux de oui est un signal en soi)*

## 4. Grille d'observation (à remplir par participant)

| Item | Résultat |
|---|---|
| Profil (âge, séances/sem, montre, blessure, plan abandonné ?) | |
| T1 : verbalisation jauge correcte en < 30 s ? Mots utilisés ? | ☐ oui ☐ partiel ☐ non |
| T1 : réaction au rouge appropriée (lever le pied) ? | ☐ oui ☐ non |
| T2 : choix Adapter / Garder + ressenti sur le ton | |
| T3 : confiance dans les allures calculées ? Infos manquantes ? | |
| T4 : utiliserait le player ? ☐ téléphone ☐ montre ☐ non | |
| T5 : saisirait le RPE ? Ressenti corvée ? Changement après l'argument jauge ? | ☐ oui ☐ oui si rapide ☐ non |
| T6 : pédagogie citée comme différenciant ? Attente flexibilité ? | |
| Phrase de description spontanée | « » |
| Prix évidence / trop cher / suspect | € / € / € |
| Bêta-testeur ? | ☐ oui ☐ non |
| Verbatims marquants | |

## 5. Synthèse & décision

Après les 8-10 sessions : compter les hypothèses validées (tableau §1), extraire les 10 verbatims les plus forts, lister les frictions récurrentes par écran. Décision : GO dev (H1+H2 validées) / itérer sur la jauge (H1 échoue → tester d'autres représentations : score simple, feu tricolore, phrase) / repenser la collecte (H2 échoue → RPE déduit de la FC en fallback, saisie 1-tap depuis la notification).

Astuce : filmer l'écran + audio (avec accord), et noter les 30 premières secondes de T1 mot à mot — c'est la donnée la plus précieuse du test.
