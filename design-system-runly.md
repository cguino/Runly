# Runly — Charte design (v1)

> Extraite des maquettes Sleek validées (accueil/jauge, détail séance, player). Dark mode only pour le MVP.
> Principe directeur : **un coach, pas une alarme** — lisibilité en extérieur, chiffres énormes, couleurs sémantiques strictes.

## 1. Couleurs

### Fondations

| Token | Valeur | Usage |
|---|---|---|
| `bg` | `#0B0E13` | Fond d'écran principal (charbon profond) |
| `surface` | `#171C24` | Cartes, conteneurs |
| `surface-2` | `#1E2530` | Cartes imbriquées, chips, inputs |
| `border` | `#252D3A` | Bordures discrètes (1 px) |
| `text` | `#F2F5F9` | Texte principal |
| `text-muted` | `#8A94A6` | Texte secondaire, labels |
| `text-faint` | `#5B6472` | Mentions légales, hints |

### Sémantiques (règles strictes)

| Token | Valeur | Usage — et rien d'autre |
|---|---|---|
| `action` | `#38BDF8` (bleu ciel) | CTA, boutons primaires, liens, tab active. Texte sur action : `#04121C` |
| `positive` | `#4ADE80` (vert) | Zone favorable, "dans la cible", validations, coaching positif |
| `positive-bg` | `rgba(74,222,128,.12)` | Fonds des bannières/pills positives |
| `danger` | `#EF4444` (rouge) | **Réservé aux pics de charge** (jauge > 1,3, alertes). Jamais pour des erreurs de formulaire |
| `info-load` | `#3B82F6` (bleu franc) | Zone de sous-charge sur la jauge uniquement |
| `warn` | `#FBBF24` (ambre) | Valeurs estimées, adaptations de plan, prudence blessure |

Règle : le rouge est un signal rare et précieux. S'il apparaît partout, la jauge perd son pouvoir.

## 2. Typographie

- **Famille** : SF Pro / Roboto (système), fallback Inter. Géométrique, sans empattement.
- **Chiffres** : `font-variant-numeric: tabular-nums` partout où un chiffre bouge (timer, allure, FC).

| Style | Taille/graisse | Usage |
|---|---|---|
| Timer géant | 96–120 px / 800 | Compte à rebours du player — lisible bras tendu en courant |
| Display | 34–52 px / 800 | Valeur ACWR, stats du player (allure, cardio, distance) |
| H1 | 28 px / 700 | Titre d'écran ("Salut Cedric 👋", nom de séance) |
| H2 | 20 px / 700 | Titres de cartes, valeurs de stat-cards |
| Body | 15–16 px / 400 | Texte courant |
| Label | 11–12 px / 600, **MAJUSCULES**, letter-spacing 0.1em, `text-muted` | Section headers ("STRUCTURE DE LA SÉANCE", "ALLURE CIBLE") |
| Caption | 11–12 px / 400, `text-faint` | Explications, disclaimer |

## 3. Formes & espacements

- Rayons : cartes **20 px**, cartes imbriquées 14 px, pills/chips 999 px, CTA **28 px** (pill).
- Padding cartes : 16–20 px. Gouttières écran : 20 px. Espacement inter-cartes : 12 px.
- Bordures : 1 px `border` ; la carte de répétition active porte une bordure `action` + barre de progression 3 px.
- Ombres : quasi absentes (dark mode) — la hiérarchie vient des niveaux de surface, pas des ombres. Exception : glow léger sous les CTA bleus (`0 8px 24px rgba(56,189,248,.25)`).

## 4. Composants signatures

### Jauge de charge (ACWR) — élément identitaire
Demi-cercle 3 segments : bleu `info-load` (0,6→0,8 sous-charge), vert `positive` (0,8→1,3 favorable), rouge `danger` (1,3→1,6 pic). Aiguille blanche épaisse, pivot central. Valeur en display sous la jauge (virgule française : « 1,12 »), pill de statut colorée en dessous ("Zone favorable · continue comme ça"), caption d'explication + lien "Comment ça marche ?".

### Stat-cards trio
Rangée de 3 cartes égales (label MAJUSCULES + valeur H2) : Distance / Durée / Charge. Utilisée sur détail séance et récaps.

### Timeline de séance (stepper vertical)
Points reliés par une ligne verticale ; point actif en `action`, inactifs en `surface-2`. Chaque étape : titre 600 + sous-texte muted (durée · allure). Les répétitions sont une carte imbriquée : "2000 m @ 4:59/km" à gauche, "FC 158-166" en `action` à droite, barre de progression, récupération en caption.

### Player
Fond légèrement dégradé vers le vert quand on est dans la cible. Hiérarchie : label série ("SÉRIE 1 / 2") → timer géant → "sur 10:00" muted → barre d'allure cible (zone verte centrale + curseur point blanc) → trio de stats → bannière coaching (pleine largeur, `positive-bg`, icône check + message : "Dans la cible, relâche les épaules") → "PROCHAIN" + contrôles. Contrôles : pause = cercle blanc 64 px icône sombre ; skip = cercle `surface-2` 56 px. Chip d'état GPS en haut à droite.

### Pills & chips
Statut : fond sémantique 12 %, texte couleur pleine, 600. Tags de séance (QUALITÉ, RPE 4) : `surface-2`, MAJUSCULES 11 px muted. Sélection (onboarding) : bordure `action` quand actif.

### CTA
Pleine largeur, pill 28 px, fond `action`, texte `#04121C` 700, icône ▶ possible. Secondaire : ghost (transparent, bordure `border`, texte muted). Un seul CTA primaire par écran.

### Checklist hebdo
Case cochée = carré arrondi vert avec check blanc ; à cocher = carré `surface-2`. Ligne : jour · séance en 600, tag à droite.

### Tab bar
3 onglets (Accueil 📊 / Plan 🗓 / Séance ▶), fond `bg` 96 % + bordure haute, actif en `action`, labels 10 px.

## 5. Ton & rédaction (UX writing)

- **Tutoiement**, prénom en accueil, ton de coach bienveillant : "continue comme ça", "relâche les épaules", "savoure".
- Jamais anxiogène : on dit "Ta charge a augmenté de 38 % vs ton habitude", jamais "risque de blessure".
- Toute alerte propose une action en 1 tap + l'option "Garder mon plan" — l'utilisateur décide toujours.
- Valeurs estimées toujours marquées (`warn`) : "estimée", "en calibration".
- Format français : virgule décimale, "4:59 /km", "≈" pour les estimations.
- Disclaimer discret en `text-faint` : "Aide à la décision d'entraînement — ne constitue pas un avis médical."

## 6. Accessibilité & contexte d'usage

- Contraste AA minimum ; les infos critiques en course (timer, allure) visent AAA.
- La couleur n'est jamais le seul vecteur : la jauge a sa pill texte, la cible d'allure a son ✓/△.
- Touch targets ≥ 48 px ; contrôles du player ≥ 56 px (doigts moites, en mouvement).
- Player : écran toujours actif, luminosité respectée, chiffres lisibles en plein soleil (graisse 800).
