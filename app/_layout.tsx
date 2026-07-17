import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import '@/i18n';
import { initNotifications } from '@/features/notifications';
import { useOnboardingStore } from '@/features/onboarding';
import { initMonitoring } from '@/services';
import { colors } from '@/ui';

initMonitoring();

export default function RootLayout() {
  const { t } = useTranslation();
  // Notifications locales (Lot 9) : resynchronisation + abonnements stores.
  useEffect(() => initNotifications(), []);
  // Tant que l'onboarding n'est pas complété, il est la seule racine
  // accessible (reprise à l'étape courante) ; ensuite les 4 tabs (D2, E1-7).
  const onboardingCompleted = useOnboardingStore((state) => state.completed);
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Protected guard={onboardingCompleted}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!onboardingCompleted}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Screen
          name="physio-references"
          options={{
            headerShown: true,
            title: t('physio.title'),
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="manual-workout"
          options={{
            headerShown: true,
            presentation: 'modal',
            title: t('manualWorkout.title'),
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="gauge-info"
          options={{
            headerShown: true,
            title: t('gauge.info.title'),
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="notification-settings"
          options={{
            headerShown: true,
            title: t('notifications.settings.title'),
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="player"
          options={{
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="rpe-entry"
          options={{
            headerShown: true,
            presentation: 'modal',
            title: t('rpe.title'),
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="ui-gallery"
          options={{
            headerShown: true,
            title: t('gallery.title'),
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerShadowVisible: false,
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
