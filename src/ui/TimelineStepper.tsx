import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from './theme';

export type TimelineStepState = 'done' | 'active' | 'todo';

export type TimelineStep = {
  title: string;
  /** Sous-texte muted : « durée · allure » (charte §4). */
  subtitle?: string;
  state: TimelineStepState;
};

const DOT_COLORS: Record<TimelineStepState, string> = {
  done: colors.positive,
  active: colors.action,
  todo: colors.surface2,
};

/**
 * Timeline de séance / de plan (charte §4) : stepper vertical, points reliés
 * par une ligne, point actif en `action`.
 */
export function TimelineStepper({ steps }: { steps: TimelineStep[] }) {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => (
        <View key={`${step.title}-${index}`} style={styles.row}>
          <View style={styles.rail}>
            <View style={[styles.dot, { backgroundColor: DOT_COLORS[step.state] }]} />
            {index < steps.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <View style={styles.body}>
            <Text style={[styles.title, step.state === 'todo' && styles.titleTodo]}>
              {step.title}
            </Text>
            {step.subtitle ? <Text style={styles.subtitle}>{step.subtitle}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rail: {
    alignItems: 'center',
    width: 14,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  body: {
    flex: 1,
    paddingBottom: 18,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  titleTodo: {
    color: colors.textMuted,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    fontVariant: ['tabular-nums'],
  },
});
