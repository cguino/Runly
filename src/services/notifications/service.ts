import type { NotificationScheduler } from './scheduler';
import { notificationTypeOfId } from './types';
import type { NotificationType, PlannedNotification } from './types';

/**
 * Synchronisation du plan de notifications avec l'OS (Lot 9) : idempotente
 * grâce aux ids stables — replanifier deux fois ne crée aucun doublon, et
 * les notifications devenues obsolètes (préférence coupée, plan modifié)
 * sont annulées. Ne gère que les types listés dans `managedTypes` : les
 * demandes de RPE, événementielles, vivent hors du plan récurrent.
 */

/** Types gérés par la synchronisation récurrente (les autres sont laissés en place). */
export const RECURRING_NOTIFICATION_TYPES: readonly NotificationType[] = [
  'ta_semaine',
  'rappel_seance',
  'recap_hebdo',
];

export async function syncScheduledNotifications(
  scheduler: NotificationScheduler,
  desired: PlannedNotification[],
  managedTypes: readonly NotificationType[] = RECURRING_NOTIFICATION_TYPES,
): Promise<{ scheduledIds: string[]; cancelledIds: string[] }> {
  const existingIds = new Set(await scheduler.getScheduledIds());
  const desiredIds = new Set(desired.map((notification) => notification.id));

  const cancelledIds: string[] = [];
  for (const id of existingIds) {
    const type = notificationTypeOfId(id);
    if (type !== undefined && managedTypes.includes(type) && !desiredIds.has(id)) {
      await scheduler.cancel(id);
      cancelledIds.push(id);
    }
  }

  const scheduledIds: string[] = [];
  for (const notification of desired) {
    if (existingIds.has(notification.id)) {
      // Le contenu peut avoir évolué (récap recalculé) : on remplace.
      await scheduler.cancel(notification.id);
    }
    await scheduler.schedule(notification);
    scheduledIds.push(notification.id);
  }

  return { scheduledIds, cancelledIds };
}

/** Planifie une notification événementielle si son id n'est pas déjà posé (pas de doublon). */
export async function scheduleOnce(
  scheduler: NotificationScheduler,
  notification: PlannedNotification,
): Promise<boolean> {
  const existingIds = await scheduler.getScheduledIds();
  if (existingIds.includes(notification.id)) {
    return false;
  }
  await scheduler.schedule(notification);
  return true;
}

/** Annule toutes les notifications planifiées d'un type (préférence coupée). */
export async function cancelNotificationsOfType(
  scheduler: NotificationScheduler,
  type: NotificationType,
): Promise<string[]> {
  const existingIds = await scheduler.getScheduledIds();
  const targets = existingIds.filter((id) => notificationTypeOfId(id) === type);
  for (const id of targets) {
    await scheduler.cancel(id);
  }
  return targets;
}
