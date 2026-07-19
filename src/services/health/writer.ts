import type { Workout } from '@/schemas';

/**
 * Écriture d'une séance player vers la santé (E5-5, spec §7.7) — pendant
 * de lecture de `HealthAdapter`. Implémentations natives (HealthKit /
 * Health Connect) branchées lors des tests device (G2) ; d'ici là le
 * no-op assume l'écart (règle transverse n°10) : la séance vit déjà dans
 * le journal local et la charge, seule l'écriture santé est différée.
 */
export type HealthWorkoutWriter = {
  /** Retourne false si l'écriture n'est pas disponible (permission, plateforme). */
  saveRunningWorkout: (workout: Workout) => Promise<boolean>;
};

export function createNoopHealthWorkoutWriter(): HealthWorkoutWriter {
  return {
    saveRunningWorkout: () => Promise.resolve(false),
  };
}

/** Factory par défaut de l'app (no-op tant que le natif n'est pas branché). */
export function createDefaultHealthWorkoutWriter(): HealthWorkoutWriter {
  return createNoopHealthWorkoutWriter();
}
