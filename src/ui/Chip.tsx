import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii } from './theme';

type ChipProps = {
  label: string;
  /** État sélectionné (chips de choix : jours, distance, ambition…). */
  selected?: boolean;
  /** Rend le chip pressable (touch target ≥ 48 px, charte §6). */
  onPress?: () => void;
};

/**
 * Tag de séance (charte §4) : « QUALITÉ », « RPE 4 » — `surface-2`,
 * MAJUSCULES 11 px muted. Avec `onPress`, devient un chip de sélection
 * (bordure + texte `action` quand sélectionné). Pour les statuts colorés,
 * voir `Pill`.
 */
export function Chip({ label, selected = false, onPress }: ChipProps) {
  const content = (
    <View style={[styles.chip, selected && styles.selected]}>
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </View>
  );
  if (onPress === undefined) {
    return content;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.surface2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.surface2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  selected: {
    borderColor: colors.action,
  },
  label: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  selectedLabel: {
    color: colors.action,
  },
  pressed: {
    opacity: 0.8,
  },
});
