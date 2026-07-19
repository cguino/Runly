import { StyleSheet, Text, View } from 'react-native';

import { Label } from './Label';
import { colors, radii, spacing, typography } from './theme';

type StatCardProps = {
  label: string;
  value: string;
  /** Précision optionnelle sous la valeur (unité longue, contexte). */
  caption?: string;
};

/** Stat-card (charte §4) : label MAJUSCULES + valeur H2 `tabular-nums`. */
export function StatCard({ label, value, caption }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Label>{label}</Label>
      <Text style={styles.value}>{value}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

/** Trio de stat-cards égales : Distance / Durée / Charge (charte §4). */
export function StatCardTrio({ items }: { items: [StatCardProps, StatCardProps, StatCardProps] }) {
  return (
    <View style={styles.trio}>
      {items.map((item) => (
        <View key={item.label} style={styles.trioItem}>
          <StatCard {...item} />
        </View>
      ))}
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
    gap: 4,
  },
  value: {
    color: colors.text,
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    fontVariant: ['tabular-nums'],
  },
  caption: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  trio: {
    flexDirection: 'row',
    gap: spacing.cardGap,
  },
  trioItem: {
    flex: 1,
  },
});
