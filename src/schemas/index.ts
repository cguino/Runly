/**
 * `src/schemas` — schémas zod aux frontières (règle transverse n°1) :
 * aucune donnée externe (santé, Strava, formulaires) n'entre dans le
 * domaine sans validation ici. Les types métier sont dérivés des schémas
 * (`z.infer`) — source de vérité unique.
 * Contrainte de frontière : zéro import React/Expo dans ce module.
 */
export {
  blockExtentSchema,
  blockTargetSchema,
  sessionBlockSchema,
  sessionBlocksSchema,
  sessionSeriesSchema,
  sessionStepSchema,
  stepRoleSchema,
} from './session-block';
export type {
  BlockExtent,
  BlockTarget,
  SessionBlock,
  SessionSeries,
  SessionStep,
  StepRole,
} from './session-block';

export { workoutSchema, workoutSourceSchema } from './workout';
export type { Workout, WorkoutSource } from './workout';

export {
  confidenceSchema,
  hrZoneSchema,
  physioFieldSchema,
  physioProfileSchema,
  physioRevisionSchema,
  physioValueSchema,
} from './physio-profile';
export type {
  Confidence,
  HrZone,
  PhysioField,
  PhysioProfile,
  PhysioRevision,
  PhysioValue,
} from './physio-profile';

export { goalSchema, raceDistanceSchema, RACE_DISTANCES_M } from './goal';
export type { Goal, RaceDistance } from './goal';

export {
  planPhaseSchema,
  planPhaseTypeSchema,
  plannedSessionSchema,
  plannedWeekSchema,
  sessionTypeSchema,
  trainingPlanSchema,
} from './plan';
export type {
  PlanPhase,
  PlanPhaseType,
  PlannedSession,
  PlannedWeek,
  SessionType,
  TrainingPlan,
} from './plan';

export { injuryRecordSchema, userProfileSchema } from './user-profile';
export type { InjuryRecord, UserProfile } from './user-profile';

export { sessionFeedbackSchema } from './session-feedback';
export type { SessionFeedback } from './session-feedback';

export {
  alertDecisionSchema,
  alertProposedActionSchema,
  alertSchema,
  alertTriggerContextSchema,
  alertTypeSchema,
} from './alert';
export type {
  Alert,
  AlertDecision,
  AlertProposedAction,
  AlertTriggerContext,
  AlertType,
} from './alert';
