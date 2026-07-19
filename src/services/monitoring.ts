/**
 * Sentry en mode crash uniquement (D10) : pas d'analytics produit,
 * pas de tracing performance, pas de replay. Les KPI de la spec §10
 * sont calculés par requêtes SQL directes sur Supabase.
 * Le DSN vient de l'environnement (`.env.example`) et n'est jamais commité.
 */
import * as Sentry from '@sentry/react-native';

export function initMonitoring(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    // Pas de DSN (dev local, CI) : monitoring désactivé, l'app démarre normalement.
    return;
  }
  Sentry.init({
    dsn,
    // Crash-only : tout le reste est explicitement coupé.
    tracesSampleRate: 0,
    enableAutoPerformanceTracing: false,
    sendDefaultPii: false,
  });
}
