import type { Workout, WorkoutSource } from '@/schemas';

/**
 * Déduplication multi-sources (E6-1, spec §7.7) : la même sortie remonte
 * souvent par plusieurs canaux (montre → Strava ET → santé). Deux workouts
 * sont considérés doublons si départ, durée et distance concordent à la
 * tolérance près ; on garde alors la source la plus riche :
 * Strava > santé > player > manuel.
 */

export const SOURCE_PRIORITY: Record<WorkoutSource, number> = {
  strava: 4,
  healthkit: 3,
  healthconnect: 3,
  player: 2,
  manuel: 1,
};

/** Tolérances de rapprochement. */
export const DEDUP_TOLERANCE = {
  startMinutes: 15,
  durationPct: 0.1,
  durationFloorS: 90,
  distancePct: 0.1,
  distanceFloorM: 200,
} as const;

function withinTolerance(a: number, b: number, pct: number, floor: number): boolean {
  return Math.abs(a - b) <= Math.max(Math.max(a, b) * pct, floor);
}

export function areDuplicates(a: Workout, b: Workout): boolean {
  const startDeltaMin =
    Math.abs(new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()) / 60_000;
  if (startDeltaMin > DEDUP_TOLERANCE.startMinutes) {
    return false;
  }
  if (
    !withinTolerance(
      a.durationS,
      b.durationS,
      DEDUP_TOLERANCE.durationPct,
      DEDUP_TOLERANCE.durationFloorS,
    )
  ) {
    return false;
  }
  if (a.distanceM !== undefined && b.distanceM !== undefined) {
    return withinTolerance(
      a.distanceM,
      b.distanceM,
      DEDUP_TOLERANCE.distancePct,
      DEDUP_TOLERANCE.distanceFloorM,
    );
  }
  // Sans distance des deux côtés : départ + durée suffisent.
  return true;
}

export type DedupResult = {
  kept: Workout[];
  /** Doublons écartés, avec le gardé correspondant (traçabilité). */
  discarded: { workout: Workout; keptInstead: Workout }[];
};

/**
 * Déduplique une liste (ordre d'arrivée quelconque) : groupes de doublons
 * transitifs, le mieux classé de chaque groupe gagne ; à priorité égale,
 * le plus riche en champs (FC max, cadence) puis le plus ancien importé
 * (ordre stable) l'emporte.
 */
export function dedupeWorkouts(workouts: Workout[]): DedupResult {
  const kept: Workout[] = [];
  const discarded: DedupResult['discarded'] = [];

  const richness = (w: Workout) =>
    [w.distanceM, w.avgHrBpm, w.maxHrBpm, w.avgCadenceSpm].filter((v) => v !== undefined).length;

  for (const workout of workouts) {
    const existingIndex = kept.findIndex((k) => areDuplicates(k, workout));
    if (existingIndex === -1) {
      kept.push(workout);
      continue;
    }
    const existing = kept[existingIndex]!;
    const better =
      SOURCE_PRIORITY[workout.source] > SOURCE_PRIORITY[existing.source] ||
      (SOURCE_PRIORITY[workout.source] === SOURCE_PRIORITY[existing.source] &&
        richness(workout) > richness(existing));
    if (better) {
      kept[existingIndex] = workout;
      discarded.push({ workout: existing, keptInstead: workout });
    } else {
      discarded.push({ workout, keptInstead: existing });
    }
  }
  return { kept, discarded };
}
