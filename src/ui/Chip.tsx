import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from './theme';

/**
 * Tag de séance (charte §4) : « QUALITÉ », « RPE 4 » — `surface-2`,
 * MAJUSCULES 11 px muted. Pour les statuts colorés, voir `Pill`.
 */
export function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.surface2,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
});
