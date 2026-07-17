import { createMockNotificationScheduler } from '../scheduler';
import { cancelNotificationsOfType, scheduleOnce, syncScheduledNotifications } from '../service';
import type { PlannedNotification } from '../types';

/**
 * Synchronisation (Lot 9) : idempotence (pas de doublon), annulation des
 * notifications obsolètes, demandes de RPE événementielles laissées en place.
 */

function notification(id: string, date = '2026-07-20'): PlannedNotification {
  const type = id.split(':')[0] as PlannedNotification['type'];
  return {
    id,
    type,
    fireAt: { date, hour: 8, minute: 0 },
    content: { title: 'Titre', body: 'Corps' },
  };
}

describe('syncScheduledNotifications', () => {
  it('planifie le plan désiré et reste idempotente (pas de doublon)', async () => {
    const scheduler = createMockNotificationScheduler();
    const desired = [
      notification('ta_semaine:2026-07-20'),
      notification('rappel_seance:2026-07-22'),
    ];
    await syncScheduledNotifications(scheduler, desired);
    await syncScheduledNotifications(scheduler, desired);
    expect([...scheduler.scheduled.keys()].sort()).toEqual([
      'rappel_seance:2026-07-22',
      'ta_semaine:2026-07-20',
    ]);
  });

  it('annule les notifications gérées devenues obsolètes', async () => {
    const scheduler = createMockNotificationScheduler();
    await syncScheduledNotifications(scheduler, [
      notification('rappel_seance:2026-07-18'),
      notification('rappel_seance:2026-07-22'),
    ]);
    const { cancelledIds } = await syncScheduledNotifications(scheduler, [
      notification('rappel_seance:2026-07-22'),
    ]);
    expect(cancelledIds).toEqual(['rappel_seance:2026-07-18']);
    expect([...scheduler.scheduled.keys()]).toEqual(['rappel_seance:2026-07-22']);
  });

  it('remplace le contenu d’une notification déjà planifiée (récap recalculé)', async () => {
    const scheduler = createMockNotificationScheduler();
    await syncScheduledNotifications(scheduler, [notification('recap_hebdo:2026-07-19')]);
    const updated = {
      ...notification('recap_hebdo:2026-07-19'),
      content: { title: 'Titre', body: 'Corps mis à jour' },
    };
    await syncScheduledNotifications(scheduler, [updated]);
    expect(scheduler.scheduled.get('recap_hebdo:2026-07-19')?.content.body).toBe(
      'Corps mis à jour',
    );
    expect(scheduler.scheduled.size).toBe(1);
  });

  it('laisse en place les demandes de RPE (hors plan récurrent) et les ids inconnus', async () => {
    const scheduler = createMockNotificationScheduler();
    await scheduler.schedule(notification('demande_rpe:w-1'));
    await scheduler.schedule(notification('autre-chose' as never));
    await syncScheduledNotifications(scheduler, [notification('ta_semaine:2026-07-20')]);
    expect([...scheduler.scheduled.keys()].sort()).toEqual([
      'autre-chose',
      'demande_rpe:w-1',
      'ta_semaine:2026-07-20',
    ]);
  });
});

describe('scheduleOnce', () => {
  it('ne replanifie pas un id déjà posé (pas de doublon de demande RPE)', async () => {
    const scheduler = createMockNotificationScheduler();
    expect(await scheduleOnce(scheduler, notification('demande_rpe:w-1'))).toBe(true);
    expect(await scheduleOnce(scheduler, notification('demande_rpe:w-1'))).toBe(false);
    expect(scheduler.scheduled.size).toBe(1);
  });
});

describe('cancelNotificationsOfType', () => {
  it('annule toutes les notifications d’un type (préférence coupée)', async () => {
    const scheduler = createMockNotificationScheduler();
    await scheduler.schedule(notification('demande_rpe:w-1'));
    await scheduler.schedule(notification('demande_rpe:w-2'));
    await scheduler.schedule(notification('ta_semaine:2026-07-20'));
    const cancelled = await cancelNotificationsOfType(scheduler, 'demande_rpe');
    expect(cancelled.sort()).toEqual(['demande_rpe:w-1', 'demande_rpe:w-2']);
    expect([...scheduler.scheduled.keys()]).toEqual(['ta_semaine:2026-07-20']);
  });
});
