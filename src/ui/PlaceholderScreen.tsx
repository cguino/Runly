import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from './theme';

type PlaceholderScreenProps = {
  title: string;
  subtitle: string;
};

/**
 * Écran vide provisoire des 4 onglets du Lot 0.
 * Les strings arrivent déjà traduites (règle transverse n°3 :
 * pas de texte en dur dans les composants).
 */
export function PlaceholderScreen({ title, subtitle }: PlaceholderScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screenGutter,
    gap: spacing.cardGap,
  },
  title: {
    color: colors.text,
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    textAlign: 'center',
  },
});
