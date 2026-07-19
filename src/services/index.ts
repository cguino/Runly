/**
 * `src/services` — accès aux APIs externes : healthkit, health-connect,
 * strava, supabase, sqlite, notifications, audio (Lots 5–6) + monitoring.
 * Contrainte de frontière : `src/features` ne touche jamais directement
 * HealthKit/Health Connect/Strava — toujours via ce module.
 */
export { initMonitoring } from './monitoring';
export * from './ingestion';
export { createDefaultHealthAdapter, createMockHealthAdapter } from './health/adapter';
export type { HealthAdapter } from './health/adapter';
export { createDefaultHealthWorkoutWriter, createNoopHealthWorkoutWriter } from './health/writer';
export type { HealthWorkoutWriter } from './health/writer';
export * from './auth';
export * from './notifications';
export * from './location';
export * from './storage';
export * from './session-store';
export * from './announcements';
export * from './live-activity';
export { useKeepAwake } from './keep-awake';
