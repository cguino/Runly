import type { Workout } from '@/schemas';

/**
 * Contrat des adaptateurs santé (E6-2, E6-3). Les implémentations natives
 * (@kingstinct/react-native-healthkit v14 pinnée, react-native-health-connect
 * 3.5.3 — `stack-technique.md`) seront branchées lors des tests device :
 * observer HealthKit + refresh foreground côté iOS ; polling
 * expo-background-task ≥ 15 min + foreground côté Android, permissions
 * historique > 30 j et background.
 *
 * Tout payload brut passe par `src/services/ingestion` (normalisation zod,
 * filtre course, dédup) avant d'atteindre le domaine.
 */
export type HealthAdapter = {
  /** Demande des permissions, précédée d'un écran d'explication (jamais de prompt à froid). */
  requestPermissions: () => Promise<boolean>;
  /** Workouts course depuis une date (import initial : 26 semaines, spec §6.1). */
  fetchRunningWorkouts: (sinceIso: string) => Promise<Workout[]>;
  /** Abonnement aux nouveaux workouts (observer / polling selon l'OS). */
  subscribe: (onWorkouts: (workouts: Workout[]) => void) => () => void;
};

/** Adaptateur factice pour le dev et les tests (fixtures déjà normalisées). */
export function createMockHealthAdapter(fixtures: Workout[]): HealthAdapter {
  return {
    requestPermissions: () => Promise.resolve(true),
    fetchRunningWorkouts: (sinceIso) =>
      Promise.resolve(fixtures.filter((w) => w.startedAt >= sinceIso)),
    subscribe: () => () => undefined,
  };
}
