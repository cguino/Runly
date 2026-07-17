import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';

import '@/i18n';
import { initMonitoring } from '@/services';
import { colors } from '@/ui';

initMonitoring();

export default function RootLayout() {
  const { t } = useTranslation();
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
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
