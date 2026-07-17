import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { Alert } from '@/schemas';
import { Button, Card, colors, typography } from '@/ui';

import { useLoadStore } from './load-store';

/**
 * Bannière d'alerte charge sur l'Accueil (E7-4, spec §7.6) : message +
 * action 1 tap (« Adapter ma semaine ») + « Garder mon plan ». La décision
 * est tracée dans le store — l'app avertit, n'interdit jamais.
 * Le rouge `danger` est réservé au pic de charge (charte §1).
 * Les codes du moteur sont traduits ici via i18n (jamais de texte côté moteur).
 */

type AlertBannerProps = {
  alert: Alert;
};

export function AlertBanner({ alert }: AlertBannerProps) {
  const { t } = useTranslation();
  const decideAlert = useLoadStore((state) => state.decideAlert);

  const context = alert.triggerContext;
  const isPeak = alert.alertType === 'pic_charge';

  return (
    <Card style={isPeak ? styles.peakCard : undefined}>
      <Text style={[styles.title, isPeak && styles.peakTitle]}>
        {t(`load.alerts.title.${alert.alertType}`)}
      </Text>
      <Text style={styles.body}>
        {t(`load.alerts.body.${alert.alertType}`, {
          pct: context.loadIncreasePct ?? 0,
          rpe: Math.min(...(context.lastRpes ?? [0])),
        })}
      </Text>
      <View style={styles.actions}>
        <Button label={t('load.alerts.accept')} onPress={() => decideAlert('accepted')} />
        <Button
          label={t('load.alerts.keep')}
          variant="ghost"
          onPress={() => decideAlert('kept_plan')}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  peakCard: {
    borderColor: colors.danger,
  },
  title: {
    color: colors.text,
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
  },
  peakTitle: {
    color: colors.danger,
  },
  body: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    lineHeight: 22,
  },
  actions: {
    gap: 8,
  },
});
