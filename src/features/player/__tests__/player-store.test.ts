import type { SessionBlock } from '@/schemas';
import type {
  Announcement,
  LocationTracker,
  SessionActivityInfo,
  TrackerSnapshot,
} from '@/services';
import { createInMemoryKeyValueStore, createSessionSnapshotStore } from '@/services';

import { useJournalStore } from '../../journal';
import {
  configurePlayerServices,
  resetPlayerServices,
  TICK_INTERVAL_MS,
  usePlayerStore,
} from '../player-store';

/**
 * Tests du store player (E5) : orchestration autour de la machine à états —
 * persistance à chaque transition (kill/restore), annonces, Live Activity,
 * tracking injecté, écriture du workout. Tout service est un fake.
 */

const BLOCKS: SessionBlock[] = [
  {
    kind: 'step',
    extent: { type: 'duration', seconds: 60 },
    target: { type: 'none' },
    role: 'echauffement',
  },
  {
    kind: 'step',
    extent: { type: 'distance', meters: 400 },
    target: { type: 'pace', minSecondsPerKm: 285, maxSecondsPerKm: 300 },
    role: 'travail',
  },
  {
    kind: 'step',
    extent: { type: 'duration', seconds: 60 },
    target: { type: 'none' },
    role: 'retour_calme',
  },
];

type Fakes = ReturnType<typeof installFakes>;

function installFakes(options?: { permission?: boolean }) {
  const kv = createInMemoryKeyValueStore();
  const snapshots = createSessionSnapshotStore(kv);
  const saveSpy = jest.spyOn(snapshots, 'save');

  let onSnapshot: ((snapshot: TrackerSnapshot) => void) | undefined;
  const tracker: LocationTracker = {
    requestPermission: jest.fn(() => Promise.resolve(options?.permission ?? true)),
    start: jest.fn((cb: (snapshot: TrackerSnapshot) => void) => {
      onSnapshot = cb;
      return Promise.resolve(true);
    }),
    stop: jest.fn(),
  };

  const announcements: Announcement[] = [];
  const activityCalls: { kind: 'start' | 'update' | 'end'; info?: SessionActivityInfo }[] = [];
  const healthSaved: unknown[] = [];

  configurePlayerServices({
    snapshots,
    tracker,
    announcer: {
      announce: (a) => {
        announcements.push(a);
      },
      stop: jest.fn(),
    },
    activity: {
      start: (info) => {
        activityCalls.push({ kind: 'start', info });
        return Promise.resolve();
      },
      update: (info) => {
        activityCalls.push({ kind: 'update', info });
        return Promise.resolve();
      },
      end: () => {
        activityCalls.push({ kind: 'end' });
        return Promise.resolve();
      },
    },
    healthWriter: {
      saveRunningWorkout: (w) => {
        healthSaved.push(w);
        return Promise.resolve(true);
      },
    },
  });

  return {
    kv,
    snapshots,
    saveSpy,
    tracker,
    announcements,
    activityCalls,
    healthSaved,
    emitGps: (snapshot: TrackerSnapshot) => onSnapshot?.(snapshot),
  };
}

async function startSession(fakes: Fakes): Promise<void> {
  usePlayerStore.getState().prepare({ sessionId: 'test-1', sessionType: 'seuil', blocks: BLOCKS });
  await usePlayerStore.getState().start();
}

beforeEach(() => {
  jest.useFakeTimers();
  useJournalStore.setState({ entries: [] });
  usePlayerStore.setState({
    runner: undefined,
    restored: false,
    workoutSaved: false,
    gpsSignal: 'acquiring',
    smoothedPaceSecPerKm: undefined,
    gpsDenied: false,
  });
});

afterEach(() => {
  usePlayerStore.getState().reset();
  resetPlayerServices();
  jest.useRealTimers();
});

describe('player store — démarrage et transitions', () => {
  it('start : machine démarrée, snapshot persisté, annonce et Live Activity lancées', async () => {
    const fakes = installFakes();
    await startSession(fakes);

    expect(usePlayerStore.getState().runner?.phase).toBe('running');
    expect(fakes.saveSpy).toHaveBeenCalled();
    expect(fakes.snapshots.load()?.sessionId).toBe('test-1');
    expect(fakes.announcements[0]?.key).toBe('session_started');
    expect(fakes.activityCalls.some((c) => c.kind === 'start')).toBe(true);
    expect(fakes.tracker.start).toHaveBeenCalled();
  });

  it('permission refusée : la séance démarre quand même, sans tracking (D13)', async () => {
    const fakes = installFakes({ permission: false });
    await startSession(fakes);
    expect(usePlayerStore.getState().runner?.phase).toBe('running');
    expect(usePlayerStore.getState().gpsDenied).toBe(true);
    expect(fakes.tracker.start).not.toHaveBeenCalled();
  });

  it('le tick fait franchir les blocs en durée : annonce + persistance à la transition', async () => {
    const fakes = installFakes();
    await startSession(fakes);
    fakes.saveSpy.mockClear();

    jest.advanceTimersByTime(61_000);
    const runner = usePlayerStore.getState().runner;
    expect(runner?.stepIndex).toBe(1);
    expect(fakes.saveSpy).toHaveBeenCalled();
    expect(fakes.snapshots.load()?.stepIndex).toBe(1);
    expect(fakes.announcements.map((a) => a.key)).toContain('block_start');
    expect(fakes.activityCalls.filter((c) => c.kind === 'update').length).toBeGreaterThan(0);
  });

  it('la distance GPS fait progresser puis franchir un bloc en distance', async () => {
    const fakes = installFakes();
    await startSession(fakes);
    jest.advanceTimersByTime(61_000); // → bloc distance

    fakes.emitGps({ signal: 'ok', smoothedPaceSecPerKm: 290, totalDistanceM: 250, deltaDistanceM: 250 });
    expect(usePlayerStore.getState().runner?.stepDistanceM).toBe(250);
    expect(usePlayerStore.getState().smoothedPaceSecPerKm).toBe(290);
    expect(usePlayerStore.getState().gpsSignal).toBe('ok');

    fakes.emitGps({ signal: 'ok', smoothedPaceSecPerKm: 290, totalDistanceM: 410, deltaDistanceM: 160 });
    expect(usePlayerStore.getState().runner?.stepIndex).toBe(2);
  });

  it('pause / reprise / skip : transitions annoncées et persistées', async () => {
    const fakes = installFakes();
    await startSession(fakes);

    usePlayerStore.getState().pause();
    expect(usePlayerStore.getState().runner?.phase).toBe('paused');
    expect(fakes.snapshots.load()?.phase).toBe('paused');
    expect(fakes.announcements.map((a) => a.key)).toContain('session_paused');

    usePlayerStore.getState().resume();
    expect(usePlayerStore.getState().runner?.phase).toBe('running');
    expect(fakes.announcements.map((a) => a.key)).toContain('session_resumed');

    usePlayerStore.getState().skip();
    expect(usePlayerStore.getState().runner?.stepIndex).toBe(1);
  });

  it('fin de séance : tracker arrêté, Live Activity terminée, annonce finale', async () => {
    const fakes = installFakes();
    await startSession(fakes);
    usePlayerStore.getState().skip();
    usePlayerStore.getState().skip();
    usePlayerStore.getState().skip();

    expect(usePlayerStore.getState().runner?.phase).toBe('completed');
    expect(fakes.announcements.map((a) => a.key)).toContain('session_completed');
    expect(fakes.tracker.stop).toHaveBeenCalled();
    expect(fakes.activityCalls.some((c) => c.kind === 'end')).toBe(true);
  });
});

describe('player store — autosave et kill/restore (E5-1)', () => {
  it('autosave périodique entre deux transitions (bloc long)', async () => {
    const fakes = installFakes();
    await startSession(fakes);
    fakes.saveSpy.mockClear();

    // 10 s au milieu du premier bloc (60 s) : aucune transition, mais ≥ 1 autosave.
    jest.advanceTimersByTime(10_000);
    expect(fakes.saveSpy).toHaveBeenCalled();
    const persisted = fakes.snapshots.load();
    expect(persisted?.totalElapsedMs ?? 0).toBeGreaterThan(0);
  });

  it('kill/restore : hydrate retrouve la séance en pause, la reprise relance tracking et Live Activity', async () => {
    const fakes = installFakes();
    await startSession(fakes);
    jest.advanceTimersByTime(61_000); // → bloc 1, transition persistée

    // Kill du process simulé : état mémoire perdu, la persistance reste.
    usePlayerStore.setState({ runner: undefined, restored: false });
    (fakes.tracker.start as jest.Mock).mockClear();
    fakes.activityCalls.length = 0;

    usePlayerStore.getState().hydrate();
    const restored = usePlayerStore.getState();
    expect(restored.restored).toBe(true);
    expect(restored.runner?.phase).toBe('paused');
    expect(restored.runner?.stepIndex).toBe(1);
    expect(restored.runner?.totalElapsedMs ?? 0).toBeGreaterThanOrEqual(60_000);

    usePlayerStore.getState().resume();
    expect(usePlayerStore.getState().runner?.phase).toBe('running');
    expect(usePlayerStore.getState().restored).toBe(false);
    expect(fakes.tracker.start).toHaveBeenCalled();
    expect(fakes.activityCalls.some((c) => c.kind === 'start')).toBe(true);
  });

  it('dérive du timer < 1 s sur 1 h simulée à travers le tick réel', async () => {
    installFakes();
    usePlayerStore.getState().prepare({
      sessionId: 'drift-1',
      blocks: [
        { kind: 'step', extent: { type: 'duration', seconds: 2 * 3600 }, target: { type: 'none' } },
      ],
    });
    await usePlayerStore.getState().start();

    jest.advanceTimersByTime(3_600_000);
    const total = usePlayerStore.getState().runner?.totalElapsedMs ?? 0;
    expect(Math.abs(total - 3_600_000)).toBeLessThan(1000);
    // Le tick tourne bien à la période attendue (sanity check).
    expect(TICK_INTERVAL_MS).toBeLessThanOrEqual(1000);
  });
});

describe('player store — écriture du workout (E5-5)', () => {
  it('saveWorkout : journal + santé + snapshot nettoyé, idempotent', async () => {
    const fakes = installFakes();
    await startSession(fakes);
    jest.advanceTimersByTime(61_000);
    fakes.emitGps({ signal: 'ok', smoothedPaceSecPerKm: 290, totalDistanceM: 400, deltaDistanceM: 400 });
    jest.advanceTimersByTime(61_000);
    expect(usePlayerStore.getState().runner?.phase).toBe('completed');

    expect(usePlayerStore.getState().saveWorkout()).toBe(true);
    const entries = useJournalStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]?.workout).toMatchObject({ source: 'player', distanceM: 400 });
    expect(fakes.healthSaved).toHaveLength(1);
    expect(fakes.snapshots.load()).toBeUndefined();

    // Idempotence : un second appel n'écrit pas de doublon.
    expect(usePlayerStore.getState().saveWorkout()).toBe(true);
    expect(useJournalStore.getState().entries).toHaveLength(1);
  });

  it('séance trop courte : rien d’écrit, snapshot nettoyé', async () => {
    const fakes = installFakes();
    await startSession(fakes);
    jest.advanceTimersByTime(5_000);
    usePlayerStore.getState().finishNow();
    expect(usePlayerStore.getState().runner?.phase).toBe('abandoned');

    expect(usePlayerStore.getState().saveWorkout()).toBe(false);
    expect(useJournalStore.getState().entries).toHaveLength(0);
    expect(fakes.snapshots.load()).toBeUndefined();
  });

  it('abandon après plus d’une minute : la séance partielle est enregistrée', async () => {
    const fakes = installFakes();
    await startSession(fakes);
    jest.advanceTimersByTime(90_000);
    usePlayerStore.getState().finishNow();

    expect(usePlayerStore.getState().saveWorkout()).toBe(true);
    expect(useJournalStore.getState().entries).toHaveLength(1);
    expect(fakes.snapshots.load()).toBeUndefined();
  });
});
