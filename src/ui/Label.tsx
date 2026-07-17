import { StyleSheet, Text } from 'react-native';

import { colors, typography } from './theme';

/** Label de section MAJUSCULES (charte §2) : « STRUCTURE DE LA SÉANCE ». */
export function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    color: colors.textMuted,
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
    textTransform: typography.label.textTransform,
  },
});
