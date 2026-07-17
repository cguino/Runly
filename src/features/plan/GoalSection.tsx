import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { formatDateFr, formatDuration } from '@/i18n';
import type { RaceDistance } from '@/schemas';
import type { PlanAlternative } from '@/training-engine';
import { BottomSheet, Button, Card, Chip, colors, Label, spacing, TextField, typography } from '@/ui';

import { parseFrDate, parseTargetTimeS } from '../onboarding/parse';
import type { GoalEditResult } from './plan-store';
import { usePlanStore } from './plan-store';

/**
 * Gestion de l'objectif dans l'onglet Plan (E8-7, D5) : créer / modifier /
 * supprimer l'objectif daté, avec bascule plan généré ↔ semaine type SANS
 * perte de données (le store archive, n'efface jamais). Le garde-fou
 * « objectif irréaliste » est le moteur (via le store) : alternatives
 * proposées, jamais de blocage.
 */

const DISTANCES: RaceDistance[] = ['5k', '10k', 'semi', 'marathon'];

export function GoalSection() {
  const { t } = useTranslation();
  const goal = usePlanStore((state) => state.goal);
  const deleteGoal = usePlanStore((state) => state.deleteGoal);
  const [formVisible, setFormVisible] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <Card>
      <Label>{t('planTab.goal.label')}</Label>
      {goal === undefined ? (
        <Button
          label={t('planTab.goal.add')}
          onPress={() => setFormVisible(true)}
          variant="ghost"
        />
      ) : confirmingDelete ? (
        <>
          <Text style={styles.deleteTitle}>{t('planTab.goal.deleteTitle')}</Text>
          <Text style={styles.body}>{t('planTab.goal.deleteBody')}</Text>
          <Button
            label={t('planTab.goal.deleteKeep')}
            onPress={() => setConfirmingDelete(false)}
          />
          <Button
            label={t('planTab.goal.deleteConfirm')}
            onPress={() => {
              deleteGoal();
              setConfirmingDelete(false);
            }}
            variant="ghost"
          />
        </>
      ) : (
        <>
          <Text style={styles.summary}>
            {t(`onboarding.objectif.distances.${goal.raceDistance}`)} ·{' '}
            {t('planTab.goal.raceOn', { date: formatDateFr(goal.raceDate) })}
          </Text>
          <Text style={styles.body}>
            {goal.ambition === 'chrono' && goal.targetTimeS !== undefined
              ? t('planTab.goal.ambitionChrono', { time: formatDuration(goal.targetTimeS) })
              : t('planTab.goal.ambitionFinish')}
            {goal.eventName !== undefined ? ` · ${goal.eventName}` : ''}
          </Text>
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                label={t('planTab.goal.edit')}
                onPress={() => setFormVisible(true)}
                variant="ghost"
              />
            </View>
            <View style={styles.action}>
              <Button
                label={t('planTab.goal.delete')}
                onPress={() => setConfirmingDelete(true)}
                variant="ghost"
              />
            </View>
          </View>
        </>
      )}
      <GoalFormSheet visible={formVisible} onClose={() => setFormVisible(false)} />
    </Card>
  );
}

function GoalFormSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const goal = usePlanStore((state) => state.goal);
  const createOrUpdateGoal = usePlanStore((state) => state.createOrUpdateGoal);
  const applyGoalAlternative = usePlanStore((state) => state.applyGoalAlternative);

  const [distance, setDistance] = useState<RaceDistance>(goal?.raceDistance ?? '10k');
  const [dateRaw, setDateRaw] = useState(goal !== undefined ? formatDateFr(goal.raceDate) : '');
  const [eventName, setEventName] = useState(goal?.eventName ?? '');
  const [ambition, setAmbition] = useState<'finir' | 'chrono'>(goal?.ambition ?? 'finir');
  const [targetTimeRaw, setTargetTimeRaw] = useState('');
  const [result, setResult] = useState<GoalEditResult | undefined>(undefined);

  const close = () => {
    setResult(undefined);
    onClose();
  };

  const handleResult = (submission: GoalEditResult) => {
    setResult(submission);
    if (submission.status === 'plan') {
      close();
    }
  };

  const submit = () => {
    const raceDate = parseFrDate(dateRaw);
    const targetTimeS = ambition === 'chrono' ? parseTargetTimeS(targetTimeRaw) : undefined;
    if (raceDate === undefined || (ambition === 'chrono' && targetTimeS === undefined)) {
      setResult({ status: 'invalid' });
      return;
    }
    handleResult(
      createOrUpdateGoal({
        goal: {
          id: goal?.id,
          raceDistance: distance,
          raceDate,
          ambition,
          targetTimeS,
          eventName: eventName.trim() === '' ? undefined : eventName.trim(),
        },
      }),
    );
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
    <BottomSheet
      visible={visible}
      onClose={close}
      title={goal === undefined ? t('planTab.goal.formTitleCreate') : t('planTab.goal.formTitleEdit')}
    >
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
      {ambition === 'chrono' && (
        <TextField
          value={targetTimeRaw}
          onChangeText={setTargetTimeRaw}
          label={t('onboarding.objectif.targetTime')}
          placeholder={t('onboarding.objectif.targetTimePlaceholder')}
        />
      )}

      {result?.status === 'invalid' && (
        <Text style={styles.warn}>{t('onboarding.objectif.invalid')}</Text>
      )}
      {result?.status === 'refused' && (
        <Text style={styles.warn}>
          {result.reason === 'race_date_not_ahead'
            ? t('onboarding.objectif.refusedDate')
            : t('onboarding.objectif.refusedSessions')}
        </Text>
      )}
      {result?.status === 'unrealistic' && (
        <>
          <Text style={styles.deleteTitle}>{t('onboarding.objectif.unrealisticTitle')}</Text>
          <Text style={styles.body}>{t('onboarding.objectif.unrealisticBody')}</Text>
          {result.alternatives.map((alternative) => (
            <Button
              key={alternative.type}
              label={alternativeLabel(alternative)}
              onPress={() => handleResult(applyGoalAlternative(alternative))}
              variant="ghost"
            />
          ))}
        </>
      )}

      <Button
        label={goal === undefined ? t('planTab.goal.saveCreate') : t('planTab.goal.saveEdit')}
        onPress={submit}
      />
      <Button label={t('planTab.goal.cancel')} onPress={close} variant="ghost" />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  summary: {
    color: colors.text,
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
  },
  body: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    lineHeight: 22,
  },
  deleteTitle: {
    color: colors.text,
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.cardGap,
  },
  action: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  warn: {
    color: colors.warn,
    fontSize: typography.body.fontSize,
    lineHeight: 22,
  },
});
