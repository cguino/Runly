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
      notificationsLink: 'Notifications',
      notificationsLinkHint: 'Ta semaine · rappels · récap hebdo',
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
      favorable:
        'Ta charge est bien équilibrée par rapport à ton habitude des 4 dernières semaines.',
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
  onboarding: {
    skip: 'Passer cette étape',
    days: {
      d0: 'Lun',
      d1: 'Mar',
      d2: 'Mer',
      d3: 'Jeu',
      d4: 'Ven',
      d5: 'Sam',
      d6: 'Dim',
    },
    sante: {
      title: 'Connecte tes séances',
      body: 'Runly peut lire tes séances de course depuis Apple Santé ou Health Connect : ton historique amorce ta jauge de charge, et tes prochaines séances remonteront toutes seules, sans saisie.',
      privacy:
        'On ne garde que les résumés de séance — durée, distance, fréquence cardiaque moyenne. Jamais ton tracé GPS ni tes données brutes.',
      promptNotice:
        'La demande d’autorisation du système ne s’affiche qu’après cet écran — rien ne part sans ton accord.',
      connect: 'Connecter mes données santé',
      later: 'Plus tard',
      laterHint:
        'Sans montre ni connexion, tout fonctionne : tu noteras tes séances en trois champs (durée, distance, effort).',
      imported: '{{count}} séance(s) de course importée(s) sur les 26 dernières semaines.',
      importedNone:
        'Aucune séance de course trouvée dans ton historique — pas de souci, ta jauge se calibrera au fil de tes premières séances.',
      calibrationPill: 'Jauge en calibration',
      calibrationHint:
        'Moins de 4 semaines d’historique : ta jauge apprend encore ton habitude, ses repères s’affinent au fil des séances.',
      denied:
        'Pas d’accès santé pour l’instant : tu passes en mode déclaratif — l’app reste 100 % fonctionnelle.',
      continue: 'Continuer',
    },
    profil: {
      title: 'Parle-nous de toi',
      firstName: 'Prénom (optionnel)',
      firstNamePlaceholder: 'Ex. Marc',
      birthDate: 'Date de naissance',
      birthDatePlaceholder: 'JJ/MM/AAAA',
      birthDateHint: 'Elle affine tes zones cardiaques et confirme l’âge minimum (16 ans).',
      injuryQuestion: 'Ces 12 derniers mois, un pépin physique t’a-t-il arrêté de courir ?',
      injuryYes: 'Oui',
      injuryNo: 'Non',
      injuryNote: 'Dis-nous en deux mots (optionnel)',
      injuryNotePlaceholder: 'Ex. douleur au mollet au printemps, 3 semaines sans courir',
      injuryHint: 'Si oui, ton plan progressera plus en douceur — c’est tout ce que ça change.',
      underAge:
        'Runly est réservé aux 16 ans et plus. On préfère te le dire franchement : reviens nous voir bientôt !',
      invalid: 'Vérifie la date de naissance (format JJ/MM/AAAA).',
      continue: 'Continuer',
    },
    contexte: {
      title: 'Ton entraînement, aujourd’hui',
      sessionsLabel: 'Séances par semaine',
      sessionsHint:
        'Minimum 2 : en dessous, impossible de construire une progression régulière — le moteur de plan ne génère rien.',
      daysLabel: 'Tes jours disponibles',
      volumeLabel: 'Volume hebdo actuel',
      volumeUnit: 'km',
      volumePlaceholder: 'Ex. 25',
      volumePrefilled: 'Pré-rempli depuis ton historique — corrige si besoin.',
      invalid: 'Choisis entre 2 et 6 séances et au moins un jour disponible.',
      continue: 'Continuer',
    },
    objectif: {
      title: 'Une course en vue ? (optionnel)',
      body: 'Avec une course datée, Runly te construit un plan jusqu’au jour J. Sans objectif, tu composeras ta semaine type — et tu pourras en ajouter un à tout moment depuis l’onglet Plan.',
      distanceLabel: 'Distance',
      distances: {
        '5k': '5 km',
        '10k': '10 km',
        semi: 'Semi',
        marathon: 'Marathon',
      },
      dateLabel: 'Date de course',
      datePlaceholder: 'JJ/MM/AAAA',
      eventName: 'Nom de l’épreuve (optionnel)',
      eventNamePlaceholder: 'Ex. Semi de Nantes',
      ambitionLabel: 'Ton ambition',
      ambitionFinish: 'Finir',
      ambitionChrono: 'Chrono',
      targetTime: 'Temps cible',
      targetTimePlaceholder: 'Ex. 1:45',
      targetTimeHint: 'Au format h:mm ou en minutes (ex. 45).',
      generate: 'Générer mon plan',
      skipGoal: 'Continuer sans objectif',
      invalid: 'Vérifie la distance, la date et le temps cible.',
      refusedDate: 'Cette date est déjà passée — choisis une date à venir.',
      refusedSessions:
        'Il faut au moins 2 séances par semaine pour construire un plan — ajuste ton contexte à l’étape précédente.',
      unrealisticTitle: 'Ambitieux pour la date choisie',
      unrealisticBody:
        'Vu ton volume actuel et le temps restant, ce plan ferait grimper ta charge trop vite pour être tenable. Voici ce qu’on te propose — c’est toi qui décides :',
      altFinish: 'Viser « finir » plutôt qu’un chrono',
      altLater: 'Décaler la course au {{date}}',
      altOther: 'Viser un {{distance}} d’abord',
    },
    compte: {
      title: 'Crée ton compte',
      body: 'Ton compte garde ton plan et ta progression synchronisés : tu retrouves tout sur un nouveau téléphone ou après une réinstallation.',
      localNote:
        'Jusqu’ici, tout est resté sur ton téléphone. À la création du compte, tes données y sont rattachées — rien ne se perd.',
      email: 'E-mail',
      emailPlaceholder: 'toi@exemple.fr',
      password: 'Mot de passe',
      passwordHint: '8 caractères minimum.',
      birthDate: 'Date de naissance',
      birthDatePlaceholder: 'JJ/MM/AAAA',
      birthDateHint: 'Il nous la faut ici pour confirmer l’âge minimum (16 ans).',
      signUp: 'Créer mon compte',
      orProviders: 'ou en un tap :',
      apple: 'Continuer avec Apple',
      google: 'Continuer avec Google',
      errors: {
        under_min_age: 'Runly est réservé aux 16 ans et plus — on ne peut pas créer ton compte.',
        birth_date_required: 'Renseigne ta date de naissance pour confirmer l’âge minimum.',
        invalid_email: 'Vérifie l’adresse e-mail.',
        weak_password: 'Choisis un mot de passe d’au moins 8 caractères.',
        email_already_used: 'Un compte existe déjà avec cet e-mail.',
        provider_failed: 'La connexion n’a pas abouti — réessaie.',
      },
    },
    restitution: {
      planTitle: 'Voici ton plan de {{weeks}} semaines',
      planBody:
        'Construit depuis ton objectif, ton volume et tes jours disponibles — ajustable à tout moment depuis l’onglet Plan.',
      phases: {
        generale: 'Phase générale',
        specifique: 'Phase spécifique',
        affutage: 'Affûtage',
      },
      phaseWeeks: '{{count}} sem',
      statWeeks: 'Semaines',
      statSessions: 'Séances/sem',
      statPeak: 'Volume pic',
      weekTypeTitle: 'Compose ta semaine type',
      weekTypeBody:
        'Pas de dossard en vue ? Parfait. Tu construiras ta semaine depuis la bibliothèque de séances, et la jauge veillera sur ta charge. Un objectif reste ajoutable à tout moment depuis l’onglet Plan.',
      pedagogyLabel: 'Ta jauge de charge · {{step}}/3',
      pedagogy1Title: 'Ton effort, mesuré simplement',
      pedagogy1Body:
        'Après chaque séance, tu notes ton effort de 0 à 10. Effort × durée = ta charge. La jauge compare ta semaine (7 jours) à ton habitude (28 jours).',
      pedagogy2Title: 'La zone favorable',
      pedagogy2Body:
        'Entre 0,8 et 1,3, ta charge évolue à un rythme que ton corps connaît : c’est la zone verte — celle où tu progresses durablement.',
      pedagogy3Title: 'C’est toi qui décides',
      pedagogy3Body:
        'Si ta charge grimpe vite, la jauge te le montre et te propose une séance plus légère. Un tap pour accepter, un tap pour garder ton plan.',
      pedagogyNext: 'Suivant',
      watchTitle: 'Active le partage depuis ta montre',
      watchBody:
        'C’est le réglage le plus souvent oublié : deux minutes dans l’app de ta montre, et tes séances remonteront toutes seules.',
      brands: {
        garmin: 'Garmin',
        garminBody:
          'Garmin Connect → Paramètres → Applications tierces : autorise Apple Santé (iPhone) ou Health Connect (Android). Durée, distance et FC remontent automatiquement.',
        coros: 'Coros',
        corosBody:
          'App COROS → Profil → Applications tierces : active Apple Santé ou Health Connect.',
        polar: 'Polar',
        polarBody:
          'Polar Flow → Paramètres → Partage de données : active Apple Santé ou Health Connect — le partage le plus complet du marché.',
        suunto: 'Suunto',
        suuntoBody:
          'App Suunto → Services partenaires : active Apple Santé sur iPhone. Sur Android, Suunto ne parle pas encore à Health Connect — note tes séances en trois champs en attendant.',
        applewatch: 'Apple Watch',
        applewatchBody: 'Rien à faire : tes séances sont déjà dans Apple Santé.',
      },
      disclaimer: 'Aide à la décision d’entraînement — ne constitue pas un avis médical.',
      cta: 'C’est parti !',
    },
  },
  /**
   * Notifications locales & récap hebdo (Lot 9, E9 ; spec §6.2 ; D15 : pas de
   * streaks ni de relances culpabilisantes). Chaque string passe le filtre
   * proscrit/recommandé de `note-reglementaire-dm.md` — vérifié par test.
   */
  notifications: {
    settings: {
      title: 'Notifications',
      intro: 'Choisis ce que Runly t’envoie. Tout se règle ici, notification par notification.',
      noPressure:
        'Pas de série à entretenir ni de relance insistante : Runly t’informe, c’est toi qui décides.',
      types: {
        ta_semaine: {
          label: 'Ta semaine',
          description: 'Le lundi matin : tes séances planifiées et ta charge prévisionnelle.',
        },
        rappel_seance: {
          label: 'Séance du jour',
          description: 'Le matin d’un jour de séance : un rappel de ce qui t’attend.',
        },
        demande_rpe: {
          label: 'Ressenti de séance',
          description:
            '30 minutes après une séance détectée : note ton effort pour tenir ta jauge à jour.',
        },
        recap_hebdo: {
          label: 'Récap hebdo',
          description: 'Le dimanche soir : réalisé vs prévu et évolution de ta charge.',
        },
      },
    },
    taSemaine: {
      title: 'Ta semaine',
      body: '{{count}} séance(s) planifiée(s) cette semaine.',
      forecast: {
        favorable: 'Charge prévisionnelle dans ta zone favorable — continue comme ça.',
        pic: 'Charge prévisionnelle au-dessus de ton habitude — tu peux alléger une séance si besoin.',
        sous_charge:
          'Charge prévisionnelle en dessous de ton habitude — de la marge pour progresser.',
        calibration: 'Ta jauge se calibre encore : note ton effort après chaque séance.',
      },
    },
    rappelSeance: {
      title: 'Séance du jour',
      body: 'Aujourd’hui : {{session}}. Ton brief t’attend dans l’app.',
      bodyGeneric: 'Une séance est prévue aujourd’hui — ton brief t’attend dans l’app.',
      sessionTypes: {
        ef: 'endurance fondamentale',
        sortie_longue: 'sortie longue',
        vma_court: 'VMA',
        seuil: 'seuil',
        tempo: 'tempo',
        fartlek: 'fartlek',
        recuperation: 'récupération',
      },
    },
    demandeRpe: {
      title: 'Comment était ta séance ?',
      body: 'Note ton effort de 0 à 10 : cinq secondes, et ta jauge est à jour.',
    },
    recapHebdo: {
      title: 'Ton récap de la semaine',
      donePlanned: '{{done}} séance(s) réalisée(s) sur {{planned}} prévue(s).',
      doneOnly: '{{done}} séance(s) cette semaine.',
      noneWithPlan: 'Semaine sans séance — ça arrive. Ton plan reprend avec toi, à ton rythme.',
      volume: '{{distance}} · {{duration}}.',
      acwrEvolution: 'Charge : {{from}} → {{to}}.',
      adaptation: {
        semaine_legere:
          'Ta charge a augmenté vite — une semaine plus légère t’aidera à bien assimiler.',
        continuite: 'Charge bien équilibrée — continue comme ça.',
        relance_douce: 'Une séance douce de plus la semaine prochaine, et tu retrouves ton rythme.',
        calibration:
          'Ta jauge apprend encore ton habitude — encore quelques séances notées et elle t’accompagne.',
      },
    },
  },
  common: {
    comingSoon: 'Bientôt disponible',
  },
} as const;

export type FrResources = typeof fr;
