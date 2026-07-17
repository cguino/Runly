import { diffDays } from '@/lib/dates';
import type { Workout } from '@/schemas';

/**
 * Lecture de l'historique importé pour l'onboarding (E1-2, E1-4) —
 * fonctions pures : profondeur d'historique (état « jauge en calibration »
 * si < 4 semaines, spec §6.1) et volume hebdo courant pré-rempli à l'étape
 * contexte (spec §6.1 étape 3).
 */

/** Sous ce nombre de semaines d'historique, la jauge démarre « en calibration ». */
export const CALIBRATION_MIN_WEEKS = 4;

/** Fenêtre (semaines) du calcul de volume hebdo courant. */
export const VOLUME_WINDOW_WEEKS = 4;

/** Date `YYYY-MM-DD` d'un workout (datetime ISO avec offset → partie date). */
function workoutDate(workout: Workout): string {
  return workout.startedAt.slice(0, 10);
}

/**
 * Profondeur d'historique en semaines entières entre la séance la plus
 * ancienne et aujourd'hui. 0 si aucune séance.
 */
export function weeksOfHistory(workouts: Workout[], todayIso: string): number {
  if (workouts.length === 0) {
    return 0;
  }
  const oldest = workouts.map(workoutDate).reduce((a, b) => (a < b ? a : b));
  return Math.floor(Math.max(0, diffDays(oldest, todayIso)) / 7);
}

/** La jauge doit-elle démarrer « en calibration » ? (historique < 4 semaines). */
export function isCalibrating(workouts: Workout[], todayIso: string): boolean {
  return weeksOfHistory(workouts, todayIso) < CALIBRATION_MIN_WEEKS;
}

/**
 * Volume hebdo courant (km/sem) : moyenne des distances sur les
 * `VOLUME_WINDOW_WEEKS` dernières semaines. `undefined` si aucune distance
 * dans la fenêtre (l'utilisateur saisit alors son volume à la main).
 */
export function averageWeeklyVolumeKm(workouts: Workout[], todayIso: string): number | undefined {
  const windowDays = VOLUME_WINDOW_WEEKS * 7;
  let totalM = 0;
  let any = false;
  for (const workout of workouts) {
    const age = diffDays(workoutDate(workout), todayIso);
    if (age < 0 || age >= windowDays || workout.distanceM === undefined) {
      continue;
    }
    totalM += workout.distanceM;
    any = true;
  }
  if (!any) {
    return undefined;
  }
  return Math.round((totalM / 1000 / VOLUME_WINDOW_WEEKS) * 2) / 2;
}
