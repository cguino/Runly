import type { Workout } from '@/schemas';
import { workoutSchema } from '@/schemas';

import type { RawHealthConnectSession, RawHealthKitWorkout, RawStravaActivity } from './raw-types';

/**
 * Normalisation multi-sources → `Workout` zod unique (E6-1).
 * Règle transverse n°1 : aucune donnée externe n'entre dans le domaine sans
 * validation. Minimisation (règle n°7) : agrégats uniquement — les séries FC
 * et le GPS brut ne sont jamais extraits des payloads.
 */

export type NormalizationResult =
  { ok: true; workout: Workout } | { ok: false; reason: 'not_running' | 'invalid_payload' };

/** HKWorkoutActivityType.running */
const HEALTHKIT_RUNNING = 37;
/** ExerciseType RUNNING / RUNNING_TREADMILL */
const HEALTH_CONNECT_RUNNING = new Set([56, 57]);

function parse(candidate: unknown): NormalizationResult {
  const result = workoutSchema.safeParse(candidate);
  return result.success
    ? { ok: true, workout: result.data }
    : { ok: false, reason: 'invalid_payload' };
}

function durationSeconds(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000);
}

export function normalizeHealthKitWorkout(raw: RawHealthKitWorkout): NormalizationResult {
  if (raw.workoutActivityType !== HEALTHKIT_RUNNING) {
    return { ok: false, reason: 'not_running' };
  }
  return parse({
    source: 'healthkit',
    externalId: raw.uuid,
    startedAt: raw.startDate,
    durationS: raw.duration ?? durationSeconds(raw.startDate, raw.endDate),
    distanceM: raw.totalDistance?.quantity,
    avgHrBpm: raw.averageHeartRate !== undefined ? Math.round(raw.averageHeartRate) : undefined,
    maxHrBpm: raw.maxHeartRate !== undefined ? Math.round(raw.maxHeartRate) : undefined,
  });
}

export function normalizeHealthConnectSession(raw: RawHealthConnectSession): NormalizationResult {
  if (!HEALTH_CONNECT_RUNNING.has(raw.exerciseType)) {
    return { ok: false, reason: 'not_running' };
  }
  return parse({
    source: 'healthconnect',
    externalId: raw.metadata.id,
    startedAt: raw.startTime,
    durationS: durationSeconds(raw.startTime, raw.endTime),
    distanceM: raw.distance?.inMeters,
    avgHrBpm:
      raw.aggregatedHeartRate?.avg !== undefined
        ? Math.round(raw.aggregatedHeartRate.avg)
        : undefined,
    maxHrBpm:
      raw.aggregatedHeartRate?.max !== undefined
        ? Math.round(raw.aggregatedHeartRate.max)
        : undefined,
    avgCadenceSpm: raw.cadence?.avg !== undefined ? Math.round(raw.cadence.avg) : undefined,
  });
}

export function normalizeStravaActivity(raw: RawStravaActivity): NormalizationResult {
  if (raw.type !== 'Run' && raw.sport_type !== 'Run' && raw.sport_type !== 'TrailRun') {
    return { ok: false, reason: 'not_running' };
  }
  return parse({
    source: 'strava',
    externalId: String(raw.id),
    startedAt: raw.start_date,
    durationS: raw.moving_time ?? raw.elapsed_time,
    distanceM: raw.distance,
    avgHrBpm: raw.average_heartrate !== undefined ? Math.round(raw.average_heartrate) : undefined,
    maxHrBpm: raw.max_heartrate !== undefined ? Math.round(raw.max_heartrate) : undefined,
    // Strava compte la cadence par jambe → ×2 pour des pas/min.
    avgCadenceSpm:
      raw.average_cadence !== undefined ? Math.round(raw.average_cadence * 2) : undefined,
  });
}
