import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_NOTIFICATION_PREFS } from '@/services';
import type { NotificationPrefs, NotificationType } from '@/services';

/**
 * Préférences de notification par type (E9-1) : on/off individuel, tout
 * activé par défaut, persisté localement (AsyncStorage) — les préférences
 * survivent au redémarrage de l'app.
 */

type NotificationPrefsState = {
  prefs: NotificationPrefs;
  setPref: (type: NotificationType, enabled: boolean) => void;
};

export const NOTIFICATION_PREFS_STORAGE_KEY = 'runly.notification-prefs';

export const useNotificationPrefsStore = create<NotificationPrefsState>()(
  persist(
    (set) => ({
      prefs: DEFAULT_NOTIFICATION_PREFS,
      setPref: (type, enabled) => set((state) => ({ prefs: { ...state.prefs, [type]: enabled } })),
    }),
    {
      name: NOTIFICATION_PREFS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // Défauts fusionnés : un type ajouté plus tard arrive activé.
      merge: (persisted, current) => {
        const stored = (persisted as Partial<NotificationPrefsState> | undefined)?.prefs;
        return { ...current, prefs: { ...DEFAULT_NOTIFICATION_PREFS, ...stored } };
      },
    },
  ),
);
