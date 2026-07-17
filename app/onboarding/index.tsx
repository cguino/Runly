import { Redirect } from 'expo-router';

import { useOnboardingStore } from '@/features/onboarding';

/** Reprise de l'onboarding là où on s'est arrêté (E1-7). */
export default function OnboardingIndex() {
  const currentStep = useOnboardingStore((state) => state.currentStep);
  return <Redirect href={`/onboarding/${currentStep}`} />;
}
