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
export * from './auth';
export * from './notifications';
