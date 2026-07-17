/**
 * `src/features/notifications` (Lot 9, E9) — préférences par type
 * (persistées), écran de réglages et câblage runtime des notifications
 * locales sur les stores (journal, charge).
 */
export {
  NOTIFICATION_PREFS_STORAGE_KEY,
  useNotificationPrefsStore,
} from './notification-prefs-store';
export { NotificationSettingsScreen } from './NotificationSettingsScreen';
export {
  getDefaultNotificationsRuntime,
  initNotifications,
  refreshScheduledNotifications,
  scheduleRpeRequestForWorkout,
} from './scheduling';
export type { NotificationsRuntime } from './scheduling';
