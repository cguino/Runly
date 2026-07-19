import { z } from 'zod';

import { sessionBlocksSchema } from './session-block';

/**
 * TrainingPlan → PlannedWeek → PlannedSession (spec §9).
 * Le plan est généré côté client par `src/training-engine` (Lot 3) et
 * persisté pour la sync multi-device (D14).
 */

export const planPhaseTypeSchema = z.enum(['generale', 'specifique', 'affutage']);

export type PlanPhaseType = z.infer<typeof planPhaseTypeSchema>;

export const planPhaseSchema = z.object({
  type: planPhaseTypeSchema,
  /** Index de semaine de début (0-based) et nombre de semaines. */
  startWeekIndex: z.number().int().min(0),
  weekCount: z.number().int().min(1),
});

export type PlanPhase = z.infer<typeof planPhaseSchema>;

/** Les 7 types de séance du MVP (spec §7.3). */
export const sessionTypeSchema = z.enum([
  'ef',
  'sortie_longue',
  'vma_court',
  'seuil',
  'tempo',
  'fartlek',
  'recuperation',
]);

export type SessionType = z.infer<typeof sessionTypeSchema>;

export const plannedSessionSchema = z.object({
  id: z.string().uuid().optional(),
  /** Date planifiée, ISO `YYYY-MM-DD`. */
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date attendue au format YYYY-MM-DD'),
  sessionType: sessionTypeSchema,
  blocks: sessionBlocksSchema.default([]),
  status: z.enum(['planned', 'done', 'missed', 'moved', 'cancelled']).default('planned'),
});

export type PlannedSession = z.infer<typeof plannedSessionSchema>;

export const plannedWeekSchema = z.object({
  id: z.string().uuid().optional(),
  weekIndex: z.number().int().min(0),
  targetVolumeKm: z.number().nonnegative().optional(),
  /** Charge cible hebdo en UA sRPE. */
  targetLoad: z.number().nonnegative().optional(),
  isRecovery: z.boolean().default(false),
  sessions: z.array(plannedSessionSchema).default([]),
});

export type PlannedWeek = z.infer<typeof plannedWeekSchema>;

export const trainingPlanSchema = z.object({
  id: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
  phases: z.array(planPhaseSchema).default([]),
  status: z.enum(['active', 'superseded', 'completed', 'abandoned']).default('active'),
  version: z.number().int().min(1).default(1),
  weeks: z.array(plannedWeekSchema).default([]),
});

export type TrainingPlan = z.infer<typeof trainingPlanSchema>;
