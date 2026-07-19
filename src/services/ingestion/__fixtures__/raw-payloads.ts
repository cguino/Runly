import type { RawHealthConnectSession, RawHealthKitWorkout, RawStravaActivity } from '../raw-types';

/**
 * Fixtures d'ingestion réalistes (vérification Lot 5) : la même sortie du
 * dimanche matin remonte par Strava ET par la santé ; deux séances proches
 * le même jour ; des activités non-course à filtrer ; un payload corrompu.
 */

/** Sortie longue du dimanche 12/07, vue par Strava (la plus riche). */
export const stravaSundayLongRun: RawStravaActivity = {
  id: 15482930211,
  type: 'Run',
  sport_type: 'Run',
  start_date: '2026-07-12T08:31:12+02:00',
  elapsed_time: 4980,
  moving_time: 4890,
  distance: 15060,
  average_heartrate: 148.2,
  max_heartrate: 167,
  average_cadence: 84.5,
};

/** La même sortie, vue par HealthKit (montre → Apple Santé). */
export const healthKitSundayLongRun: RawHealthKitWorkout = {
  uuid: 'C7E4A2D1-9B41-4E5C-8F1A-3D2B6C9E0F42',
  workoutActivityType: 37,
  startDate: '2026-07-12T08:31:05+02:00',
  endDate: '2026-07-12T09:53:20+02:00',
  duration: 4935,
  totalDistance: { quantity: 14980, unit: 'm' },
  averageHeartRate: 147.6,
  maxHeartRate: 166,
};

/** La même sortie, vue par Health Connect (scénario Android). */
export const healthConnectSundayLongRun: RawHealthConnectSession = {
  metadata: { id: 'hc-8f31c2aa-77e1', dataOrigin: 'com.polar.flow' },
  exerciseType: 56,
  startTime: '2026-07-12T08:31:00+02:00',
  endTime: '2026-07-12T09:54:00+02:00',
  distance: { inMeters: 15010 },
  aggregatedHeartRate: { avg: 148.9, max: 168 },
  cadence: { avg: 168 },
};

/** Footing du mardi matin (séance distincte, même semaine). */
export const stravaTuesdayEasyRun: RawStravaActivity = {
  id: 15490771002,
  type: 'Run',
  start_date: '2026-07-14T07:02:44+02:00',
  elapsed_time: 2450,
  moving_time: 2410,
  distance: 7480,
  average_heartrate: 139.8,
};

/**
 * Deux séances PROCHES mais distinctes le même jour (double du midi) :
 * même matinée, 40 min d'écart — ne doivent PAS être dédupliquées.
 */
export const healthKitMorningIntervals: RawHealthKitWorkout = {
  uuid: 'A1B2C3D4-1111-4E5C-8F1A-3D2B6C9E0001',
  workoutActivityType: 37,
  startDate: '2026-07-15T12:01:00+02:00',
  endDate: '2026-07-15T12:41:00+02:00',
  duration: 2400,
  totalDistance: { quantity: 8100, unit: 'm' },
  averageHeartRate: 168,
  maxHeartRate: 186,
};

export const healthKitNoonCooldownJog: RawHealthKitWorkout = {
  uuid: 'A1B2C3D4-2222-4E5C-8F1A-3D2B6C9E0002',
  workoutActivityType: 37,
  startDate: '2026-07-15T12:55:00+02:00',
  endDate: '2026-07-15T13:15:00+02:00',
  duration: 1200,
  totalDistance: { quantity: 3200, unit: 'm' },
  averageHeartRate: 128,
};

/** Sortie vélo Strava → filtrée (pas une course à pied). */
export const stravaBikeRide: RawStravaActivity = {
  id: 15501112303,
  type: 'Ride',
  sport_type: 'Ride',
  start_date: '2026-07-13T18:20:00+02:00',
  elapsed_time: 5400,
  distance: 32000,
};

/** Renforcement HealthKit (type 20 = functional training) → filtré. */
export const healthKitStrengthTraining: RawHealthKitWorkout = {
  uuid: 'B9F0E1D2-3333-4E5C-8F1A-3D2B6C9E0003',
  workoutActivityType: 20,
  startDate: '2026-07-13T19:00:00+02:00',
  endDate: '2026-07-13T19:45:00+02:00',
  duration: 2700,
};

/** Payload corrompu : durée nulle (montre buggée) → rejeté par zod. */
export const healthKitCorruptedWorkout: RawHealthKitWorkout = {
  uuid: 'D4C3B2A1-4444-4E5C-8F1A-3D2B6C9E0004',
  workoutActivityType: 37,
  startDate: '2026-07-16T07:00:00+02:00',
  endDate: '2026-07-16T07:00:00+02:00',
  duration: 0,
};
