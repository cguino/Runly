/**
 * Formes des payloads bruts des sources d'ingestion (E6-1) — typées d'après
 * les sorties documentées des libs retenues (`stack-technique.md`,
 * `spike-sources-donnees.md`). Ces types décrivent une donnée NON fiable :
 * rien n'entre dans le domaine sans passer par la normalisation zod.
 */

/** Workout HealthKit (@kingstinct/react-native-healthkit, simplifié). */
export type RawHealthKitWorkout = {
  uuid: string;
  /** Code HKWorkoutActivityType — 37 = running. */
  workoutActivityType: number;
  startDate: string;
  endDate: string;
  duration?: number; // secondes
  totalDistance?: { quantity: number; unit: string }; // 'm'
  metadata?: Record<string, unknown>;
  /** Agrégats FC si disponibles (résumés, jamais de séries). */
  averageHeartRate?: number;
  maxHeartRate?: number;
};

/** Session Health Connect (react-native-health-connect, simplifié). */
export type RawHealthConnectSession = {
  metadata: { id: string; dataOrigin: string };
  /** ExerciseType — 56 = running, 57 = running treadmill. */
  exerciseType: number;
  startTime: string;
  endTime: string;
  distance?: { inMeters: number };
  aggregatedHeartRate?: { avg?: number; max?: number };
  cadence?: { avg?: number };
};

/** Activité Strava (API v3, simplifié). */
export type RawStravaActivity = {
  id: number;
  type: string; // 'Run', 'Ride', …
  sport_type?: string;
  start_date: string; // ISO avec offset
  elapsed_time: number; // secondes
  moving_time?: number;
  distance?: number; // mètres
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number; // pas/min ÷ 2 côté Strava (par jambe)
};
