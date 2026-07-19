import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Button, colors, spacing, TextField, typography } from '@/ui';

import { useJournalStore } from './journal-store';

/** Parse une saisie française (« 8,2 ») en nombre positif, sinon undefined. */
function parsePositive(raw: string): number | undefined {
  if (raw.trim() === '') {
    return undefined;
  }
  const parsed = Number(raw.trim().replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Saisie manuelle d'une séance (E6-6) — mode 100 % déclaratif sans montre :
 * durée (obligatoire), distance et RPE optionnels.
 */
export function ManualWorkoutScreen() {
  const { t } = useTranslation();
  const addManualWorkout = useJournalStore((state) => state.addManualWorkout);
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [rpe, setRpe] = useState('');
  const [showError, setShowError] = useState(false);

  const save = () => {
    const durationMin = parsePositive(duration);
    const rpeValue = rpe.trim() === '' ? undefined : Number(rpe.trim());
    if (durationMin === undefined) {
      setShowError(true);
      return;
    }
    const ok = addManualWorkout({
      startedAt: new Date().toISOString(),
      durationMin,
      distanceKm: parsePositive(distance),
      rpe: rpeValue,
    });
    if (!ok) {
      setShowError(true);
      return;
    }
    router.back();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.caption}>{t('manualWorkout.intro')}</Text>
      <TextField
        value={duration}
        onChangeText={setDuration}
        label={t('manualWorkout.duration')}
        placeholder={t('manualWorkout.durationPlaceholder')}
        unit={t('manualWorkout.durationUnit')}
        keyboardType="number-pad"
      />
      <TextField
        value={distance}
        onChangeText={setDistance}
        label={t('manualWorkout.distance')}
        placeholder={t('manualWorkout.distancePlaceholder')}
        unit={t('manualWorkout.distanceUnit')}
        keyboardType="decimal-pad"
      />
      <TextField
        value={rpe}
        onChangeText={setRpe}
        label={t('manualWorkout.rpe')}
        placeholder={t('manualWorkout.rpePlaceholder')}
        keyboardType="number-pad"
      />
      <Text style={styles.caption}>{t('manualWorkout.rpeHint')}</Text>
      {showError ? <Text style={styles.error}>{t('manualWorkout.invalid')}</Text> : null}
      <Button label={t('manualWorkout.save')} onPress={save} />
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
  caption: {
    color: colors.textFaint,
    fontSize: typography.caption.fontSize,
  },
  error: {
    // Le rouge `danger` est réservé aux pics de charge (règle n°4) :
    // les erreurs de formulaire s'affichent en `warn`.
    color: colors.warn,
    fontSize: typography.body.fontSize,
  },
});
