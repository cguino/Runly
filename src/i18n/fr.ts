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
  common: {
    comingSoon: 'Bientôt disponible',
  },
} as const;

export type FrResources = typeof fr;
