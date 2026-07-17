/**
 * Strings FR externalisées (D7 : i18n-ready, FR seul au MVP).
 * Règle transverse n°3 : aucune string en dur dans les composants.
 * Tout texte visible passe le filtre wording de `note-reglementaire-dm.md`.
 */
export const fr = {
  tabs: {
    home: 'Accueil',
    plan: 'Plan',
    sessions: 'Séances',
    profile: 'Profil',
  },
  screens: {
    home: {
      title: 'Accueil',
      placeholder: 'Ta jauge de charge et ta semaine arrivent ici.',
    },
    plan: {
      title: 'Plan',
      placeholder: 'Ta timeline d’entraînement arrive ici.',
    },
    sessions: {
      title: 'Séances',
      placeholder: 'La bibliothèque de séances arrive ici.',
    },
    profile: {
      title: 'Profil',
      placeholder: 'Tes infos et tes références physio arrivent ici.',
      physioLink: 'Références physio',
      physioLinkHint: 'FCmax · VMA · seuils · zones',
    },
  },
  physio: {
    title: 'Références physio',
    intro: 'Tes repères d’entraînement. Tout est éditable — tape une valeur pour la corriger.',
    fields: {
      vmaKmh: 'VMA',
      fcmaxBpm: 'FC max',
      sv1PctVma: 'Seuil SV1',
      sv2PctVma: 'Seuil SV2',
    },
    units: {
      vmaKmh: 'km/h',
      fcmaxBpm: 'bpm',
      sv1PctVma: '% VMA',
      sv2PctVma: '% VMA',
    },
    confidence: {
      mesure: 'Mesuré',
      estime: 'Estimé',
      defaut: 'Par défaut',
    },
    emptyValue: 'À renseigner',
    zonesTitle: 'Zones FC',
    zoneLabel: 'Zone {{n}}',
    zonePct: '{{min}}–{{max}} % FCmax',
    zoneBpm: '{{min}}–{{max}} bpm',
    revisionsTitle: 'Historique des révisions',
    revisionsEmpty: 'Aucune révision pour l’instant.',
    revisionManual: 'Saisie manuelle',
    revisionRecalc: 'Recalcul accepté',
    revisionFrom: 'depuis {{value}}',
    cooperTitle: 'Estimer ma VMA : test demi-Cooper',
    cooperBody:
      'Après un bon échauffement, cours 6 minutes à l’allure la plus rapide que tu peux tenir sans t’effondrer. Ta distance en mètres divisée par 100 donne ta VMA en km/h : 1 500 m ≈ 15 km/h. Le test guidé dans le player arrive bientôt.',
    recalcTitle: 'Tes dernières séances suggèrent une VMA de {{value}} km/h',
    recalcBody: 'C’est toi qui décides : mettre à jour tes allures, ou garder tes valeurs.',
    recalcAccept: 'Mettre à jour',
    recalcKeep: 'Garder mes valeurs',
  },
  manualWorkout: {
    title: 'Ajouter une séance',
    intro: 'Pas de montre, pas de problème : note ta séance en trois champs.',
    duration: 'Durée',
    durationUnit: 'min',
    durationPlaceholder: 'Ex. 45',
    distance: 'Distance (optionnelle)',
    distanceUnit: 'km',
    distancePlaceholder: 'Ex. 8,2',
    rpe: 'Effort ressenti (RPE 0–10, optionnel)',
    rpePlaceholder: 'Ex. 6',
    rpeHint: '0 = repos total · 10 = effort maximal',
    save: 'Enregistrer la séance',
    invalid: 'Vérifie la durée (obligatoire) et le RPE (entre 0 et 10).',
    saved: 'Séance enregistrée 👍',
  },
  screensHome: {
    addManualWorkout: 'Ajouter une séance manuelle',
  },
  load: {
    title: 'Ta charge',
    alerts: {
      title: {
        pic_charge: 'Ta charge augmente vite',
        sous_charge: 'Ton rythme se fait discret',
        rpe_eleve: 'Deux séances corsées d’affilée',
      },
      body: {
        pic_charge:
          'Charge en hausse de {{pct}} % vs ton habitude — prudence. Suggestion : remplace ta prochaine séance intense par une sortie plus légère.',
        sous_charge:
          'Ta charge est en dessous de ton habitude depuis deux semaines. Une séance facile de plus par semaine, et tu retrouves ton rythme.',
        rpe_eleve:
          'Tu as ressenti tes deux dernières séances à {{rpe}}/10 ou plus. Suggestion : allège ta prochaine séance pour bien assimiler.',
      },
      accept: 'Adapter ma semaine',
      keep: 'Garder mon plan',
    },
    rpePrompt: 'Note l’effort de ta dernière séance',
    disclaimer: 'Aide à la décision d’entraînement — ne constitue pas un avis médical.',
  },
  gauge: {
    empty: '—',
    status: {
      calibration: 'En calibration',
      sous_charge: 'Sous ta zone · tu peux en faire un peu plus',
      favorable: 'Zone favorable · continue comme ça',
      pic: 'Pic de charge · prudence',
    },
    caption: {
      calibration:
        'Ta jauge apprend ton habitude d’entraînement : encore quelques semaines de données et elle t’accompagnera séance après séance.',
      sous_charge:
        'Ta charge est en dessous de ton habitude des 4 dernières semaines. Une séance douce de plus suffit souvent à relancer la dynamique.',
      favorable: 'Ta charge est bien équilibrée par rapport à ton habitude des 4 dernières semaines.',
      pic: 'Ta charge augmente vite par rapport à ton habitude — envisage une semaine plus légère.',
    },
    forecast: '≈ {{value}} à J+7 si tu suis ta semaine',
    howItWorks: 'Comment ça marche ?',
    a11y: 'Jauge de charge : {{status}}',
    info: {
      title: 'Comment ça marche ?',
      intro:
        'Ta jauge compare ce que tu viens de faire à ce que ton corps a l’habitude de faire. Rien de magique : deux nombres et un ratio.',
      acuteTitle: 'Ta charge récente',
      acuteBody:
        'Chaque séance compte pour ton effort ressenti (RPE de 0 à 10) multiplié par sa durée en minutes. La jauge additionne tes 7 derniers jours : c’est ta charge récente.',
      chronicTitle: 'Ton habitude',
      chronicBody:
        'Sur tes 4 dernières semaines, la jauge calcule ta charge moyenne par semaine : c’est ton habitude, la base que ton corps connaît et sur laquelle tu progresses.',
      ratioTitle: 'Le ratio',
      ratioBody:
        'La jauge divise ta charge récente par ton habitude. Entre 0,8 et 1,3, tu es dans ta zone favorable : continue comme ça. En dessous, tu peux en faire un peu plus. Au-dessus, ta charge augmente vite — une séance plus légère aide à garder l’équilibre entre charge et récupération. Dans tous les cas, c’est toi qui décides.',
    },
  },
  rpe: {
    title: 'Ton ressenti',
    question: 'Comment était ta séance ?',
    hint: '0 = repos total · 10 = effort maximal',
    save: 'Enregistrer',
    noWorkout: 'Aucune séance à noter pour l’instant.',
    /** Ancres émoji de l'échelle 0–10 (G6) — `max` = borne haute incluse. */
    anchors: [
      { max: 1, emoji: '😌', label: 'Très facile' },
      { max: 3, emoji: '🙂', label: 'Facile' },
      { max: 5, emoji: '😊', label: 'Modéré' },
      { max: 7, emoji: '😅', label: 'Difficile' },
      { max: 9, emoji: '🥵', label: 'Très difficile' },
      { max: 10, emoji: '🤯', label: 'Maximal' },
    ],
  },
  gallery: {
    title: 'Galerie UI',
    intro: 'Revue visuelle des composants du design system (écran de dev).',
    devLink: 'Galerie UI (dev)',
    sections: {
      buttons: 'Boutons',
      pills: 'Pills & chips',
      cards: 'Cartes',
      stats: 'Stat-cards',
      timeline: 'Timeline de séance',
      checklist: 'Checklist hebdo',
      inputs: 'Inputs',
      sheet: 'Bottom sheet',
    },
    samples: {
      ctaStart: 'Démarrer la séance',
      ctaGhost: 'Garder mon plan',
      pillPositive: 'Zone favorable · continue comme ça',
      pillWarn: 'Estimé',
      pillMuted: 'À renseigner',
      chipQuality: 'Qualité',
      chipRpe: 'RPE 4',
      cardTitle: 'Carte de base',
      cardBody: 'La hiérarchie vient des niveaux de surface, pas des ombres.',
      nestedCard: '2000 m @ 4:59/km',
      nestedCaption: 'Récupération 2 min',
      statDistance: 'Distance',
      statDuration: 'Durée',
      statLoad: 'Charge',
      timelineWarmup: 'Échauffement',
      timelineWarmupSub: '15 min · allure libre',
      timelineWork: '2 × 2000 m',
      timelineWorkSub: '@ 4:59 /km · récup 2 min',
      timelineCooldown: 'Retour au calme',
      timelineCooldownSub: '10 min · zone 1',
      checkMonday: 'Lun',
      checkMondayTitle: 'Endurance fondamentale 45 min',
      checkWednesday: 'Mer',
      checkWednesdayTitle: 'Seuil 2 × 12 min',
      checkSaturday: 'Sam',
      checkSaturdayTitle: 'Sortie longue 1 h 20',
      inputLabel: 'VMA',
      inputPlaceholder: 'Ex. 16,5',
      inputUnit: 'km/h',
      openSheet: 'Ouvrir le bottom sheet',
      sheetTitle: 'Adapter ma semaine',
      sheetBody: 'Le contenu réel arrive avec le Lot 8 — ceci est la coquille visuelle.',
      sheetClose: 'Fermer',
    },
  },
  common: {
    comingSoon: 'Bientôt disponible',
  },
} as const;

export type FrResources = typeof fr;
