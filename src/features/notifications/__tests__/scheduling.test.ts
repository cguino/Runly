import type { Workout } from '@/schemas';
import { createMockNotificationScheduler, DEFAULT_NOTIFICATION_PREFS } from '@/services';

import { useJournalStore } from '../../journal';
import { useLoadStore } from '../../load';
import { useNotificationPrefsStore } from '../notification-prefs-store';
import { initNotifications, refreshScheduledNotifications } from '../scheduling';
import type { NotificationsRuntime } from '../scheduling';

/**
 * Câblage runtime (Lot 9) : demande de RPE à la détection d'une séance
 * importée, resynchronisation sur changement de préférences — via le
 * scheduler mock, sans module natif.
 */

function makeRuntime(): NotificationsRuntime & {
  scheduler: ReturnType<typeof createMockNotificationScheduler>;
} {
  return {
    scheduler: createMockNotificationScheduler(),
    ensurePermission: () => Promise.resolve(true),
  };
}

function importedWorkout(id: string): Workout {
  return {
    id,
    source: 'healthkit',
    startedAt: '2026-07-17T10:00:00+02:00',
    durationS: 2820,
    distanceM: 8200,
  };
}

/** Laisse les promesses des abonnements se résoudre. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('initNotifications (câblage stores → scheduler)', () => {
  let cleanup: () => void = () => undefined;

  beforeEach(() => {
    useJournalStore.setState({ entries: [] });
    useLoadStore.setState({ plannedLoads: [] });
    useNotificationPrefsStore.setState({ prefs: { ...DEFAULT_NOTIFICATION_PREFS } });
  });

  afterEach(() => {
    cleanup();
  });

  it('planifie une demande de RPE quand une séance importée est détectée', async () => {
    const runtime = makeRuntime();
    cleanup = initNotifications(runtime);
    await flush();

    useJournalStore
      .getState()
      .importWorkouts([importedWorkout('11111111-1111-4111-8111-111111111111')]);
    await flush();

    const ids = [...runtime.scheduler.scheduled.keys()];
    expect(ids).toContain('demande_rpe:11111111-1111-4111-8111-111111111111');
    const request = runtime.scheduler.scheduled.get(
      'demande_rpe:11111111-1111-4111-8111-111111111111',
    );
    expect(request?.url).toBe('/rpe-entry');
  });

  it('préférence demande_rpe coupée → pas de demande, et les demandes en attente sont annulées', async () => {
    const runtime = makeRuntime();
    cleanup = initNotifications(runtime);
    await flush();

    useJournalStore
      .getState()
      .importWorkouts([importedWorkout('22222222-2222-4222-8222-222222222222')]);
    await flush();
    expect([...runtime.scheduler.scheduled.keys()]).toContain(
      'demande_rpe:22222222-2222-4222-8222-222222222222',
    );

    useNotificationPrefsStore.getState().setPref('demande_rpe', false);
    await flush();
    expect(
      [...runtime.scheduler.scheduled.keys()].filter((id) => id.startsWith('demande_rpe:')),
    ).toEqual([]);

    useJournalStore
      .getState()
      .importWorkouts([importedWorkout('33333333-3333-4333-8333-333333333333')]);
    await flush();
    expect(
      [...runtime.scheduler.scheduled.keys()].filter((id) => id.startsWith('demande_rpe:')),
    ).toEqual([]);
  });

  it('une séance saisie à la main (RPE déjà connu ou saisi dans l’app) ne déclenche pas de demande', async () => {
    const runtime = makeRuntime();
    cleanup = initNotifications(runtime);
    await flush();

    useJournalStore.getState().addManualWorkout({
      startedAt: '2026-07-17T10:00:00+02:00',
      durationMin: 45,
      rpe: 6,
    });
    await flush();
    expect(
      [...runtime.scheduler.scheduled.keys()].filter((id) => id.startsWith('demande_rpe:')),
    ).toEqual([]);
  });

  it('refreshScheduledNotifications planifie les rappels depuis les séances planifiées connues', async () => {
    const runtime = makeRuntime();
    // Demain à 8 h : rappel attendu (setPlannedLoads déclenche un refresh du store de charge).
    useLoadStore.setState({
      plannedLoads: [{ scheduledDate: '2099-01-05', estimatedLoad: 300 }],
    });
    await refreshScheduledNotifications(runtime, new Date(2099, 0, 4, 10, 0));
    const ids = [...runtime.scheduler.scheduled.keys()];
    expect(ids).toContain('rappel_seance:2099-01-05');
  });

  it('ne demande pas la permission quand il n’y a rien à planifier', async () => {
    const ensurePermission = jest.fn(() => Promise.resolve(true));
    const runtime = { scheduler: createMockNotificationScheduler(), ensurePermission };
    await refreshScheduledNotifications(runtime, new Date(2099, 0, 4, 10, 0));
    expect(ensurePermission).not.toHaveBeenCalled();
  });
});
