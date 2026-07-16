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
    },
  },
  common: {
    comingSoon: 'Bientôt disponible',
  },
} as const;

export type FrResources = typeof fr;
