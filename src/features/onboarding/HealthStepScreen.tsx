import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text } from 'react-native';

import { createDefaultHealthAdapter } from '@/services';
import { Button, Card, colors, Pill, typography } from '@/ui';

import { useOnboardingStore } from './onboarding-store';
import { StepScreen } from './StepScreen';

/**
 * OB1 — Connexion santé (E1-1, E1-2) : pré-explication AVANT tout prompt
 * système (jamais de prompt à froid), minimisation des données expliquée.
 * Refus / « Plus tard » → mode 100 % déclaratif, l'app reste fonctionnelle.
 */
export function HealthStepScreen() {
  const { t } = useTranslation();
  const health = useOnboardingStore((state) => state.health);
  const connectHealth = useOnboardingStore((state) => state.connectHealth);
  const skipHealth = useOnboardingStore((state) => state.skipHealth);
  const [phase, setPhase] = useState<'intro' | 'result'>('intro');
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    setBusy(true);
    try {
      await connectHealth({
        adapter: createDefaultHealthAdapter(),
        today: new Date().toISOString().slice(0, 10),
      });
      setPhase('result');
    } finally {
      setBusy(false);
    }
  };

  const later = () => {
    skipHealth();
    router.push('/onboarding/profil');
  };

  if (phase === 'result') {
    const imported = health.importedCount;
    return (
      <StepScreen title={t('onboarding.sante.title')}>
        {health.permission === 'denied' ? (
          <Text style={styles.body}>{t('onboarding.sante.denied')}</Text>
        ) : (
          <Text style={styles.body}>
            {imported > 0
              ? t('onboarding.sante.imported', { count: imported })
              : t('onboarding.sante.importedNone')}
          </Text>
        )}
        {health.calibrating ? (
          <Card>
            <Pill label={t('onboarding.sante.calibrationPill')} variant="warn" />
            <Text style={styles.caption}>{t('onboarding.sante.calibrationHint')}</Text>
          </Card>
        ) : null}
        <Button
          label={t('onboarding.sante.continue')}
          onPress={() => router.push('/onboarding/profil')}
        />
      </StepScreen>
    );
  }

  return (
    <StepScreen title={t('onboarding.sante.title')} intro={t('onboarding.sante.body')}>
      <Card>
        <Text style={styles.body}>{t('onboarding.sante.privacy')}</Text>
        <Text style={styles.caption}>{t('onboarding.sante.promptNotice')}</Text>
      </Card>
      <Button label={t('onboarding.sante.connect')} onPress={connect} disabled={busy} />
      <Button label={t('onboarding.sante.later')} onPress={later} variant="ghost" />
      <Text style={styles.hint}>{t('onboarding.sante.laterHint')}</Text>
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    lineHeight: 22,
  },
  caption: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    lineHeight: 17,
  },
  hint: {
    color: colors.textFaint,
    fontSize: typography.caption.fontSize,
    lineHeight: 17,
  },
});
