import type { PlanInput } from '../plan-types';

/**
 * Les 6 personas des golden files (vérification Lot 3, support de la
 * validation coach G3). Date du jour figée : les plans sont déterministes.
 * Premier lundi de plan : 2026-07-20.
 */
export const PLAN_TODAY = '2026-07-17';

export const personas: Record<string, PlanInput> = {
  /** Marc : semi chrono 1h45 à 14 semaines, 3 j/sem (cas canonique spec §7.2). */
  'marc-semi-14sem-3j': {
    today: PLAN_TODAY,
    goal: {
      raceDistance: 'semi',
      raceDate: '2026-10-25',
      ambition: 'chrono',
      targetTimeS: 105 * 60,
      status: 'active',
    },
    context: {
      sessionsPerWeek: 3,
      preferredDays: [1, 3, 6],
      currentWeeklyVolumeKm: 30,
      injuryWithin12Months: false,
    },
    physio: { vmaKmh: 16.5 },
  },

  /** Marathon prudent : antécédent < 12 mois → progression 5–8 %. */
  'marathon-prudent-post-blessure': {
    today: PLAN_TODAY,
    goal: {
      raceDistance: 'marathon',
      raceDate: '2026-11-22',
      ambition: 'finir',
      status: 'active',
    },
    context: {
      sessionsPerWeek: 4,
      preferredDays: [1, 3, 5, 6],
      currentWeeklyVolumeKm: 35,
      injuryWithin12Months: true,
    },
    physio: { vmaKmh: 15 },
  },

  /** 5K débutant-intermédiaire, 2 j/sem, chrono → plan + recommandation ≥ 3 séances. */
  '5k-debutant-2j': {
    today: PLAN_TODAY,
    goal: {
      raceDistance: '5k',
      raceDate: '2026-09-27',
      ambition: 'chrono',
      targetTimeS: 26 * 60,
      status: 'active',
    },
    context: {
      sessionsPerWeek: 2,
      preferredDays: [2, 6],
      currentWeeklyVolumeKm: 18,
      injuryWithin12Months: false,
    },
    physio: { vmaKmh: 14 },
  },

  /** 10K chrono, 5 j/sem → 2 qualités en phase spécifique. */
  '10k-chrono-5j': {
    today: PLAN_TODAY,
    goal: {
      raceDistance: '10k',
      raceDate: '2026-09-27',
      ambition: 'chrono',
      targetTimeS: 42 * 60 + 30,
      status: 'active',
    },
    context: {
      sessionsPerWeek: 5,
      preferredDays: [0, 1, 3, 4, 6],
      currentWeeklyVolumeKm: 40,
      injuryWithin12Months: false,
    },
    physio: { vmaKmh: 17.5 },
  },

  /** Objectif irréaliste : semi 1h20 avec VMA 14 dans 6 semaines, volume 20. */
  'objectif-irrealiste': {
    today: PLAN_TODAY,
    goal: {
      raceDistance: 'semi',
      raceDate: '2026-08-30',
      ambition: 'chrono',
      targetTimeS: 80 * 60,
      status: 'active',
    },
    context: {
      sessionsPerWeek: 3,
      preferredDays: [1, 3, 6],
      currentWeeklyVolumeKm: 20,
      injuryWithin12Months: false,
    },
    physio: { vmaKmh: 14 },
  },

  /** Sans historique : ni VMA ni volume connus → défauts + cibles zones FC/RPE. */
  'sans-historique': {
    today: PLAN_TODAY,
    goal: {
      raceDistance: '10k',
      raceDate: '2026-09-13',
      ambition: 'finir',
      status: 'active',
    },
    context: {
      sessionsPerWeek: 3,
      preferredDays: [1, 3, 6],
      injuryWithin12Months: false,
    },
    physio: {},
  },
};
