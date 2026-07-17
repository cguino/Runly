import { create } from 'zustand';

import i18n from '@/i18n';
import type {
  CreateRunnerInput,
  RunnerTransition,
  RunnerUpdate,
  SessionRunnerState,
} from '@/training-engine';
import {
  abandonRunner,
  addRunnerDistance,
  createRunner,
  currentFlatStep,
  flattenBlocks,
  nextFlatStep,
  pauseRunner,
  resumeRunner,
  skipRunnerStep,
  startRunner,
  stepDurationMs,
  tickRunner,
  workoutFromRunner,
} from '@/training-engine';
import type {
  AnnouncementPlayer,
  GpsSignal,
  HealthWorkoutWriter,
  LocationTracker,
  SessionActivityInfo,
  SessionActivityService,
  SessionSnapshotStore,
  TrackerSnapshot,
} from '@/services';
import {
  createDefaultHealthWorkoutWriter,
  createDefaultSessionActivityService,
  createLocationTracker,
  createSessionSnapshotStore,
  createSqliteKeyValueStore,
  createTtsAnnouncementPlayer,
} from '@/services';

import { useJournalStore } from '../journal';
import { useLoadStore } from '../load';
import { speechForStep, stepSummary, targetLabel } from './session-format';

/**
 * Store du player (E5) : orchestration d'état autour de la machine à états
 * pure (`src/training-engine/session-runner`). Aucune règle métier ici.
 * - persistance expo-sqlite à **chaque transition** + autosave périodique
 *   (crash-safe, ADR-009) ;
 * - tracking GPS via `src/services/location` (frontière plan §2) ;
 * - annonces via `AnnouncementPlayer` (TTS par défaut, plan B possible) ;
 * - Live Activity / notification riche via `SessionActivityService`
 *   (updates aux transitions uniquement, E5-7).
 */

export type PlayerServices = {
  snapshots: SessionSnapshotStore;
  tracker: LocationTracker;
  announcer: AnnouncementPlayer;
  activity: SessionActivityService;
  healthWriter: HealthWorkoutWriter;
  /** Horloge injectable (tests de dérive du timer). */
  now: () => number;
};

let serviceOverrides: Partial<PlayerServices> = {};
const lazyDefaults: Partial<PlayerServices> = {};

function defaultService<K extends keyof PlayerServices>(key: K): PlayerServices[K] {
  const cached = lazyDefaults[key];
  if (cached !== undefined) {
    return cached;
  }
  const factories: { [P in keyof PlayerServices]: () => PlayerServices[P] } = {
    snapshots: () => createSessionSnapshotStore(createSqliteKeyValueStore()),
    tracker: () => createLocationTracker(),
    announcer: () => createTtsAnnouncementPlayer(),
    activity: () => createDefaultSessionActivityService(),
    healthWriter: () => createDefaultHealthWorkoutWriter(),
    now: () => () => Date.now(),
  };
  const created = factories[key]();
  lazyDefaults[key] = created;
  return created;
}

function service<K extends keyof PlayerServices>(key: K): PlayerServices[K] {
  return serviceOverrides[key] ?? defaultService(key);
}

/** Injection de services (tests, plan B audio, natif Live Activity). */
export function configurePlayerServices(overrides: Partial<PlayerServices>): void {
  serviceOverrides = { ...serviceOverrides, ...overrides };
}

export function resetPlayerServices(): void {
  serviceOverrides = {};
}

/** Période du tick d'horloge (la précision vient des horodatages, pas du tick). */
export const TICK_INTERVAL_MS = 250;
/** Autosave périodique entre deux transitions (crash-safe sur les blocs longs). */
export const AUTOSAVE_INTERVAL_MS = 5000;

let tickTimer: ReturnType<typeof setInterval> | undefined;
let lastSaveAtMs = 0;

type PlayerStoreState = {
  runner?: SessionRunnerState;
  gpsSignal: GpsSignal;
  /** Allure lissée (s/km), figée en perte de signal (D13). */
  smoothedPaceSecPerKm?: number;
  /** true si la séance affichée vient d'un restore après kill (E5-1). */
  restored: boolean;
  /** true une fois le workout écrit au journal (idempotence du récap). */
  workoutSaved: boolean;
  /** true si la permission localisation a été refusée (dégradé sans GPS). */
  gpsDenied: boolean;

  /** Recharge une éventuelle séance persistée (appelé à l'ouverture du player). */
  hydrate: () => void;
  /** Prépare une séance (depuis le plan, la bibliothèque ou la démo). */
  prepare: (input: CreateRunnerInput) => void;
  /** Démarre : permission + tracking + machine à états. */
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  /** Termine la séance maintenant (abandon tracé, récap ensuite). */
  finishNow: () => void;
  /**
   * Écrit le Workout (journal + santé + charge) — idempotent.
   * Retourne false si la séance est trop courte pour compter.
   */
  saveWorkout: () => boolean;
  /** Sort du player et nettoie tout (snapshot compris). */
  reset: () => void;
};

function stopTicking(): void {
  if (tickTimer !== undefined) {
    clearInterval(tickTimer);
    tickTimer = undefined;
  }
}

export const usePlayerStore = create<PlayerStoreState>()((set, get) => {
  const persist = (state: SessionRunnerState): void => {
    service('snapshots').save(state);
    lastSaveAtMs = service('now')();
  };

  const announceTransitions = (
    state: SessionRunnerState,
    transitions: RunnerTransition[],
  ): void => {
    const announcer = service('announcer');
    for (const transition of transitions) {
      switch (transition.type) {
        case 'session_started': {
          const step = currentFlatStep(state);
          announcer.announce({
            key: 'session_started',
            text: i18n.t('player.announcements.session_started', {
              step: step === undefined ? '' : speechForStep(step),
            }),
          });
          break;
        }
        case 'step_started': {
          const step = flattenBlocks(state.blocks)[transition.stepIndex];
          if (step === undefined) {
            break;
          }
          const isRecovery = step.isSeriesRecovery || step.step.role === 'recuperation';
          announcer.announce({
            key: isRecovery ? 'block_recovery' : 'block_start',
            text: i18n.t(
              isRecovery
                ? 'player.announcements.block_recovery'
                : 'player.announcements.block_start',
              { step: speechForStep(step) },
            ),
          });
          break;
        }
        case 'session_paused':
          announcer.announce({
            key: 'session_paused',
            text: i18n.t('player.announcements.session_paused'),
          });
          break;
        case 'session_resumed': {
          const step = currentFlatStep(state);
          announcer.announce({
            key: 'session_resumed',
            text: i18n.t('player.announcements.session_resumed', {
              step: step === undefined ? '' : speechForStep(step),
            }),
          });
          break;
        }
        case 'session_completed':
          announcer.announce({
            key: 'session_completed',
            text: i18n.t('player.announcements.session_completed'),
          });
          break;
        case 'session_abandoned':
        case 'step_completed':
          break;
      }
    }
  };

  const activityInfo = (state: SessionRunnerState): SessionActivityInfo => {
    const step = currentFlatStep(state);
    const next = nextFlatStep(state);
    const durationMs = step === undefined ? undefined : stepDurationMs(step.step);
    const paused = state.phase !== 'running';
    return {
      title: state.title ?? i18n.t('player.title'),
      stepLabel: step === undefined ? '' : stepSummary(step),
      stepEndsAtMs:
        durationMs === undefined || paused
          ? undefined
          : service('now')() + Math.max(0, durationMs - state.stepElapsedMs),
      targetPaceLabel: step === undefined ? undefined : targetLabel(step.step.target),
      nextStepLabel: next === undefined ? undefined : stepSummary(next),
      paused,
    };
  };

  /** Applique un update : état, persistance par transition, annonces, Live Activity. */
  const applyUpdate = (update: RunnerUpdate): void => {
    const { state, transitions } = update;
    set({ runner: state });
    if (transitions.length > 0) {
      persist(state);
      announceTransitions(state, transitions);
      void service('activity').update(activityInfo(state));
      if (state.phase === 'completed' || state.phase === 'abandoned') {
        stopTicking();
        service('tracker').stop();
        void service('activity').end();
      }
    } else if (
      state.phase === 'running' &&
      service('now')() - lastSaveAtMs >= AUTOSAVE_INTERVAL_MS
    ) {
      // Autosave entre deux transitions : un kill en plein bloc long ne
      // perd au pire que quelques secondes d'écoulement.
      persist(state);
    }
  };

  const startTicking = (): void => {
    stopTicking();
    tickTimer = setInterval(() => {
      const runner = get().runner;
      if (runner === undefined || runner.phase !== 'running') {
        return;
      }
      applyUpdate(tickRunner(runner, service('now')()));
    }, TICK_INTERVAL_MS);
  };

  const onTrackerSnapshot = (snapshot: TrackerSnapshot): void => {
    set({ gpsSignal: snapshot.signal, smoothedPaceSecPerKm: snapshot.smoothedPaceSecPerKm });
    const runner = get().runner;
    if (runner === undefined || runner.phase !== 'running' || snapshot.deltaDistanceM <= 0) {
      return;
    }
    applyUpdate(addRunnerDistance(runner, snapshot.deltaDistanceM, service('now')()));
  };

  return {
    runner: undefined,
    gpsSignal: 'acquiring',
    smoothedPaceSecPerKm: undefined,
    restored: false,
    workoutSaved: false,
    gpsDenied: false,

    hydrate: () => {
      if (get().runner !== undefined) {
        return;
      }
      const restored = service('snapshots').load();
      if (restored !== undefined) {
        // Kill/restore : la séance revient en pause, l'utilisateur reprend.
        set({ runner: restored, restored: true });
      }
    },

    prepare: (input) => {
      stopTicking();
      const runner = createRunner(input);
      set({
        runner,
        restored: false,
        workoutSaved: false,
        gpsSignal: 'acquiring',
        smoothedPaceSecPerKm: undefined,
      });
    },

    start: async () => {
      const runner = get().runner;
      if (runner === undefined || runner.phase !== 'ready') {
        return;
      }
      const tracker = service('tracker');
      const granted = await tracker.requestPermission();
      set({ gpsDenied: !granted });
      if (granted) {
        // Dégradation gracieuse (D13) : sans GPS, timer/annonces continuent.
        await tracker.start(onTrackerSnapshot);
      }
      const update = startRunner(runner, service('now')());
      applyUpdate(update);
      void service('activity').start(activityInfo(update.state));
      startTicking();
    },

    pause: () => {
      const runner = get().runner;
      if (runner === undefined) {
        return;
      }
      applyUpdate(pauseRunner(runner, service('now')()));
    },

    resume: () => {
      const runner = get().runner;
      if (runner === undefined) {
        return;
      }
      const wasRestored = get().restored;
      applyUpdate(resumeRunner(runner, service('now')()));
      if (wasRestored) {
        // Reprise après kill : le tracking et la Live Activity redémarrent.
        set({ restored: false });
        void service('tracker').start(onTrackerSnapshot);
        const current = get().runner;
        if (current !== undefined) {
          void service('activity').start(activityInfo(current));
        }
      }
      startTicking();
    },

    skip: () => {
      const runner = get().runner;
      if (runner === undefined) {
        return;
      }
      applyUpdate(skipRunnerStep(runner, service('now')()));
    },

    finishNow: () => {
      const runner = get().runner;
      if (runner === undefined) {
        return;
      }
      applyUpdate(abandonRunner(runner, service('now')()));
    },

    saveWorkout: () => {
      const { runner, workoutSaved } = get();
      if (runner === undefined) {
        return false;
      }
      if (workoutSaved) {
        return true;
      }
      const workout = workoutFromRunner(runner);
      if (workout === undefined) {
        // Trop courte pour compter : on nettoie sans écrire (E5-5).
        service('snapshots').clear();
        return false;
      }
      const imported = useJournalStore.getState().importWorkouts([workout]);
      if (imported === 0) {
        return false;
      }
      useLoadStore.getState().refresh();
      // Écriture santé : best effort, jamais bloquant (no-op tant que le natif n'est pas branché).
      void service('healthWriter').saveRunningWorkout(workout);
      service('snapshots').clear();
      set({ workoutSaved: true });
      return true;
    },

    reset: () => {
      stopTicking();
      service('tracker').stop();
      service('announcer').stop();
      void service('activity').end();
      service('snapshots').clear();
      set({
        runner: undefined,
        restored: false,
        workoutSaved: false,
        gpsSignal: 'acquiring',
        smoothedPaceSecPerKm: undefined,
        gpsDenied: false,
      });
    },
  };
});
