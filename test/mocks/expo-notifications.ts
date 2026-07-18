/**
 * Mock jest d'expo-notifications : le module natif ne se charge pas sous
 * Node. Implémente le sous-ensemble utilisé par l'adaptateur
 * (`src/services/notifications/expo-scheduler.ts`), en mémoire.
 * Mappé via `moduleNameMapper` (package.json).
 */

type StoredRequest = {
  identifier: string;
  content: { title: string; body: string; data: Record<string, unknown> };
  trigger: unknown;
};

const scheduled = new Map<string, StoredRequest>();

export const SchedulableTriggerInputTypes = {
  CALENDAR: 'calendar',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  DATE: 'date',
  TIME_INTERVAL: 'timeInterval',
} as const;

export const AndroidImportance = {
  UNKNOWN: 0,
  UNSPECIFIED: 1,
  NONE: 2,
  MIN: 3,
  LOW: 4,
  DEFAULT: 5,
  HIGH: 6,
  MAX: 7,
} as const;

export function setNotificationHandler(): void {
  // no-op en test
}

export function setNotificationChannelAsync(): Promise<null> {
  return Promise.resolve(null);
}

export function getPermissionsAsync(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  return Promise.resolve({ granted: true, canAskAgain: true });
}

export function requestPermissionsAsync(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  return Promise.resolve({ granted: true, canAskAgain: true });
}

export function scheduleNotificationAsync(request: {
  identifier: string;
  content: { title: string; body: string; data?: Record<string, unknown> };
  trigger: unknown;
}): Promise<string> {
  scheduled.set(request.identifier, {
    identifier: request.identifier,
    content: { ...request.content, data: request.content.data ?? {} },
    trigger: request.trigger,
  });
  return Promise.resolve(request.identifier);
}

export function getAllScheduledNotificationsAsync(): Promise<StoredRequest[]> {
  return Promise.resolve([...scheduled.values()]);
}

export function cancelScheduledNotificationAsync(identifier: string): Promise<void> {
  scheduled.delete(identifier);
  return Promise.resolve();
}

export function addNotificationResponseReceivedListener(): { remove: () => void } {
  return { remove: () => undefined };
}

/** Réservé aux tests : remise à zéro de l'état planifié. */
export function __resetScheduledForTests(): void {
  scheduled.clear();
}
