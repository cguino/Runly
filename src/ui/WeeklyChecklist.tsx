import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from './Chip';
import { colors, typography } from './theme';

export type WeeklyChecklistItem = {
  /** Jour affiché (« Lun », « Mar »…) — déjà traduit. */
  day: string;
  title: string;
  tag?: string;
  done: boolean;
};

type WeeklyChecklistProps = {
  items: WeeklyChecklistItem[];
  onToggle?: (index: number) => void;
};

/**
 * Checklist hebdo (charte §4) : case cochée = carré arrondi vert avec check,
 * à cocher = carré `surface-2`. Ligne : jour · séance en 600, tag à droite.
 */
export function WeeklyChecklist({ items, onToggle }: WeeklyChecklistProps) {
  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <Pressable
          key={`${item.day}-${index}`}
          accessibilityRole={onToggle ? 'checkbox' : undefined}
          accessibilityState={onToggle ? { checked: item.done } : undefined}
          disabled={!onToggle}
          onPress={() => onToggle?.(index)}
          style={styles.row}
        >
          <View style={[styles.box, item.done && styles.boxDone]}>
            {item.done ? <Text style={styles.check}>✓</Text> : null}
          </View>
          <Text style={styles.label} numberOfLines={1}>
            <Text style={styles.day}>{item.day}</Text> · {item.title}
          </Text>
          {item.tag ? <Chip label={item.tag} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 28,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxDone: {
    backgroundColor: colors.positive,
  },
  check: {
    color: colors.bg,
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  day: {
    color: colors.textMuted,
  },
});
