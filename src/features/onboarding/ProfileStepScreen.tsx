import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Chip, colors, Label, spacing, TextField, typography } from '@/ui';

import { useOnboardingStore } from './onboarding-store';
import { parseFrDate } from './parse';
import { StepScreen } from './StepScreen';

/**
 * OB2 — Profil & antécédents (E1-3, D12) : prénom optionnel, date de
 * naissance (16 ans minimum — blocage doux, pas de contournement),
 * « pépins physiques » des 12 derniers mois → flag prudence du moteur.
 * Wording : jamais de pathologie nommée (note réglementaire).
 */
export function ProfileStepScreen() {
  const { t } = useTranslation();
  const submitProfile = useOnboardingStore((state) => state.submitProfile);
  const skipProfile = useOnboardingStore((state) => state.skipProfile);
  const ageBlocked = useOnboardingStore((state) => state.ageBlocked);

  const [firstName, setFirstName] = useState('');
  const [birthDateRaw, setBirthDateRaw] = useState('');
  const [hasInjury, setHasInjury] = useState(false);
  const [injuryNote, setInjuryNote] = useState('');
  const [error, setError] = useState<'invalid' | undefined>(undefined);

  const submit = () => {
    const raw = birthDateRaw.trim();
    const birthDate = raw === '' ? undefined : parseFrDate(raw);
    if (raw !== '' && birthDate === undefined) {
      setError('invalid');
      return;
    }
    setError(undefined);
    const result = submitProfile({
      firstName,
      birthDate,
      hasRecentInjury: hasInjury,
      injuryNote,
      today: new Date().toISOString().slice(0, 10),
    });
    if (result === 'ok') {
      router.push('/onboarding/contexte');
    } else if (result === 'invalid') {
      setError('invalid');
    }
    // 'under_min_age' : le message vient de `ageBlocked`, on reste sur l'étape.
  };

  const skip = () => {
    skipProfile();
    if (!useOnboardingStore.getState().ageBlocked) {
      router.push('/onboarding/contexte');
    }
  };

  return (
    <StepScreen title={t('onboarding.profil.title')}>
      <TextField
        value={firstName}
        onChangeText={setFirstName}
        label={t('onboarding.profil.firstName')}
        placeholder={t('onboarding.profil.firstNamePlaceholder')}
      />
      <TextField
        value={birthDateRaw}
        onChangeText={setBirthDateRaw}
        label={t('onboarding.profil.birthDate')}
        placeholder={t('onboarding.profil.birthDatePlaceholder')}
        keyboardType="numbers-and-punctuation"
      />
      <Text style={styles.caption}>{t('onboarding.profil.birthDateHint')}</Text>

      <View style={styles.injuryBlock}>
        <Label>{t('onboarding.profil.injuryQuestion')}</Label>
        <View style={styles.chipRow}>
          <Chip
            label={t('onboarding.profil.injuryNo')}
            selected={!hasInjury}
            onPress={() => setHasInjury(false)}
          />
          <Chip
            label={t('onboarding.profil.injuryYes')}
            selected={hasInjury}
            onPress={() => setHasInjury(true)}
          />
        </View>
        {hasInjury ? (
          <>
            <TextField
              value={injuryNote}
              onChangeText={setInjuryNote}
              label={t('onboarding.profil.injuryNote')}
              placeholder={t('onboarding.profil.injuryNotePlaceholder')}
            />
            <Text style={styles.caption}>{t('onboarding.profil.injuryHint')}</Text>
          </>
        ) : null}
      </View>

      {ageBlocked ? <Text style={styles.warn}>{t('onboarding.profil.underAge')}</Text> : null}
      {error === 'invalid' ? (
        <Text style={styles.warn}>{t('onboarding.profil.invalid')}</Text>
      ) : null}

      <Button label={t('onboarding.profil.continue')} onPress={submit} />
      <Button
        label={t('onboarding.skip')}
        onPress={skip}
        variant="ghost"
        disabled={ageBlocked}
      />
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  caption: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    lineHeight: 17,
  },
  injuryBlock: {
    gap: spacing.cardGap,
    marginTop: spacing.cardGap,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.cardGap,
  },
  warn: {
    // Le rouge `danger` est réservé aux pics de charge (règle n°4).
    color: colors.warn,
    fontSize: typography.body.fontSize,
    lineHeight: 22,
  },
});
