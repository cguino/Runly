import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { formatDateFr } from '@/i18n';
import type { RaceDistance } from '@/schemas';
import type { PlanAlternative } from '@/training-engine';
import { Button, Card, Chip, colors, Label, spacing, TextField, typography } from '@/ui';

import { usePhysioStore } from '../profile/physio-store';
import type { GoalSubmissionResult } from './onboarding-store';
import { useOnboardingStore } from './onboarding-store';
import { parseFrDate, parseTargetTimeS } from './parse';
import { StepScreen } from './StepScreen';

const DISTANCES: RaceDistance[] = ['5k', '10k', 'semi', 'marathon'];

/**
 * OB4 — Objectif optionnel (E1-5, D5) : distance, date, ambition, temps
 * cible. Le garde-fou « objectif irréaliste » est le moteur de plan
 * (`generatePlan`, via le store — aucun re-calcul local) : ses alternatives
 * sont proposées, l'utilisateur choisit ou passe — on ne bloque JAMAIS.
 */
export function GoalStepScreen() {
  const { t } = useTranslation();
  const submitGoal = useOnboardingStore((state) => state.submitGoal);
  const applyAlternative = useOnboardingStore((state) => state.applyAlternative);
  const skipGoal = useOnboardingStore((state) => state.skipGoal);
  const vmaKmh = usePhysioStore((state) => state.profile.vmaKmh?.value);

  const [distance, setDistance] = useState<RaceDistance>('10k');
  const [dateRaw, setDateRaw] = useState('');
  const [eventName, setEventName] = useState('');
  const [ambition, setAmbition] = useState<'finir' | 'chrono'>('finir');
  const [targetTimeRaw, setTargetTimeRaw] = useState('');
  const [result, setResult] = useState<GoalSubmissionResult | undefined>(undefined);

  const today = () => new Date().toISOString().slice(0, 10);

  const handleResult = (submission: GoalSubmissionResult) => {
    setResult(submission);
    if (submission.status === 'plan') {
      router.push('/onboarding/compte');
    }
  };

  const generate = () => {
    const raceDate = parseFrDate(dateRaw);
    const targetTimeS = ambition === 'chrono' ? parseTargetTimeS(targetTimeRaw) : undefined;
    if (raceDate === undefined || (ambition === 'chrono' && targetTimeS === undefined)) {
      setResult({ status: 'invalid' });
      return;
    }
    handleResult(
      submitGoal({
        goal: {
          raceDistance: distance,
          raceDate,
          ambition,
          targetTimeS,
          eventName: eventName.trim() === '' ? undefined : eventName.trim(),
        },
        today: today(),
        vmaKmh,
      }),
    );
  };

  const chooseAlternative = (alternative: PlanAlternative) => {
    handleResult(applyAlternative(alternative, { today: today(), vmaKmh }));
  };

  const skip = () => {
    skipGoal();
    router.push('/onboarding/compte');
  };

  const alternativeLabel = (alternative: PlanAlternative): string => {
    switch (alternative.type) {
      case 'finish_ambition':
        return t('onboarding.objectif.altFinish');
      case 'later_date':
        return t('onboarding.objectif.altLater', {
          date: formatDateFr(alternative.suggestedRaceDate),
        });
      case 'other_goal':
        return t('onboarding.objectif.altOther', {
          distance: t(`onboarding.objectif.distances.${alternative.raceDistance}`),
        });
    }
  };

  return (
    <StepScreen title={t('onboarding.objectif.title')} intro={t('onboarding.objectif.body')}>
      <Label>{t('onboarding.objectif.distanceLabel')}</Label>
      <View style={styles.chipRow}>
        {DISTANCES.map((d) => (
          <Chip
            key={d}
            label={t(`onboarding.objectif.distances.${d}`)}
            selected={distance === d}
            onPress={() => setDistance(d)}
          />
        ))}
      </View>

      <TextField
        value={dateRaw}
        onChangeText={setDateRaw}
        label={t('onboarding.objectif.dateLabel')}
        placeholder={t('onboarding.objectif.datePlaceholder')}
        keyboardType="numbers-and-punctuation"
      />
      <TextField
        value={eventName}
        onChangeText={setEventName}
        label={t('onboarding.objectif.eventName')}
        placeholder={t('onboarding.objectif.eventNamePlaceholder')}
      />

      <Label>{t('onboarding.objectif.ambitionLabel')}</Label>
      <View style={styles.chipRow}>
        <Chip
          label={t('onboarding.objectif.ambitionFinish')}
          selected={ambition === 'finir'}
          onPress={() => setAmbition('finir')}
        />
        <Chip
          label={t('onboarding.objectif.ambitionChrono')}
          selected={ambition === 'chrono'}
          onPress={() => setAmbition('chrono')}
        />
      </View>
      {ambition === 'chrono' ? (
        <>
          <TextField
            value={targetTimeRaw}
            onChangeText={setTargetTimeRaw}
            label={t('onboarding.objectif.targetTime')}
            placeholder={t('onboarding.objectif.targetTimePlaceholder')}
            keyboardType="numbers-and-punctuation"
          />
          <Text style={styles.caption}>{t('onboarding.objectif.targetTimeHint')}</Text>
        </>
      ) : null}

      {result?.status === 'invalid' ? (
        <Text style={styles.warn}>{t('onboarding.objectif.invalid')}</Text>
      ) : null}
      {result?.status === 'refused' ? (
        <Text style={styles.warn}>
          {result.reason === 'race_date_not_ahead'
            ? t('onboarding.objectif.refusedDate')
            : t('onboarding.objectif.refusedSessions')}
        </Text>
      ) : null}
      {result?.status === 'unrealistic' ? (
        <Card>
          <Text style={styles.unrealisticTitle}>{t('onboarding.objectif.unrealisticTitle')}</Text>
          <Text style={styles.caption}>{t('onboarding.objectif.unrealisticBody')}</Text>
          {result.alternatives.map((alternative) => (
            <Button
              key={alternative.type}
              label={alternativeLabel(alternative)}
              onPress={() => chooseAlternative(alternative)}
              variant="ghost"
            />
          ))}
        </Card>
      ) : null}

      <Button label={t('onboarding.objectif.generate')} onPress={generate} />
      <Button label={t('onboarding.objectif.skipGoal')} onPress={skip} variant="ghost" />
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
    lineHeight: 22,
  },
  unrealisticTitle: {
    color: colors.text,
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
  },
});
