import type { Workout } from '@/schemas';
import { workoutSchema } from '@/schemas';

import type { SessionRunnerState } from './session-runner';
import { flattenBlocks } from './session-runner';

/**
 * Agrégats de fin de séance (E5-5) — fonctions pures : récap affiché
 * (distance, durée, allures) et construction du `Workout` (source `player`)
 * écrit au journal, vers la santé et compté dans la charge. Minimisation
 * (règle transverse n°7) : agrégats uniquement, jamais de trace GPS.
 */

export type SessionRecap = {
  durationS: number;
  distanceM: number;
  /** Allure moyenne toute séance (s/km), si distance > 0. */
  avgPaceSecPerKm?: number;
  /** Allure moyenne sur les blocs cibles (rôle `travail`), si mesurable. */
  workPaceSecPerKm?: number;
  /** Nombre de blocs sautés (affiché sobrement dans le récap). */
  skippedSteps: number;
};

function paceOf(distanceM: number, elapsedMs: number): number | undefined {
  if (distanceM <= 0 || elapsedMs <= 0) {
    return undefined;
  }
  return elapsedMs / 1000 / (distanceM / 1000);
}

/** Récap d'une séance terminée ou abandonnée. */
export function buildSessionRecap(state: SessionRunnerState): SessionRecap {
  const steps = flattenBlocks(state.blocks);
  let workDistanceM = 0;
  let workElapsedMs = 0;
  let skippedSteps = 0;
  for (const result of state.completedSteps) {
    if (result.skipped) {
      skippedSteps += 1;
    }
    const flat = steps[result.index];
    if (flat !== undefined && flat.step.role === 'travail' && !result.skipped) {
      workDistanceM += result.distanceM;
      workElapsedMs += result.elapsedMs;
    }
  }
  return {
    durationS: Math.round(state.totalElapsedMs / 1000),
    distanceM: Math.round(state.totalDistanceM),
    avgPaceSecPerKm: paceOf(state.totalDistanceM, state.totalElapsedMs),
    workPaceSecPerKm: paceOf(workDistanceM, workElapsedMs),
    skippedSteps,
  };
}

/** Durée minimale pour qu'une séance (même abandonnée) vaille un workout. */
export const MIN_WORKOUT_DURATION_S = 60;

/**
 * Construit le `Workout` de la séance jouée (agrégats seulement). Retourne
 * `undefined` si la séance est trop courte (< 1 min) ou n'a pas commencé —
 * rien à écrire au journal dans ce cas.
 */
export function workoutFromRunner(state: SessionRunnerState): Workout | undefined {
  if (state.startedAt === undefined) {
    return undefined;
  }
  const durationS = Math.round(state.totalElapsedMs / 1000);
  if (durationS < MIN_WORKOUT_DURATION_S) {
    return undefined;
  }
  const distanceM = Math.round(state.totalDistanceM);
  // `matchedPlannedSessionId` est contraint uuid par le schéma Workout :
  // on ne le propage que s'il est bien un uuid (ids de démo ignorés).
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const plannedId =
    state.plannedSessionId !== undefined && uuidRe.test(state.plannedSessionId)
      ? state.plannedSessionId
      : undefined;
  const parsed = workoutSchema.safeParse({
    source: 'player',
    externalId: state.sessionId,
    startedAt: state.startedAt,
    durationS,
    distanceM: distanceM > 0 ? distanceM : undefined,
    matchedPlannedSessionId: plannedId,
  });
  return parsed.success ? parsed.data : undefined;
}
