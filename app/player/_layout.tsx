import { Stack } from 'expo-router';

import { colors } from '@/ui';

/** Pile du player (Lot 6) — modal plein écran, header masqué (charte §4). */
export default function PlayerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        // On ne quitte pas une séance d'un geste : sortie via les contrôles.
        gestureEnabled: false,
      }}
    />
  );
}
