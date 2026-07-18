import type { SessionRunnerState } from '@/training-engine';
import { deserializeRunnerState, serializeRunnerState } from '@/training-engine';

import type { KeyValueStore } from '../storage';

/**
 * Persistance crash-safe de la séance en cours (E5-1, ADR-009) : l'état
 * complet de la machine à états est écrit sur expo-sqlite **à chaque
 * transition** (+ autosave périodique côté store) — une séance ne se perd
 * jamais. Au restore (kill du process), le snapshot est re-validé par zod
 * et la séance revient en pause, prête à reprendre.
 */

export const ACTIVE_SESSION_KEY = 'player.active-session';

export type SessionSnapshotStore = {
  save: (state: SessionRunnerState) => void;
  /** Snapshot valide ou undefined (absent / corrompu — jamais d'exception). */
  load: () => SessionRunnerState | undefined;
  clear: () => void;
};

export function createSessionSnapshotStore(kv: KeyValueStore): SessionSnapshotStore {
  return {
    save: (state) => {
      kv.set(ACTIVE_SESSION_KEY, serializeRunnerState(state));
    },
    load: () => {
      const raw = kv.get(ACTIVE_SESSION_KEY);
      return raw === undefined ? undefined : deserializeRunnerState(raw);
    },
    clear: () => {
      kv.remove(ACTIVE_SESSION_KEY);
    },
  };
}
