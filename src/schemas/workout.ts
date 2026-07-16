import { z } from 'zod';

/**
 * Workout : séance réalisée, multi-sources (spec §9).
 * Minimisation santé (règle transverse n°7) : agrégats uniquement — jamais
 * de séries FC brutes ni de GPS brut. La FC max de séance est un agrégat.
 */
export const workoutSourceSchema = z.enum([
  'healthkit',
  'healthconnect',
  'strava',
  'player',
  'manuel',
]);

export type WorkoutSource = z.infer<typeof workoutSourceSchema>;

export const workoutSchema = z.object({
  id: z.string().uuid().optional(),
  source: workoutSourceSchema,
  /** Identifiant côté source, pour la déduplication (E6-1). */
  externalId: z.string().min(1).optional(),
  startedAt: z.string().datetime({ offset: true }),
  durationS: z.number().int().positive(),
  distanceM: z.number().nonnegative().optional(),
  avgHrBpm: z.number().int().min(30).max(250).optional(),
  maxHrBpm: z.number().int().min(30).max(250).optional(),
  avgCadenceSpm: z.number().int().min(0).max(300).optional(),
  /** Charge sRPE (RPE × durée) ou fallback d'amorçage (D4), en UA. */
  load: z.number().nonnegative().optional(),
  matchedPlannedSessionId: z.string().uuid().optional(),
});

export type Workout = z.infer<typeof workoutSchema>;
