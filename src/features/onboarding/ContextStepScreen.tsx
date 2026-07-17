import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Chip, colors, Label, spacing, TextField, typography } from '@/ui';

import { useOnboardingStore } from './onboarding-store';
import { StepScreen } from './StepScreen';

const SESSIONS_CHOICES = [2, 3, 4, 5, 6] as const;
const DAY_KEYS = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6'] as const;

/** Parse une saisie française (« 25,5 ») en nombre positif, sinon undefined. */
function parsePositive(raw: string): number | undefined {
  if (raw.trim() === '') {
    return undefined;
  }
  const parsed = Number(raw.trim().replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * OB3 — Contexte d'entraînement (E1-4) : séances/sem (minimum 2 — en
 * dessous, le moteur refuse de générer), jours disponibles lun→dim,
 * volume hebdo pré-rempli depuis l'import santé sinon saisi.
 */
export function ContextStepScreen() {
  const { t } = useTranslation();
  const context = useOnboardingStore((state) => state.context);
  const suggestedVolume = useOnboardingStore((state) => state.health.suggestedWeeklyVolumeKm);
  const submitContext = useOnboardingStore((state) => state.submitContext);
  const skipContext = useOnboardingStore((state) => state.skipContext);

  const [sessions, setSessions] = useState(context.sessionsPerWeek);
  const [days, setDays] = useState<number[]>(context.preferredDays);
  const prefilled = context.weeklyVolumeKm ?? suggestedVolume;
  const [volumeRaw, setVolumeRaw] = useState(
    prefilled === undefined ? '' : String(prefilled).replace('.', ','),
  );
  const [showError, setShowError] = useState(false);

  const toggleDay = (day: number) => {
    setDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day],
    );
  };

  const submit = () => {
    const result = submitContext({
      sessionsPerWeek: sessions,
      preferredDays: days,
      weeklyVolumeKm: parsePositive(volumeRaw),
    });
    if (result === 'ok') {
      router.push('/onboarding/objectif');
    } else {
      setShowError(true);
    }
  };

  const skip = () => {
    skipContext();
    router.push('/onboarding/objectif');
  };

  return (
    <StepScreen title={t('onboarding.contexte.title')}>
      <Label>{t('onboarding.contexte.sessionsLabel')}</Label>
      <View style={styles.chipRow}>
        {SESSIONS_CHOICES.map((n) => (
          <Chip key={n} label={String(n)} selected={sessions === n} onPress={() => setSessions(n)} />
        ))}
      </View>
      <Text style={styles.caption}>{t('onboarding.contexte.sessionsHint')}</Text>

      <Label>{t('onboarding.contexte.daysLabel')}</Label>
      <View style={styles.chipRow}>
        {DAY_KEYS.map((key, day) => (
          <Chip
            key={key}
            label={t(`onboarding.days.${key}`)}
            selected={days.includes(day)}
            onPress={() => toggleDay(day)}
          />
        ))}
      </View>

      <TextField
        value={volumeRaw}
        onChangeText={setVolumeRaw}
        label={t('onboarding.contexte.volumeLabel')}
        placeholder={t('onboarding.contexte.volumePlaceholder')}
        unit={t('onboarding.contexte.volumeUnit')}
        keyboardType="decimal-pad"
      />
      {suggestedVolume !== undefined ? (
        <Text style={styles.caption}>{t('onboarding.contexte.volumePrefilled')}</Text>
      ) : null}

      {showError ? <Text style={styles.warn}>{t('onboarding.contexte.invalid')}</Text> : null}

      <Button label={t('onboarding.contexte.continue')} onPress={submit} />
      <Button label={t('onboarding.skip')} onPress={skip} variant="ghost" />
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.cardGap,
  },
  caption: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    lineHeight: 17,
  },
  warn: {
    color: colors.warn,
    fontSize: typography.body.fontSize,
  },
});
