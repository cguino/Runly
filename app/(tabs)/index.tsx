import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/ui';

export default function HomeScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{t('screens.home.title')}</Text>
      <Link href="/manual-workout" style={styles.rowLink}>
        <Text style={styles.rowLabel}>{t('screensHome.addManualWorkout')}</Text>
      </Link>
      <Text style={styles.caption}>{t('screens.home.placeholder')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.screenGutter,
    gap: spacing.cardGap,
  },
  title: {
    color: colors.text,
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
    marginBottom: spacing.cardGap,
  },
  rowLink: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPadding,
  },
  rowLabel: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  caption: {
    color: colors.textFaint,
    fontSize: typography.caption.fontSize,
  },
});
