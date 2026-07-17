import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '@/ui';

type StepScreenProps = {
  title: string;
  /** Corps introductif optionnel sous le titre. */
  intro?: string;
  children: ReactNode;
};

/** Gabarit commun des écrans d'onboarding : titre H1 + contenu scrollable. */
export function StepScreen({ title, intro, children }: StepScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      {intro ? <Text style={styles.intro}>{intro}</Text> : null}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.screenGutter,
    paddingTop: spacing.screenGutter * 2,
    paddingBottom: spacing.screenGutter * 2,
    gap: spacing.cardGap,
  },
  title: {
    color: colors.text,
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
  },
  intro: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    lineHeight: 22,
  },
});
