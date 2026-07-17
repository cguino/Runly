/**
 * `src/services/notifications` (Lot 9, E9) — notifications locales :
 * planification pure (`planning.ts`), contenus (`content.ts`),
 * synchronisation idempotente (`service.ts`) et adaptateur fin
 * expo-notifications (`expo-scheduler.ts`).
 */
export { DEFAULT_NOTIFICATION_PREFS, NOTIFICATION_TYPES, notificationTypeOfId } from './types';
export type {
  LocalDateTime,
  NotificationContent,
  NotificationPrefs,
  NotificationType,
  PlannedNotification,
} from './types';
export {
  rpeRequestContent,
  sessionReminderContent,
  weeklyKickoffContent,
  weeklyRecapContent,
} from './content';
export {
  addMinutesLocal,
  buildNotificationPlan,
  dateToLocalDateTime,
  nextWeekdayAt,
  NOTIFICATION_SCHEDULE,
  planRpeRequest,
  planSessionReminders,
  planWeeklyKickoff,
  planWeeklyRecapNotification,
  REMINDER_HORIZON_DAYS,
  RPE_REQUEST_DELAY_MIN,
} from './planning';
export type { PlannedSessionLite } from './planning';
export { createMockNotificationScheduler } from './scheduler';
export type { NotificationScheduler } from './scheduler';
export {
  cancelNotificationsOfType,
  RECURRING_NOTIFICATION_TYPES,
  scheduleOnce,
  syncScheduledNotifications,
} from './service';
export {
  addNotificationResponseListener,
  configureNotifications,
  createExpoNotificationScheduler,
  ensureNotificationPermission,
  localDateTimeToDate,
} from './expo-scheduler';
