import { create } from 'zustand';

import type { SessionFeedback, Workout } from '@/schemas';
import { sessionFeedbackSchema, workoutSchema } from '@/schemas';

/**
 * Journal des séances réalisées (E6-6 : saisie manuelle — mode sans montre).
 * Persistance locale (expo-sqlite) et sync Supabase : Lots 6–7 —
 * état en mémoire pour l'instant, validé aux frontières par zod.
 */

export type JournalEntry = {
  workout: Workout;
  feedback?: SessionFeedback;
};

export type ManualWorkoutDraft = {
  startedAt: string;
  durationMin: number;
  distanceKm?: number;
  rpe?: number;
};

type JournalState = {
  entries: JournalEntry[];
  /** Ajoute une séance saisie à la main ; retourne false si invalide. */
  addManualWorkout: (draft: ManualWorkoutDraft) => boolean;
};

export const useJournalStore = create<JournalState>()((set) => ({
  entries: [],

  addManualWorkout: (draft) => {
    const workoutResult = workoutSchema.safeParse({
      source: 'manuel',
      startedAt: draft.startedAt,
      durationS: Math.round(draft.durationMin * 60),
      distanceM: draft.distanceKm !== undefined ? Math.round(draft.distanceKm * 1000) : undefined,
    });
    if (!workoutResult.success) {
      return false;
    }
    let feedback: SessionFeedback | undefined;
    if (draft.rpe !== undefined) {
      const feedbackResult = sessionFeedbackSchema.safeParse({
        rpe: draft.rpe,
        at: draft.startedAt,
      });
      if (!feedbackResult.success) {
        return false;
      }
      feedback = feedbackResult.data;
    }
    const entry: JournalEntry = { workout: workoutResult.data, feedback };
    set((state) => ({ entries: [...state.entries, entry] }));
    return true;
  },
}));
