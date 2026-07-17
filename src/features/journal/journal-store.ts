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
  /**
   * Saisie RPE post-séance (E7-5) : note la séance la plus récente sans
   * feedback ; retourne false si RPE invalide ou rien à noter.
   * TODO(Lot 9) : notification « note ton effort » 30 min après la
   * détection d'un workout importé — l'infra notifications arrive au Lot 9.
   */
  addFeedbackToLatestWorkout: (rpe: number, at?: string) => boolean;
};

/** Séance la plus récente sans feedback RPE (invite sur l'Accueil, E7-5). */
export function latestEntryWithoutFeedback(entries: JournalEntry[]): JournalEntry | undefined {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (entry !== undefined && entry.feedback === undefined) {
      return entry;
    }
  }
  return undefined;
}

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

  addFeedbackToLatestWorkout: (rpe, at = new Date().toISOString()) => {
    let saved = false;
    set((state) => {
      const target = latestEntryWithoutFeedback(state.entries);
      if (target === undefined) {
        return state;
      }
      const feedbackResult = sessionFeedbackSchema.safeParse({
        workoutId: target.workout.id,
        rpe,
        at,
      });
      if (!feedbackResult.success) {
        return state;
      }
      saved = true;
      return {
        entries: state.entries.map((entry) =>
          entry === target ? { ...entry, feedback: feedbackResult.data } : entry,
        ),
      };
    });
    return saved;
  },
}));
