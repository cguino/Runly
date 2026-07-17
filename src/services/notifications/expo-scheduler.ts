import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { NotificationScheduler } from './scheduler';
import type { LocalDateTime } from './types';

/**
 * Adaptateur fin expo-notifications (Lot 9) : aucune logique métier ici —
 * la planification (dates, contenus, dédoublonnage) vit dans les fonctions
 * pures de `planning.ts`/`service.ts`, testées sans module natif.
 */

/**
 * Instant local « mur » → `Date` du fuseau courant du device : un lundi 8 h
 * planifié reste un lundi 8 h locale, quel que soit le fuseau.
 */
export function localDateTimeToDate(at: LocalDateTime): Date {
  const [year, month, day] = at.date.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, at.hour, at.minute, 0, 0);
}

/** Canal Android par défaut (importance normale : pas de son insistant, D15). */
const ANDROID_CHANNEL_ID = 'default';

/**
 * Initialisation une fois au démarrage : comportement au premier plan
 * (bannière discrète, pas de son) et canal Android.
 */
export async function configureNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Runly',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/** Permission notifications : demandée seulement s'il y a quelque chose à planifier. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  if (!current.canAskAgain) {
    return false;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/**
 * Écoute les taps sur notification et relaie l'`url` embarquée (route
 * expo-router), si présente. Retourne la fonction de désabonnement.
 */
export function addNotificationResponseListener(onUrl: (url: string) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const url: unknown = response.notification.request.content.data?.url;
    if (typeof url === 'string' && url.startsWith('/')) {
      onUrl(url);
    }
  });
  return () => subscription.remove();
}

export function createExpoNotificationScheduler(): NotificationScheduler {
  return {
    getScheduledIds: async () => {
      const requests = await Notifications.getAllScheduledNotificationsAsync();
      return requests.map((request) => request.identifier);
    },
    schedule: async (notification) => {
      await Notifications.scheduleNotificationAsync({
        identifier: notification.id,
        content: {
          title: notification.content.title,
          body: notification.content.body,
          sound: false,
          data: notification.url === undefined ? {} : { url: notification.url },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: localDateTimeToDate(notification.fireAt),
          channelId: ANDROID_CHANNEL_ID,
        },
      });
    },
    cancel: async (id) => {
      await Notifications.cancelScheduledNotificationAsync(id);
    },
  };
}
