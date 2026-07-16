import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/ui';

export default function ProfileScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{t('screens.profile.title')}</Text>
      <Link href="/physio-references" style={styles.rowLink}>
        <View style={styles.rowContent}>
          <Text style={styles.rowLabel}>{t('screens.profile.physioLink')}</Text>
          <Text style={styles.rowHint}>{t('screens.profile.physioLinkHint')}</Text>
        </View>
      </Link>
      {__DEV__ ? (
        <Link href="/ui-gallery" style={styles.rowLink}>
          <View style={styles.rowContent}>
            <Text style={styles.rowLabel}>{t('gallery.devLink')}</Text>
          </View>
        </Link>
      ) : null}
      <Text style={styles.caption}>{t('screens.profile.placeholder')}</Text>
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
  rowContent: {
    gap: 4,
  },
  rowLabel: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  rowHint: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  caption: {
    color: colors.textFaint,
    fontSize: typography.caption.fontSize,
  },
});
