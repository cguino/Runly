import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_NOTIFICATION_PREFS } from '@/services/notifications/types';

import {
  NOTIFICATION_PREFS_STORAGE_KEY,
  useNotificationPrefsStore,
} from '../notification-prefs-store';

/**
 * Préférences par type (E9-1) : défauts tout activé, bascule individuelle,
 * persistance AsyncStorage.
 */

describe('useNotificationPrefsStore', () => {
  beforeEach(() => {
    useNotificationPrefsStore.setState({ prefs: { ...DEFAULT_NOTIFICATION_PREFS } });
  });

  it('démarre avec tous les types activés', () => {
    expect(useNotificationPrefsStore.getState().prefs).toEqual({
      ta_semaine: true,
      rappel_seance: true,
      demande_rpe: true,
      recap_hebdo: true,
    });
  });

  it('désactive un type sans toucher les autres', () => {
    useNotificationPrefsStore.getState().setPref('demande_rpe', false);
    expect(useNotificationPrefsStore.getState().prefs).toEqual({
      ta_semaine: true,
      rappel_seance: true,
      demande_rpe: false,
      recap_hebdo: true,
    });
  });

  it('persiste les préférences dans AsyncStorage', async () => {
    useNotificationPrefsStore.getState().setPref('recap_hebdo', false);
    // La persistance zustand écrit de façon asynchrone.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const raw = await AsyncStorage.getItem(NOTIFICATION_PREFS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const persisted = JSON.parse(raw ?? '{}') as { state?: { prefs?: Record<string, boolean> } };
    expect(persisted.state?.prefs?.recap_hebdo).toBe(false);
  });
});
