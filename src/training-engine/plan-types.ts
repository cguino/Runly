import type { Goal, RaceDistance, TrainingPlan } from '@/schemas';

/**
 * Types du moteur de plan (E3). Le moteur est une fonction pure :
 * (profil, objectif, contexte) → plan — « aujourd'hui » est un paramètre.
 * Les codes (raisons, alternatives, recommandations) sont traduits par
 * l'UI via i18n : aucun texte utilisateur ici (wording réglementaire).
 */

export type PlanContext = {
  /** Séances/semaine souhaitées (spec : 2–6). */
  sessionsPerWeek: number;
  /** Jours disponibles : 0 = lundi … 6 = dimanche. */
  preferredDays: number[];
  /** Volume hebdo actuel (historique ou déclaré), km. */
  currentWeeklyVolumeKm?: number;
  /** Antécédent < 12 mois → progression prudente 5–8 % (spec §7.2). */
  injuryWithin12Months: boolean;
};

export type PlanPhysio = {
  vmaKmh?: number;
};

export type PlanInput = {
  /** Date du jour, ISO YYYY-MM-DD — jamais lue de l'horloge. */
  today: string;
  goal: Goal;
  context: PlanContext;
  physio: PlanPhysio;
};

export type UnrealisticReason = 'too_few_weeks' | 'volume_gap' | 'pace_above_capacity';

export type PlanAlternative =
  | { type: 'finish_ambition' }
  | { type: 'later_date'; suggestedRaceDate: string }
  | { type: 'other_goal'; raceDistance: RaceDistance };

export type PlanRecommendation =
  | 'recommend_three_sessions_for_chrono'
  | 'sessions_capped_to_preferred_days'
  | 'quality_downgraded_to_ef';

export type PlanGenerationResult =
  | { outcome: 'refused'; reason: 'too_few_sessions' | 'race_date_not_ahead' }
  | { outcome: 'unrealistic'; reasons: UnrealisticReason[]; alternatives: PlanAlternative[] }
  | { outcome: 'plan'; plan: TrainingPlan; recommendations: PlanRecommendation[] };

export type MissedSessionOutcome =
  | { action: 'rescheduled'; newDate: string; cancelledSecondaryDate?: string }
  | { action: 'cancelled' };

export type { Goal };
