import { create } from 'zustand';

import { addDays, yearsBetween } from '@/lib/dates';
import type { Goal, TrainingPlan } from '@/schemas';
import { goalSchema, userProfileSchema } from '@/schemas';
import type { HealthAdapter } from '@/services';
import { MIN_ACCOUNT_AGE_YEARS } from '@/services';
import type { PlanAlternative, PlanGenerationResult } from '@/training-engine';
import {
  averageWeeklyVolumeKm,
  generatePlan,
  isCalibrating,
  weeksOfHistory,
} from '@/training-engine';

import { useJournalStore } from '../journal/journal-store';

/**
 * Store de l'onboarding (E1, D2) : tout vit en LOCAL jusqu'à la création de
 * compte en fin de parcours — `attachToAccount` rattache alors les données
 * sans perte. Chaque étape est skippable avec valeur par défaut (E1-7) et
 * `currentStep` permet la reprise là où on s'est arrêté.
 * Persistance disque (expo-sqlite) et sync Supabase : Lots 5–7 / G5 —
 * état en mémoire pour l'instant, comme les autres stores.
 */

export const ONBOARDING_STEPS = [
  'sante',
  'profil',
  'contexte',
  'objectif',
  'compte',
  'restitution',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type HealthPermission = 'pending' | 'granted' | 'denied' | 'skipped';

export type OnboardingHealth = {
  permission: HealthPermission;
  /** Nombre de séances importées (historique 26 semaines, E1-2). */
  importedCount: number;
  /** Profondeur d'historique (semaines entières). */
  historyWeeks: number;
  /** Historique < 4 semaines → jauge « en calibration » (spec §6.1). */
  calibrating: boolean;
  /** Volume hebdo estimé depuis l'import — pré-remplit l'étape contexte. */
  suggestedWeeklyVolumeKm?: number;
};

export type OnboardingProfile = {
  firstName?: string;
  /** Date de naissance ISO `YYYY-MM-DD` (contrôle 16+, D12). */
  birthDate?: string;
  /** Antécédent < 12 mois (déclaratif) → flag prudence du moteur. */
  hasRecentInjury: boolean;
  injuryNote?: string;
};

export type OnboardingContext = {
  /** Séances/semaine souhaitées, 2–6 (le moteur refuse < 2). */
  sessionsPerWeek: number;
  /** Jours disponibles : 0 = lundi … 6 = dimanche. */
  preferredDays: number[];
  /** Volume hebdo actuel (km) — pré-rempli depuis l'import sinon saisi. */
  weeklyVolumeKm?: number;
};

export type ProfileSubmission = {
  firstName?: string;
  birthDate?: string;
  hasRecentInjury: boolean;
  injuryNote?: string;
  /** Date du jour ISO `YYYY-MM-DD` — le store ne lit jamais l'horloge. */
  today: string;
};

export type ProfileResult = 'ok' | 'under_min_age' | 'invalid';

export type GoalSubmission = {
  goal: unknown;
  today: string;
  /** VMA connue (physio store) — alimente le garde-fou du moteur. */
  vmaKmh?: number;
};

export type GoalSubmissionResult =
  | { status: 'invalid' }
  | { status: 'plan' }
  | { status: 'unrealistic'; alternatives: PlanAlternative[] }
  | { status: 'refused'; reason: 'too_few_sessions' | 'race_date_not_ahead' };

/** Défauts d'étape (E1-7) : 3 séances/sem, mardi/jeudi/samedi. */
export const DEFAULT_CONTEXT: OnboardingContext = {
  sessionsPerWeek: 3,
  preferredDays: [1, 3, 5],
};

const IMPORT_WEEKS = 26;

type OnboardingState = {
  currentStep: OnboardingStep;
  completed: boolean;
  health: OnboardingHealth;
  profile: OnboardingProfile;
  /** Date de naissance < 16 ans saisie → étape profil bloquée (D12). */
  ageBlocked: boolean;
  context: OnboardingContext;
  /** Objectif validé — absent si skippé (D5 : mode semaine type). */
  goal?: Goal;
  goalSkipped: boolean;
  /** Dernier résultat du moteur (alternatives incluses) — jamais recalculé en local. */
  planResult?: PlanGenerationResult;
  plan?: TrainingPlan;
  /** Renseigné par `attachToAccount` — les données restent intactes (D2). */
  accountUserId?: string;

  goToStep: (step: OnboardingStep) => void;
  /** OB1 — connexion santé : permissions via l'adaptateur, import 26 semaines. */
  connectHealth: (params: { adapter: HealthAdapter; today: string }) => Promise<HealthPermission>;
  /** OB1 — « Plus tard » : mode 100 % déclaratif. */
  skipHealth: () => void;
  /** OB2 — profil ; bloque (sans contournement) si < 16 ans (D12). */
  submitProfile: (submission: ProfileSubmission) => ProfileResult;
  skipProfile: () => void;
  /** OB3 — contexte d'entraînement (séances/sem 2–6, jours, volume). */
  submitContext: (context: OnboardingContext) => 'ok' | 'invalid';
  skipContext: () => void;
  /** OB4 — objectif : validation zod puis garde-fou du moteur (jamais bloquant). */
  submitGoal: (submission: GoalSubmission) => GoalSubmissionResult;
  /** OB4 — applique une alternative proposée par le moteur puis regénère. */
  applyAlternative: (
    alternative: PlanAlternative,
    params: { today: string; vmaKmh?: number },
  ) => GoalSubmissionResult;
  skipGoal: () => void;
  /**
   * OB5 — rattachement des données locales au compte (D2/D14) : les données
   * saisies avant compte (profil, objectif, plan, séances importées)
   * survivent intégralement — seul `accountUserId` change.
   */
  attachToAccount: (userId: string) => void;
  /** OB6 — CTA final de la restitution. */
  complete: () => void;
  reset: () => void;
};

const initialState = {
  currentStep: 'sante' as OnboardingStep,
  completed: false,
  health: {
    permission: 'pending' as HealthPermission,
    importedCount: 0,
    historyWeeks: 0,
    calibrating: true,
    suggestedWeeklyVolumeKm: undefined,
  },
  profile: { hasRecentInjury: false } as OnboardingProfile,
  ageBlocked: false,
  context: DEFAULT_CONTEXT,
  goal: undefined,
  goalSkipped: false,
  planResult: undefined,
  plan: undefined,
  accountUserId: undefined,
};

function runEngine(
  state: Pick<OnboardingState, 'context' | 'profile'>,
  goal: Goal,
  today: string,
  vmaKmh: number | undefined,
): PlanGenerationResult {
  // Garde-fou = moteur de plan (fonctions pures) — aucun re-calcul local.
  return generatePlan({
    today,
    goal,
    context: {
      sessionsPerWeek: state.context.sessionsPerWeek,
      preferredDays: state.context.preferredDays,
      currentWeeklyVolumeKm: state.context.weeklyVolumeKm,
      injuryWithin12Months: state.profile.hasRecentInjury,
    },
    physio: { vmaKmh },
  });
}

function toSubmissionResult(result: PlanGenerationResult): GoalSubmissionResult {
  switch (result.outcome) {
    case 'plan':
      return { status: 'plan' };
    case 'unrealistic':
      return { status: 'unrealistic', alternatives: result.alternatives };
    case 'refused':
      return { status: 'refused', reason: result.reason };
  }
}

export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  ...initialState,

  goToStep: (step) => set({ currentStep: step }),

  connectHealth: async ({ adapter, today }) => {
    const granted = await adapter.requestPermissions();
    if (!granted) {
      set({ health: { ...get().health, permission: 'denied' }, currentStep: 'profil' });
      return 'denied';
    }
    const since = `${addDays(today, -IMPORT_WEEKS * 7)}T00:00:00Z`;
    const workouts = await adapter.fetchRunningWorkouts(since);
    // Frontière zod : la re-validation vit dans le journal store.
    const importedCount = useJournalStore.getState().importWorkouts(workouts);
    const imported = useJournalStore.getState().entries.map((entry) => entry.workout);
    const suggested = averageWeeklyVolumeKm(imported, today);
    set({
      health: {
        permission: 'granted',
        importedCount,
        historyWeeks: weeksOfHistory(imported, today),
        calibrating: isCalibrating(imported, today),
        suggestedWeeklyVolumeKm: suggested,
      },
      context: { ...get().context, weeklyVolumeKm: suggested ?? get().context.weeklyVolumeKm },
      currentStep: 'profil',
    });
    return 'granted';
  },

  skipHealth: () =>
    set({ health: { ...get().health, permission: 'skipped' }, currentStep: 'profil' }),

  submitProfile: ({ firstName, birthDate, hasRecentInjury, injuryNote, today }) => {
    const injuryMonth = today.slice(0, 7);
    const parsed = userProfileSchema.safeParse({
      firstName: firstName?.trim() === '' ? undefined : firstName?.trim(),
      birthDate,
      injuryHistory: hasRecentInjury ? [{ occurredIn: injuryMonth, note: injuryNote }] : [],
    });
    if (!parsed.success) {
      return 'invalid';
    }
    if (birthDate !== undefined && yearsBetween(birthDate, today) < MIN_ACCOUNT_AGE_YEARS) {
      // D12 : blocage doux, sans contournement — on reste sur l'étape.
      set({ ageBlocked: true });
      return 'under_min_age';
    }
    if (birthDate === undefined && get().ageBlocked) {
      // Effacer la date après un blocage n'est pas un contournement :
      // seule une date ≥ 16 ans (ex. correction d'une faute de frappe) débloque.
      return 'under_min_age';
    }
    set({
      ageBlocked: false,
      profile: {
        firstName: parsed.data.firstName,
        birthDate: parsed.data.birthDate,
        hasRecentInjury,
        injuryNote: injuryNote?.trim() === '' ? undefined : injuryNote?.trim(),
      },
      currentStep: 'contexte',
    });
    return 'ok';
  },

  skipProfile: () => {
    if (get().ageBlocked) {
      // Une date < 16 ans a été saisie : le skip n'est pas un contournement.
      return;
    }
    set({ profile: { hasRecentInjury: false }, currentStep: 'contexte' });
  },

  submitContext: (context) => {
    const parsed = userProfileSchema.safeParse({
      sessionsPerWeek: context.sessionsPerWeek,
      preferredDays: context.preferredDays,
    });
    if (
      !parsed.success ||
      context.sessionsPerWeek > 6 ||
      context.preferredDays.length === 0 ||
      (context.weeklyVolumeKm !== undefined && context.weeklyVolumeKm < 0)
    ) {
      return 'invalid';
    }
    set({
      context: {
        sessionsPerWeek: context.sessionsPerWeek,
        preferredDays: [...new Set(context.preferredDays)].sort((a, b) => a - b),
        weeklyVolumeKm: context.weeklyVolumeKm,
      },
      currentStep: 'objectif',
    });
    return 'ok';
  },

  skipContext: () =>
    set({
      context: {
        ...DEFAULT_CONTEXT,
        weeklyVolumeKm: get().health.suggestedWeeklyVolumeKm,
      },
      currentStep: 'objectif',
    }),

  submitGoal: ({ goal, today, vmaKmh }) => {
    const parsed = goalSchema.safeParse(goal);
    if (!parsed.success) {
      return { status: 'invalid' };
    }
    const result = runEngine(get(), parsed.data, today, vmaKmh);
    const submission = toSubmissionResult(result);
    set({
      goal: parsed.data,
      goalSkipped: false,
      planResult: result,
      plan: result.outcome === 'plan' ? result.plan : undefined,
      currentStep: result.outcome === 'plan' ? 'compte' : get().currentStep,
    });
    return submission;
  },

  applyAlternative: (alternative, { today, vmaKmh }) => {
    const current = get().goal;
    if (current === undefined) {
      return { status: 'invalid' };
    }
    let nextGoal: Goal;
    switch (alternative.type) {
      case 'finish_ambition':
        nextGoal = { ...current, ambition: 'finir', targetTimeS: undefined };
        break;
      case 'later_date':
        nextGoal = { ...current, raceDate: alternative.suggestedRaceDate };
        break;
      case 'other_goal':
        nextGoal = { ...current, raceDistance: alternative.raceDistance };
        break;
    }
    return get().submitGoal({ goal: nextGoal, today, vmaKmh });
  },

  skipGoal: () =>
    set({
      goal: undefined,
      goalSkipped: true,
      planResult: undefined,
      plan: undefined,
      currentStep: 'compte',
    }),

  attachToAccount: (userId) => set({ accountUserId: userId, currentStep: 'restitution' }),

  complete: () => set({ completed: true }),

  reset: () => set({ ...initialState }),
}));
