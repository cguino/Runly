import { create } from 'zustand';

import type { PhysioField, PhysioProfile, Workout } from '@/schemas';
import {
  estimateFcmax,
  estimateThresholds,
  estimateVmaFromHistory,
  HR_ZONES_PCT,
  proposeVmaRecalc,
} from '@/training-engine';

/**
 * Store des références physiologiques (E2-4, E2-5).
 * La logique de calcul vit dans `src/training-engine` (fonctions pures) ;
 * ici : état de l'écran, révisions, proposition de recalcul.
 * Persistance locale/Supabase : Lots 4–5 — état en mémoire pour l'instant.
 */

type PhysioState = {
  profile: PhysioProfile;
  /** Proposition de recalcul VMA en attente (E2-5) — jamais appliquée seule. */
  recalcProposal?: { proposedVmaKmh: number };
  /** Complète les champs vides depuis l'historique ; propose (sans imposer) un recalcul sinon. */
  deriveFromHistory: (params: { workouts: Workout[]; ageYears?: number }) => void;
  /** Édition manuelle : la valeur devient `mesure` et la révision est tracée. */
  setManualValue: (field: PhysioField, value: number, at?: string) => void;
  acceptRecalc: (at?: string) => void;
  dismissRecalc: () => void;
};

const initialProfile: PhysioProfile = {
  ...(() => {
    const { sv1PctVma, sv2PctVma } = estimateThresholds();
    return { sv1PctVma, sv2PctVma };
  })(),
  zones: [...HR_ZONES_PCT],
  revisions: [],
};

export const usePhysioStore = create<PhysioState>()((set, get) => ({
  profile: initialProfile,
  recalcProposal: undefined,

  deriveFromHistory: ({ workouts, ageYears }) => {
    const { profile } = get();
    const next: PhysioProfile = { ...profile };

    if (next.vmaKmh === undefined) {
      next.vmaKmh = estimateVmaFromHistory(workouts);
    }
    if (next.fcmaxBpm === undefined) {
      next.fcmaxBpm = estimateFcmax({ workouts, ageYears });
    }

    const proposal =
      next.vmaKmh === undefined ? undefined : proposeVmaRecalc(next.vmaKmh.value, workouts);

    set({ profile: next, recalcProposal: proposal });
  },

  setManualValue: (field, value, at = new Date().toISOString()) => {
    const { profile } = get();
    set({
      profile: {
        ...profile,
        [field]: { value, confidence: 'mesure' },
        revisions: [
          ...profile.revisions,
          {
            field,
            previousValue: profile[field]?.value ?? null,
            newValue: value,
            source: 'manuel',
            at,
          },
        ],
      },
      // La saisie manuelle rend caduque la proposition en cours sur la VMA.
      recalcProposal: field === 'vmaKmh' ? undefined : get().recalcProposal,
    });
  },

  acceptRecalc: (at = new Date().toISOString()) => {
    const { profile, recalcProposal } = get();
    if (recalcProposal === undefined) {
      return;
    }
    set({
      profile: {
        ...profile,
        vmaKmh: { value: recalcProposal.proposedVmaKmh, confidence: 'estime' },
        revisions: [
          ...profile.revisions,
          {
            field: 'vmaKmh',
            previousValue: profile.vmaKmh?.value ?? null,
            newValue: recalcProposal.proposedVmaKmh,
            source: 'recalcul',
            at,
          },
        ],
      },
      recalcProposal: undefined,
    });
  },

  dismissRecalc: () => set({ recalcProposal: undefined }),
}));
