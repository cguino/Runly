/**
 * `src/features` — écrans + stores zustand par domaine :
 * onboarding, plan, player, library, load, profile (Lots 4, 6, 7, 8, 10).
 * Contraintes de frontière : pas de logique métier ici (elle vit dans
 * `src/training-engine`) ; jamais d'accès direct aux APIs santé/Strava
 * (toujours via `src/services`).
 */
export const FEATURE_DOMAINS = [
  'onboarding',
  'plan',
  'player',
  'library',
  'load',
  'profile',
] as const;

export type FeatureDomain = (typeof FEATURE_DOMAINS)[number];

export { PhysioReferencesScreen, usePhysioStore } from './profile';
