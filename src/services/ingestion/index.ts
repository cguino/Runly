/**
 * Couche d'ingestion normalisée multi-sources (E6) — cœur pur, sans
 * dépendance native. Les adaptateurs HealthKit / Health Connect / Strava
 * (E6-2 à E6-4) produisent des payloads bruts qui passent TOUS par ici.
 */
export {
  normalizeHealthConnectSession,
  normalizeHealthKitWorkout,
  normalizeStravaActivity,
} from './normalize';
export type { NormalizationResult } from './normalize';
export type { RawHealthConnectSession, RawHealthKitWorkout, RawStravaActivity } from './raw-types';
export { areDuplicates, DEDUP_TOLERANCE, dedupeWorkouts, SOURCE_PRIORITY } from './dedup';
export type { DedupResult } from './dedup';
export {
  associateWorkout,
  dissociateWorkout,
  matchWorkout,
  MATCHING_TOLERANCE_DAYS,
} from './matching';
export type { MatchResult } from './matching';
