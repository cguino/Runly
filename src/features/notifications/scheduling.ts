import { router } from 'expo-router';

import type { WorkoutSource } from '@/schemas';
import {
  addNotificationResponseListener,
  buildNotificationPlan,
  cancelNotificationsOfType,
  configureNotifications,
  createExpoNotificationScheduler,
  dateToLocalDateTime,
  ensureNotificationPermission,
  planRpeRequest,
  scheduleOnce,
  syncScheduledNotifications,
} from '@/services';
import type { NotificationScheduler, PlannedSessionLite } from '@/services';
import { buildWeeklyRecap, workoutLoad } from '@/training-engine';
import type { RecapWorkout, WeeklyRecap } from '@/training-engine';

import type { JournalEntry } from '../journal';
import { useJournalStore } from '../journal';
import { useLoadStore } from '../load';
import { usePhysioStore } from '../profile';
import { useNotificationPrefsStore } from './notification-prefs-store';

/**
 * Câblage runtime des notifications (Lot 9) : branche les stores (journal,
 * charge, préférences) sur les fonctions pures de planification et le
 * scheduler système. Toute la logique (dates, contenus, dédoublonnage) vit
 * dans `src/services/notifications` et `src/training-engine` — ici :
 * collecte des données et abonnements.
 */

export type NotificationsRuntime = {
  scheduler: NotificationScheduler;
  ensurePermission: () => Promise<boolean>;
};

let defaultRuntime: NotificationsRuntime | undefined;

/** Runtime expo par défaut (adaptateur natif), construit une seule fois. */
export function getDefaultNotificationsRuntime(): NotificationsRuntime {
  defaultRuntime ??= {
    scheduler: createExpoNotificationScheduler(),
    ensurePermission: ensureNotificationPermission,
  };
  return defaultRuntime;
}

/** Sources dont les séances sont « détectées » (import) → demande de RPE différée. */
const DETECTED_SOURCES: readonly WorkoutSource[] = ['healthkit', 'healthconnect', 'strava'];

/** Valorise une séance du journal en UA (même règle que le store de charge, D4). */
function entryToRecapWorkout(entry: JournalEntry, fcmaxBpm: number | undefined): RecapWorkout {
  const load =
    entry.feedback === undefined && entry.workout.load !== undefined
      ? entry.workout.load
      : workoutLoad(entry.workout, { rpe: entry.feedback?.rpe, fcmaxBpm }).load;
  return {
    startedAt: entry.workout.startedAt,
    durationS: entry.workout.durationS,
    distanceM: entry.workout.distanceM,
    load,
  };
}

/**
 * Séances planifiées connues du Lot 7 (charges estimées du plan).
 * TODO(Lot 8) : brancher le plan réel (`PlannedSession` avec `sessionType`)
 * pour des rappels typés — en attendant, rappel générique par date.
 */
function collectPlannedSessions(): PlannedSessionLite[] {
  return useLoadStore
    .getState()
    .plannedLoads.map(({ scheduledDate }) => ({ scheduledDate, status: 'planned' }));
}

function makeBuildRecap(): (weekStart: string) => WeeklyRecap | undefined {
  return (weekStart) => {
    const entries = useJournalStore.getState().entries;
    if (entries.length === 0 && collectPlannedSessions().length === 0) {
      return undefined;
    }
    const fcmaxBpm = usePhysioStore.getState().profile.fcmaxBpm?.value;
    return buildWeeklyRecap({
      weekStart,
      workouts: entries.map((entry) => entryToRecapWorkout(entry, fcmaxBpm)),
      plannedSessions: collectPlannedSessions(),
    });
  };
}

/**
 * Recalcule et resynchronise les notifications récurrentes (« ta semaine »,
 * rappels de séance, récap hebdo). Appelée au démarrage et à chaque
 * changement pertinent (journal, préférences). Ne demande la permission
 * système que s'il y a effectivement quelque chose à planifier.
 */
export async function refreshScheduledNotifications(
  runtime: NotificationsRuntime,
  now: Date = new Date(),
): Promise<void> {
  const prefs = useNotificationPrefsStore.getState().prefs;
  const desired = buildNotificationPlan({
    now: dateToLocalDateTime(now),
    prefs,
    plannedSessions: collectPlannedSessions(),
    forecastStatus: useLoadStore.getState().forecast?.status,
    buildRecap: makeBuildRecap(),
  });
  if (desired.length > 0 && !(await runtime.ensurePermission())) {
    return;
  }
  await syncScheduledNotifications(runtime.scheduler, desired);
}

/** Demande de RPE 30 min après la détection d'une séance importée (E9-1). */
export async function scheduleRpeRequestForWorkout(
  runtime: NotificationsRuntime,
  workoutRef: string | undefined,
  detectedAt: Date = new Date(),
): Promise<void> {
  const prefs = useNotificationPrefsStore.getState().prefs;
  const notification = planRpeRequest({
    detectedAt: dateToLocalDateTime(detectedAt),
    prefs,
    workoutRef,
  });
  if (notification === undefined) {
    return;
  }
  if (!(await runtime.ensurePermission())) {
    return;
  }
  await scheduleOnce(runtime.scheduler, notification);
}

let initialized = false;

/**
 * Initialise les notifications au démarrage de l'app : configuration du
 * handler système, resynchronisation initiale, puis abonnements —
 * nouvelles séances détectées (→ demande de RPE différée + récap à jour)
 * et changements de préférences (→ resynchronisation, annulation des
 * demandes de RPE en attente si la préférence est coupée).
 * Idempotente ; retourne la fonction de désabonnement.
 */
export function initNotifications(
  runtime: NotificationsRuntime = getDefaultNotificationsRuntime(),
): () => void {
  if (initialized) {
    return () => undefined;
  }
  initialized = true;

  void configureNotifications();
  void refreshScheduledNotifications(runtime);

  // Tap sur une notification → route associée (ex. demande de RPE → saisie).
  const removeResponseListener = addNotificationResponseListener((url) => {
    router.push(url as never);
  });

  const unsubscribeJournal = useJournalStore.subscribe((state, previousState) => {
    const previous = new Set(previousState.entries.map((entry) => entry.workout));
    for (const entry of state.entries) {
      if (
        !previous.has(entry.workout) &&
        entry.feedback === undefined &&
        DETECTED_SOURCES.includes(entry.workout.source)
      ) {
        void scheduleRpeRequestForWorkout(runtime, entry.workout.id);
      }
    }
    if (state.entries !== previousState.entries) {
      // Le réalisé a changé : le contenu du récap hebdo doit suivre.
      void refreshScheduledNotifications(runtime);
    }
  });

  const unsubscribePrefs = useNotificationPrefsStore.subscribe((state, previousState) => {
    if (state.prefs === previousState.prefs) {
      return;
    }
    if (previousState.prefs.demande_rpe && !state.prefs.demande_rpe) {
      void cancelNotificationsOfType(runtime.scheduler, 'demande_rpe');
    }
    void refreshScheduledNotifications(runtime);
  });

  return () => {
    initialized = false;
    removeResponseListener();
    unsubscribeJournal();
    unsubscribePrefs();
  };
}
