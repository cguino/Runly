import { z } from 'zod';

/**
 * Goal : objectif daté **optionnel** (D5) — absent = mode semaine type.
 */
export const raceDistanceSchema = z.enum(['5k', '10k', 'semi', 'marathon']);

export type RaceDistance = z.infer<typeof raceDistanceSchema>;

/** Distances officielles en mètres. */
export const RACE_DISTANCES_M: Record<RaceDistance, number> = {
  '5k': 5000,
  '10k': 10000,
  semi: 21097.5,
  marathon: 42195,
};

export const goalSchema = z
  .object({
    id: z.string().uuid().optional(),
    raceDistance: raceDistanceSchema,
    /** Date de course, ISO `YYYY-MM-DD`. */
    raceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date attendue au format YYYY-MM-DD'),
    ambition: z.enum(['finir', 'chrono']),
    targetTimeS: z.number().int().positive().optional(),
    eventName: z.string().min(1).optional(),
    status: z.enum(['active', 'completed', 'abandoned']).default('active'),
  })
  .refine((g) => g.ambition !== 'chrono' || g.targetTimeS !== undefined, {
    message: 'un objectif chrono exige un temps cible',
    path: ['targetTimeS'],
  });

export type Goal = z.infer<typeof goalSchema>;
