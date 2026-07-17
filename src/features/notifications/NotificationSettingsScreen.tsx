import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { NOTIFICATION_TYPES } from '@/services';
import type { NotificationType } from '@/services';
import { colors, radii, spacing, typography } from '@/ui';

import { useNotificationPrefsStore } from './notification-prefs-store';

/**
 * Préférences de notification (E9-1) : un interrupteur par type, persisté.
 * Accessible depuis Profil. D15 assumé dans le wording : pas de streaks ni
 * de relance culpabilisante — Runly informe, l'utilisateur décide.
 */
export function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const prefs = useNotificationPrefsStore((state) => state.prefs);
  const setPref = useNotificationPrefsStore((state) => state.setPref);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>{t('notifications.settings.intro')}</Text>
      {NOTIFICATION_TYPES.map((type: NotificationType) => (
        <View key={type} style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>{t(`notifications.settings.types.${type}.label`)}</Text>
            <Text style={styles.rowDescription}>
              {t(`notifications.settings.types.${type}.description`)}
            </Text>
          </View>
          <Switch
            accessibilityLabel={t(`notifications.settings.types.${type}.label`)}
            value={prefs[type]}
            onValueChange={(enabled) => setPref(type, enabled)}
            trackColor={{ false: colors.border, true: colors.action }}
            thumbColor={colors.text}
          />
        </View>
      ))}
      <Text style={styles.noPressure}>{t('notifications.settings.noPressure')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.screenGutter,
    gap: spacing.cardGap,
  },
  intro: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.cardGap,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPadding,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  rowLabel: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  rowDescription: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  noPressure: {
    color: colors.textFaint,
    fontSize: typography.caption.fontSize,
  },
});
