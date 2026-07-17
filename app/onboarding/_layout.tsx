import { Stack } from 'expo-router';

import { colors } from '@/ui';

/**
 * Stack de l'onboarding (Lot 4, mermaid OB1→OB5) : santé → profil →
 * contexte → objectif → compte → restitution. Pas de header : chaque écran
 * porte son titre ; le retour se fait par le geste natif.
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
