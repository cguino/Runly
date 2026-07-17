import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import { formatDecimal } from '@/i18n';
import type { GaugeStatus } from '@/training-engine';
import type { PillVariant } from '@/ui';
import { Card, colors, Gauge, Label, Pill, spacing, typography } from '@/ui';

import { useLoadStore } from './load-store';

/**
 * Carte Accueil de la jauge ACWR (charte §4) : jauge + valeur, pill de
 * statut, caption d'explication + lien « Comment ça marche ? ».
 * État calibration = affichage dédié : jauge estompée sans aiguille,
 * badge `warn` (valeur estimée / en calibration, charte §5).
 * Aucune règle métier ici : tout vient du store (→ training-engine).
 */

const PILL_VARIANTS: Record<GaugeStatus, PillVariant> = {
  calibration: 'warn',
  sous_charge: 'info',
  favorable: 'positive',
  pic: 'danger',
};

export function LoadGaugeCard() {
  const { t } = useTranslation();
  const current = useLoadStore((state) => state.current);
  const forecast = useLoadStore((state) => state.forecast);

  const status = current?.status ?? 'calibration';
  const isCalibrating = status === 'calibration';
  const acwr = isCalibrating ? undefined : current?.acwr;
  const forecastAcwr = isCalibrating ? undefined : forecast?.acwr;

  return (
    <Card style={styles.card}>
      <Label>{t('load.title')}</Label>
      <Gauge
        acwr={acwr}
        valueLabel={acwr === undefined ? t('gauge.empty') : formatDecimal(acwr)}
        forecastAcwr={forecastAcwr}
        dimmed={isCalibrating}
        accessibilityLabel={t('gauge.a11y', { status: t(`gauge.status.${status}`) })}
      />
      <Pill label={t(`gauge.status.${status}`)} variant={PILL_VARIANTS[status]} />
      {forecastAcwr !== undefined && (
        <Text style={styles.forecast}>
          {t('gauge.forecast', { value: formatDecimal(forecastAcwr) })}
        </Text>
      )}
      <Text style={styles.caption}>{t(`gauge.caption.${status}`)}</Text>
      <Link href="/gauge-info" style={styles.link} accessibilityRole="link">
        {t('gauge.howItWorks')}
      </Link>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
  },
  forecast: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  caption: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    textAlign: 'center',
    paddingHorizontal: spacing.cardPadding,
  },
  link: {
    color: colors.action,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    minHeight: 48,
    textAlignVertical: 'center',
    verticalAlign: 'middle',
  },
});
