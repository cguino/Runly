import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import '@/i18n';
import { initMonitoring } from '@/services';
import { colors } from '@/ui';

initMonitoring();

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
