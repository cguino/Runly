import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from './theme';

export type PillVariant = 'positive' | 'warn' | 'muted' | 'danger' | 'info';

/**
 * Pill de statut (charte §4) : fond sémantique à 12 %, texte couleur pleine.
 * `warn` marque les valeurs estimées / par défaut (charte §5).
 * `danger` (pic de charge — usage réservé, charte §1) et `info` (sous-charge
 * de la jauge) : fond plein + texte sombre, le motif 12 % passe sous le
 * contraste AA pour ces teintes (paires vérifiées par `yarn check:contrast`).
 */
const VARIANTS: Record<PillVariant, { backgroundColor: string; color: string }> = {
  positive: { backgroundColor: colors.positiveBg, color: colors.positive },
  warn: { backgroundColor: colors.warnBg, color: colors.warn },
  muted: { backgroundColor: colors.surface2, color: colors.textMuted },
  danger: { backgroundColor: colors.danger, color: colors.onAction },
  info: { backgroundColor: colors.infoLoad, color: colors.onAction },
};

type PillProps = {
  label: string;
  variant: PillVariant;
};

export function Pill({ label, variant }: PillProps) {
  const palette = VARIANTS[variant];
  return (
    <View style={[styles.pill, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.label, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
