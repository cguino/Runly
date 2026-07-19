import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from './theme';

type CardProps = {
  children: ReactNode;
  /** Carte imbriquée : rayon 14, fond `surface-2` (charte §3). */
  nested?: boolean;
  /** Bordure `action` (carte de répétition active, charte §3). */
  active?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Carte de base (charte §3) : `surface`, rayon 20, bordure 1 px discrète. */
export function Card({ children, nested = false, active = false, style }: CardProps) {
  return (
    <View style={[styles.card, nested && styles.nested, active && styles.active, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPadding,
    gap: spacing.cardGap,
  },
  nested: {
    backgroundColor: colors.surface2,
    borderRadius: radii.cardNested,
  },
  active: {
    borderColor: colors.action,
  },
});
