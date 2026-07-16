# Spec MVP — App d'entraînement running "courir mieux, sans se blesser"

> **Version** : 0.2 — 16/07/2026 (intégration retours UX : navigation 4 onglets, profil/FCmax, timeline plan, flexibilité du plan, bibliothèque pédagogique)
> **Auteur** : Cédric Guinoiseau
> **Fondation scientifique** : Lantelme S., *Quantification de la charge d'entraînement et blessures liées à la course à pied : une revue systématique* (2023)

---

## 1. Problème

40 à 50 % des coureurs se blessent chaque année, et 60 à 80 % de ces blessures sont attribuées à des erreurs d'entraînement — principalement une progression de charge inadaptée. Le coureur intermédiaire qui prépare une course datée (10K, semi, marathon) jongle aujourd'hui entre un plan PDF générique, sa montre GPS, Strava et un tableur : aucun outil ne relie son **plan** à son **vécu réel** (séances effectuées, fatigue, ressenti) pour l'alerter quand il dérive vers la zone de risque. Résultat : blessure, objectif manqué, perte de plaisir.

**Insight clé de la littérature** : ce n'est pas le volume absolu qui blesse (une charge chronique élevée est même plutôt protectrice), c'est la **mauvaise progression** — les pics et les creux de charge. C'est exactement ce qu'une app connectée à la montre peut détecter, et qu'aucun acteur grand public ne traite comme cœur de produit.

## 2. Vision & positionnement

**Vision** : le coach de poche qui aide chaque coureur à atteindre son objectif en restant dans sa zone d'adaptation — progresser sans se blesser, sans perdre le plaisir.

**Positionnement vs concurrence** :

| Acteur | Force | Faiblesse exploitée |
|---|---|---|
| Strava | Social, tracking | Pas de plan, pas de gestion de charge orientée blessure |
| Garmin Coach / Suunto | Plans adaptatifs | Fermé à l'écosystème constructeur, ACWR absent ou caché |
| Runna / Campus.coach | Plans structurés vers objectif | Prévention blessure secondaire, peu de pilotage par le ressenti (RPE) |
| Kinés / coachs humains | Personnalisation | Coût, disponibilité |

**Différenciateur MVP** : la **jauge de charge** (ACWR + sRPE) comme colonne vertébrale du produit. Le plan s'adapte à la charge réelle, pas l'inverse.

**Posture éditoriale (non négociable)** : la science ne prouve pas de causalité charge→blessure. L'app fournit des **signaux d'alerte et une aide à la décision**, jamais une promesse de « zéro blessure ». Formulations type : « ta charge augmente vite, prudence » — jamais « tu vas te blesser » ni « tu es protégé ».

**Cadrage réglementaire (voir `note-reglementaire-dm.md`)** : la destination officielle du produit est « application d'entraînement et de performance en course à pied ». La prévention blessure est la North Star interne et un thème éditorial — **jamais une revendication produit** (App Store, pubs, UI), sous peine de qualification en dispositif médical classe IIa. Tagline recommandée : « Progresse durablement » plutôt que « progresser sans se blesser ».

## 3. Cible & persona

**Cible MVP** : coureur·se intermédiaire, 25–50 ans, 2 à 5 séances/semaine, possède une montre GPS (Garmin, Apple Watch, Coros, Polar…), prépare 1 à 3 courses datées par an, connaît vaguement les notions d'allure/VMA sans savoir les exploiter.

**Persona — "Marc, 38 ans"** : court depuis 4 ans, 3 séances/semaine, ~35 km. Objectif semi-marathon en 1h45 dans 14 semaines. A déjà eu une périostite en suivant un plan trouvé en ligne « trop dur, trop vite ». Utilise une Garmin + Strava. Frustrations : ne sait pas quelle allure viser en fractionné, ne sait pas si sa semaine est « trop » ou « pas assez », abandonne ses plans quand la vie décale ses séances.

**Hors cible MVP** : débutant complet (pas de notion d'allure, autre parcours d'accompagnement), trail/ultra (charge en D+/durée, spécificités reportées en P2), coureur élite encadré.

## 4. Goals / Non-goals

**Goals**

1. L'utilisateur dispose d'un plan périodisé daté vers son objectif, généré depuis son profil réel, en < 10 min après installation.
2. Chaque séance est **exécutable** : allures cibles, zones FC, timer guidé — plus jamais de calcul mental sur « 2×2000 m allure semi ».
3. L'utilisateur voit en permanence où il se situe dans sa zone de charge (jauge ACWR) et reçoit une alerte actionnable en cas de pic (> 1,3) ou de sous-régime (< 0,8).
4. Le plan s'adapte automatiquement au vécu : séance manquée, RPE élevé, charge qui dérive.
5. Rétention D30 ≥ 40 % chez les utilisateurs ayant un objectif daté actif.

**Non-goals (MVP)**

- **Réseau social / feed / segments** : Strava le fait mieux ; notre valeur est le pilotage individuel. (P2 : partage simple d'une séance)
- **Coaching humain / marketplace de coachs** : modèle opérationnel différent, à valider après le produit self-service.
- **Nutrition, sommeil, musculation** : signaux pertinents mais chaque vertical est un produit en soi. Le sommeil pourra nourrir la jauge de charge en P1/P2 via HealthKit.
- **App montre native (watchOS/Wear OS)** : le player tourne sur téléphone au MVP ; la montre reste l'outil de mesure. Compagnon montre = P2 (décision d'archi à anticiper).
- **Inscription aux courses / calendrier d'épreuves intégré** : l'objectif est saisi manuellement (nom, date, distance). Intégration d'un catalogue d'épreuves = P2.
- **Prédiction de blessure individualisée par ML** : la littérature ne le supporte pas ; on s'en tient aux règles validées (ACWR, progression graduée).

## 5. Fondation scientifique → règles produit

Traduction directe de la revue Lantelme en logique applicative :

| Évidence (Lantelme 2023) | Règle produit |
|---|---|
| ACWR : zone favorable ≈ 0,8–1,3 ; ≥ 1,3 = risque accru ; ≤ 0,8 = sous-charge | Jauge de charge 3 zones (vert/orange/rouge) recalculée à chaque séance. Charge aiguë = 7 j glissants ; chronique = moyenne 28 j |
| sRPE fiable, corrélé FC/lactates, sans matériel | Après chaque séance : RPE 0–10 × durée (min) = charge de séance (UA). Combinée à la charge externe (km, FC) |
| Règle des 10 % : indicative, à personnaliser, non à imposer | Progression hebdo du plan ≤ 10 % par défaut, ajustable ; alerte (jamais blocage) si l'utilisateur dépasse |
| < 2 séances/sem = risque accru ; 2–5 séances = zone citée favorable | Le générateur de plan refuse < 2 séances/sem et recommande ≥ 3 pour un objectif chrono |
| Intensité moyenne plutôt faible + intervalles : tendance favorable | Plans à dominante endurance fondamentale (~80 % du volume facile) + 1–2 séances de qualité/sem |
| Charge chronique élevée plutôt protectrice ; ce sont les pics qui inquiètent | Le discours produit valorise la régularité, pas la réduction du volume |
| Antécédent de blessure = facteur de risque le plus robuste | Collecté à l'onboarding → prudence renforcée du plan (progression 5–8 %) et messages adaptés |
| Cadence ~180 ppm réduit les forces d'impact | Affichage cadence post-séance + conseil contextuel (P1) |
| Aucune causalité prouvée ; hétérogénéité forte | Ton = aide à la décision. Disclaimer santé. Jamais de promesse de prévention garantie |

## 6. Parcours clés (user journeys)

### 6.1 Onboarding (objectif : < 10 min jusqu'au plan)

1. **Connexion santé** : Apple Santé (iOS) / Health Connect (Android) → import de l'historique course (26 dernières semaines si dispo) pour amorcer la charge chronique et estimer le niveau.
2. **Profil** : âge, sexe, poids (optionnel), antécédents de blessure (12 derniers mois : type, gravité), FCmax connue ou estimée.
3. **Contexte d'entraînement** : séances/sem souhaitées (2–6), jours disponibles, volume actuel (pré-rempli depuis l'historique importé), types de séances déjà pratiqués/appréciés.
4. **Objectif** : distance (5K, 10K, semi, marathon), date de course, ambition (finir / chrono cible), nom de l'épreuve (texte libre).
5. **Estimation des références** : VMA estimée depuis l'historique (meilleurs efforts) ou test guidé proposé (demi-Cooper 6 min) ; dérivation FCmax, allures et zones (cf. §7.5).
6. **Restitution** : « Voici ton plan de 14 semaines » + explication de la jauge de charge en 3 écrans pédagogiques.

**Cas limites** : pas de montre / refus de permission → mode déclaratif (saisie manuelle durée + distance + RPE), l'app reste 100 % fonctionnelle. Historique < 4 semaines → charge chronique en « warm-up » : jauge affichée comme « en calibration » pendant 3 semaines, alertes désactivées.

### 6.2 Semaine type

Lundi : notification « ta semaine » (3 séances planifiées, volume, charge prévisionnelle vs zone favorable). Mercredi : Marc ouvre la séance « 2×2000 m allure semi », lit le brief (objectif physiologique, allures, FC cibles, durée totale estimée), lance le player, court, la séance remonte via HealthKit, il saisit son RPE (7/10) en 5 s. La jauge se met à jour. Dimanche soir : récap hebdo (réalisé vs prévu, évolution ACWR, message d'adaptation éventuel pour la semaine suivante).

### 6.3 Dérive de charge

Marc enchaîne une semaine chargée + une sortie longue improvisée. ACWR passe à 1,38 → notification : « Ta charge a augmenté de 38 % vs ton habitude. Suggestion : remplacer le fractionné de jeudi par 40 min EF. [Accepter] [Garder mon plan] ». L'utilisateur reste décideur ; l'app trace le choix.

### 6.4 Séance manquée / vie réelle

Séance non réalisée à J+1 → le plan repropose la séance clé de la semaine et abandonne la séance secondaire (règle : on ne « rattrape » jamais en empilant). Deux semaines de rupture → proposition de re-périodisation de l'objectif.

## 7. Features MVP (P0)

### 7.1 Onboarding & profil

- **US-01** : En tant que coureur, je connecte Apple Santé / Health Connect pour que mon historique et mes futures séances alimentent l'app sans saisie.
- **US-02** : En tant que coureur blessé par le passé, je déclare mes antécédents pour que mon plan soit plus prudent.

Critères d'acceptation : permissions demandées avec écran d'explication préalable (pas de prompt système à froid) ; import 26 semaines d'activités « course » ; onboarding complet ≤ 10 min ; chaque étape skippable avec valeur par défaut ; mode 100 % déclaratif fonctionnel sans montre.

### 7.2 Objectif daté & génération de plan périodisé

- **US-03** : En tant que coureur, je définis une course cible (distance, date, ambition) pour obtenir un plan périodisé jusqu'au jour J.
- **US-04** : En tant que coureur, je choisis mes jours et mon nombre de séances/sem pour que le plan colle à ma vie.

Comportement : plan découpé en phases (générale → spécifique → affûtage 7–14 j), semaines types avec 1 semaine allégée toutes les 3–4 semaines ; ~80 % du volume en endurance fondamentale, 1–2 séances de qualité/sem ; progression hebdo ≤ 10 % (5–8 % si antécédent de blessure < 12 mois) ; refus de générer < 2 séances/sem ; distances MVP : 5K, 10K, semi, marathon (trail P2).

Critères d'acceptation : Given un objectif semi à 14 semaines et 3 j dispo, When je valide, Then je vois 14 semaines de séances datées, chaque semaine ≤ +10 % de charge vs précédente, affûtage présent. Si la date est trop proche pour l'ambition (ex. marathon dans 4 semaines, volume actuel 15 km), l'app le dit et propose : autre objectif, ambition « finir », ou date ultérieure.

### 7.3 Bibliothèque pédagogique & builder de séances (onglet « Séances »)

Types de séances MVP : endurance fondamentale (EF), sortie longue, fractionné court (VMA), seuil (SV2), tempo, fartlek, récupération, côtes (P1).

L'onglet « Séances » est une **bibliothèque pédagogique librement explorable**, indépendante du plan : l'utilisateur peut découvrir, comprendre et faire n'importe quelle séance, qu'elle soit ou non dans son plan. Chaque **fiche séance** contient : ce que c'est (1 phrase), ce qu'elle développe (objectif physiologique vulgarisé), pour quels objectifs on la fait, l'effort attendu (RPE cible), comment la réussir (conseils de coach), les erreurs classiques, et ses variantes par niveau. Deux actions : « L'ajouter à ma semaine » (avec impact sur la jauge prévisionnelle) ou « La faire maintenant ».

- **US-05** : En tant que coureur, je consulte une séance avec ses blocs (échauffement / corps / retour au calme), les allures et FC cibles, la distance et la durée totales estimées, et l'objectif physiologique en une phrase.
- **US-05b** : En tant que coureur curieux, je découvre ce qu'est un fartlek ou une séance au seuil, pourquoi et quand la faire, pour progresser en comprenant ce que je fais.
- **US-06** : En tant que coureur, je construis ma propre séance par blocs (répétitions × durée-ou-distance @ allure/zone, récupérations) pour jouer la séance de mon coach ou de mon club.

Critères d'acceptation : l'exemple canonique « 2×2000 m @ allure semi, récup 2 min » affiche automatiquement : distance totale (éch. 15 min + 2×2000 + récup + RAC ≈ 9 km), durée totale estimée (≈ 47 min), allure cible (ex. 4:59/km si objectif 1h45) et zone FC cible (ex. 88–92 % FCmax). Builder : blocs imbriqués (séries), cible par allure, zone FC ou RPE ; sauvegarde et duplication.

### 7.4 Player de séance

- **US-07** : En tant que coureur, je lance une séance guidée qui m'annonce chaque bloc (timer, allure cible, zone FC) pour ne plus rien calculer en courant.

Comportement : timer par bloc avec annonces audio (début/fin de bloc, allure cible) ; affichage gros caractères lisible en courant ; fonctionne écran verrouillé ; GPS téléphone pour allure temps réel (FC temps réel si capteur connecté au téléphone — sinon zones annoncées à titre indicatif) ; pause/reprise/abandon ; à la fin : enregistrement + demande RPE.

Critères d'acceptation : dérive du timer < 1 s sur 1 h ; consommation batterie < 15 %/h GPS actif ; si l'utilisateur préfère courir avec sa montre, il peut jouer la séance en « mode carte » (brief consultable) et laisser la montre tracker — la séance remonte ensuite via santé et est rapprochée de la séance planifiée (matching par date/durée/distance).

### 7.5 Références physiologiques : VMA, FCmax, SV1/SV2, zones

- **US-08** : En tant que coureur, je connais ma VMA, ma FCmax et mes allures d'entraînement sans passer un test en labo.

Méthodes MVP :

| Donnée | Méthode primaire | Fallback |
|---|---|---|
| VMA | Estimation depuis historique (meilleurs efforts 5–12 min, modèle de puissance critique simplifié) | Test demi-Cooper guidé (6 min) via le player ; saisie manuelle |
| FCmax | Max observé dans l'historique (fiabilité affichée) | 208 − 0,7 × âge (Tanaka) ; saisie manuelle |
| SV1 / SV2 | Estimation % VMA (SV1 ≈ 70–80 %, SV2 ≈ 85–90 %) — présenté comme estimation | Saisie manuelle (test terrain, labo) |
| Allures de course | Tables VMA → allure cible 5K/10K/semi/marathon, croisées avec l'ambition chrono | — |
| Zones FC (5 zones) | % FCmax | % FC de réserve si FC repos dispo (P1) |

Critères : chaque valeur porte un indice de confiance (mesuré / estimé / défaut) ; recalcul proposé (jamais imposé) quand une performance récente contredit l'estimation ; tout est éditable.

### 7.6 Jauge de charge & alertes (le différenciateur)

- **US-09** : En tant que coureur, je vois en un coup d'œil si ma charge est dans ma zone favorable pour décider de ma prochaine séance en confiance.
- **US-10** : En tant que coureur, je reçois une suggestion concrète quand ma charge dérive, pour corriger sans réfléchir.

Comportement : charge de séance = sRPE (RPE 0–10 × durée min), avec fallback = durée × zone moyenne si RPE non saisi ; ACWR = charge 7 j / moyenne 28 j, affiché en jauge 3 zones (< 0,8 sous-charge / 0,8–1,3 favorable / > 1,3 pic) ; projection : la jauge montre aussi l'ACWR *prévisionnel* si l'utilisateur suit le plan de la semaine ; alertes : pic → suggestion de substitution de séance ; sous-charge prolongée (> 2 sem) → encouragement à la régularité ; RPE ≥ 8 sur 2 séances consécutives → suggestion d'allègement.

Critères : jamais plus d'1 alerte charge / 48 h ; chaque alerte propose une action en 1 tap + option « garder mon plan » ; wording validé selon la posture §2 (pas de prédiction de blessure) ; jauge « en calibration » tant que < 4 semaines d'historique.

### 7.7 Sync santé & journal

- **US-11** : En tant que coureur, mes séances montre apparaissent automatiquement et sont rapprochées de mon plan.

Comportement : lecture HealthKit / Health Connect (workouts running : durée, distance, FC, cadence si dispo) ; **connexion Strava optionnelle (OAuth) dès le MVP** — comble Suunto/Android, la trace GPS et les utilisateurs sans partage santé activé ; priorité de source en cas de doublon : Strava > santé, déduplication par date/durée/distance ; écriture des séances player vers santé ; matching auto séance réalisée ↔ planifiée (même jour ± tolérance, confirmation en 1 tap si ambigu) ; saisie RPE post-séance (notification 30 min après détection) ; journal chronologique : prévu/réalisé, charge, notes libres, douleurs (tag simple corps humain — P1 pour la cartographie, P0 pour un tag texte).

### 7.8 Profil & références physiologiques (onglet « Profil »)

- **US-12** : En tant que coureur, j'accède à un espace profil regroupant mes infos (âge, poids, antécédents), mon objectif en cours et mes références physiologiques (FCmax, VMA, SV1/SV2, zones), chacune avec son badge de provenance (mesurée / estimée / défaut) et éditable.
- **US-13** : En tant que coureur dont la FCmax est estimée, je suis invité à la fiabiliser — saisie d'une valeur connue au MVP, **test demi-Cooper guidé via le player en P1** (l'invitation existe dès le MVP, avec le protocole expliqué pour le faire en autonomie).

Contenu : identité & mesures, antécédents de blessure (modifiables, impactent la prudence du plan), références physio avec historique des révisions, objectif actif (modifier / abandonner), réglages (permissions santé, notifications, compte, suppression RGPD).

### 7.9 Flexibilité du plan — « le plan est une proposition, pas un contrat »

Principe : la vie gagne toujours. Trois libertés garanties au MVP, toutes traduites dans la jauge prévisionnelle plutôt qu'interdites :

- **Déplacer une séance** dans la semaine (bottom sheet « choisir un autre jour ») : l'app recalcule l'ACWR prévisionnel et avertit seulement si le déplacement crée un enchaînement déconseillé (2 qualités d'affilée, qualité la veille de la sortie longue). Elle n'empêche jamais.
- **Ajouter une séance spontanée** (l'EF « test des nouvelles chaussures ») : depuis la bibliothèque ou en course libre. La séance entre dans la charge comme les autres ; si elle fait dériver la semaine, la jauge le montre et suggère un allègement ailleurs.
- **Faire n'importe quelle séance de la bibliothèque**, hors plan : même logique — tout est permis, tout est compté, la jauge arbitre.

Règle d'équilibre : une séance déplacée/ajoutée ne déclenche une suggestion d'adaptation que si la charge projetée sort de la zone favorable. En dessous, l'app se tait (pas de culpabilisation).

### 7.10 Navigation & architecture d'information

Schéma complet : voir `navigation-app-running.mermaid`. Principes (conformes HIG iOS / Material 3) :

- **4 onglets racines** : Accueil (jauge + semaine), Plan (timeline), Séances (bibliothèque), Profil. Un onglet racine ne porte **jamais** de bouton retour ; chaque onglet conserve sa pile de navigation (revenir sur un onglet restaure son état).
- **Push + retour** pour les écrans de détail (détail séance, fiche pédagogique, références physio).
- **Modal plein écran** pour les flux engageants : player (tab bar masquée, quitter = confirmation) puis RPE. **Bottom sheets** pour les micro-décisions : déplacer une séance, adapter la semaine.
- **Accueil = vision 7 jours fixes** (lun→dim), **jours de repos affichés explicitement** : le repos fait partie de l'entraînement (message coach) et sert de cible de dépôt quand on déplace une séance. Le récap hebdo compare la semaine à la précédente.
- **Plan (onglet) = timeline verticale continue** : semaines passées (séances réalisées vs prévues, RPE, charge) et à venir (séances planifiées, phases de périodisation, semaines allégées marquées). La liste simple suffit au MVP ; la visualisation graphique de charge par semaine est en P1.

## 8. P1 (fast-follow) & P2 (plus tard, mais anticiper)

**P1** : test demi-Cooper guidé via le player (fiabilisation FCmax/VMA) ; graphique de charge hebdomadaire dans l'onglet Plan ; semaine adaptative complète (re-génération du plan restant selon charge/RPE) ; conseils cadence (~180 ppm) post-séance ; import FC de repos + sommeil pour moduler les suggestions ; cartographie des douleurs et corrélation charge/douleur ; côtes et séances spécifiques ; widget iOS/Android (prochaine séance + jauge) ; export/partage d'une séance.

**P2** : trail/ultra (charge en durée + D+, allure nivelée) ; app compagnon watchOS/Wear OS ; catalogue d'épreuves et inscription ; social léger (défis entre amis) ; mode débutant (mo­tivation, marche/course) ; coach conversationnel (LLM) s'appuyant sur la jauge et le plan ; API Strava en source complémentaire.

**Décisions d'archi à prendre dès le MVP pour ne pas fermer P2** : modèle de séance en blocs sérialisable (jouable sur montre plus tard) ; charge stockée en UA multi-sources (sRPE, TRIMP futur) ; plan = fonction pure (profil, objectif, historique) → re-générable à tout moment.

## 9. Modèle de données (simplifié)

```
User (profil, antécédents[], préférences, permissions)
 ├─ PhysioProfile (vma, fcmax, sv1, sv2, zones[], confiance par champ, historique des révisions)
 ├─ Goal (distance, date, ambition, épreuve, statut)
 │   └─ TrainingPlan (phases[], statut, version)
 │       └─ PlannedWeek (index, volumeCible, chargeCible)
 │           └─ PlannedSession (date, type, blocs[], allures/zones cibles, statut)
 ├─ Workout (source: healthkit|healthconnect|player|manuel, durée, distance, FC[], cadence, gps?)
 │   ├─ matchedPlannedSession?
 │   └─ SessionFeedback (rpe, douleurs[], note)
 ├─ LoadMetrics (journalier : chargeAiguë7j, chargeChronique28j, acwr, statutJauge)
 └─ Alert (type, déclencheur, action proposée, décision utilisateur, timestamp)

SessionBlock (répétitions, durée|distance, cible: allure|zoneFC|rpe, récup)
```

Données de santé = données sensibles : hébergement UE, consentement explicite, minimisation (pas de stockage GPS brut si non nécessaire), suppression de compte = purge complète. RGPD by design.

## 10. Métriques de succès

**Leading (S1–S4 post-launch)** : activation = % d'installs avec plan généré + 1re séance réalisée (cible 45 %) ; % de séances avec RPE saisi (cible 70 % — condition de survie de la jauge) ; % d'utilisateurs connectant santé (cible 80 %) ; taux d'acceptation des suggestions d'adaptation (cible 50 %).

**Lagging (M1–M3)** : rétention D30 ≥ 40 % / D90 ≥ 25 % chez les porteurs d'objectif daté ; % d'utilisateurs terminant leur plan jusqu'à la course (cible 35 %) ; part du temps passé en zone ACWR favorable (indicateur produit ET santé, cible 70 %) ; NPS ≥ 40.

**Mesure** : événements analytics définis avant dev (plan_generated, session_played, rpe_submitted, alert_shown/accepted…), revue à S2, M1, M3.

## 11. Questions ouvertes

| # | Question | Qui | Bloquant |
|---|---|---|---|
| 1 | ~~Health Connect : couverture réelle des montres côté Android. Faut-il l'API Strava en secours dès le MVP ?~~ **Résolu (16/07/2026, voir `spike-sources-donnees.md`)** : socle santé (HealthKit + Health Connect) + connexion Strava optionnelle dès le MVP. Suunto absent de Health Connect, GPS non fiable via les hubs, API Garmin fermée aux nouveaux entrants. Reste à tester en réel : ExerciseRoute/FC Garmin et Coros, latence de sync. | Eng (spike 3 j) | Résolu |
| 2 | ~~Statut réglementaire : la jauge fait-elle basculer l'app en dispositif médical ?~~ **Résolu (16/07/2026, voir `note-reglementaire-dm.md`)** : risque faible si le wording reste discipliné. Destination officielle = « app d'entraînement et de performance » ; la prévention blessure reste un thème éditorial, jamais une revendication produit ; alertes libellées en conseils d'entraînement. Relecture avocat DM/e-santé avant lancement. | Juridique (validation avocat) | Résolu (sous réserve validation) |
| 3 | Algorithme de génération de plan : moteur de règles maison vs partenariat contenu (coach/fédération) pour la crédibilité des plans ? **Orientation (backlog E3)** : moteur maison (`@runly/training-engine`, fonction pure testable) + validation des sorties par un coach/expert (E3-4). Partenariat fédération = piste P2 crédibilité/marketing. | Produit + expert running | Orienté |
| 4 | Modèle éco : freemium (jauge gratuite, plan payant ?) vs abonnement full — impacte le périmètre du MVP gratuit | Produit/Business | Non |
| 5 | ACWR : fenêtres 7/28 j strictes ou moyennes pondérées exponentiellement (EWMA, plus robustes aux trous de données) ? | Eng + science | Non |
| 6 | RPE : échelle 0–10 (Foster) confirmée ? Emoji vs chiffres pour maximiser la saisie ? | Design (test utilisateur) | Non |

## 12. Timeline indicative

- **Sprint 0 (2 sem)** : spikes Health Connect + réglementaire, design system, maquettes onboarding/jauge/player, validation des plans avec un coach.
- **Phase 1 (6–8 sem)** : onboarding, profil physio, génération de plan, bibliothèque de séances, sync santé lecture.
- **Phase 2 (4–6 sem)** : player, RPE, jauge ACWR + alertes, récap hebdo, builder de séances.
- **Beta fermée (4 sem)** : 50–100 coureurs (clubs locaux), objectif : valider taux de saisie RPE et compréhension de la jauge.
- **Launch** : idéalement 12–16 semaines avant la saison des courses d'automne (cible : préparation des marathons/semis d'octobre–novembre).

---

*Disclaimer produit (à faire valider) : cette application propose une aide à la planification de l'entraînement fondée sur la littérature scientifique. Elle ne constitue pas un avis médical et ne prédit ni ne prévient les blessures de manière garantie. En cas de douleur, consultez un professionnel de santé.*

