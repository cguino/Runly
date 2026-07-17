import type { PlannedNotification } from './types';

/**
 * Abstraction du système de notifications locales (Lot 9) : la logique de
 * planification et de synchronisation ne connaît que cette interface —
 * expo-notifications n'est qu'un adaptateur fin (`expo-scheduler.ts`).
 */
export type NotificationScheduler = {
  /** Ids des notifications actuellement planifiées auprès de l'OS. */
  getScheduledIds: () => Promise<string[]>;
  schedule: (notification: PlannedNotification) => Promise<void>;
  cancel: (id: string) => Promise<void>;
};

/** Scheduler en mémoire pour les tests (aucun module natif). */
export function createMockNotificationScheduler(): NotificationScheduler & {
  scheduled: Map<string, PlannedNotification>;
} {
  const scheduled = new Map<string, PlannedNotification>();
  return {
    scheduled,
    getScheduledIds: () => Promise.resolve([...scheduled.keys()]),
    schedule: (notification) => {
      scheduled.set(notification.id, notification);
      return Promise.resolve();
    },
    cancel: (id) => {
      scheduled.delete(id);
      return Promise.resolve();
    },
  };
}
