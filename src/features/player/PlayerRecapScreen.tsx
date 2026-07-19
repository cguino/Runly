import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatDistanceKm, formatPace } from '@/i18n';
import { buildSessionRecap, MIN_WORKOUT_DURATION_S } from '@/training-engine';
import { Button, Card, colors, spacing, StatCardTrio, typography } from '@/ui';

import { usePlayerStore } from './player-store';
import { formatClock } from './session-format';

/**
 * Fin de séance (E5-5) : récap (distance, durée, allures — la FC moyenne
 * remonte via la santé après la séance, D6), écriture du Workout (journal +
 * santé + charge, idempotente) et enchaînement vers la saisie RPE existante.
 */
export function PlayerRecapScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const runner = usePlayerStore((state) => state.runner);
  const saved = usePlayerStore((state) => state.workoutSaved);

  const recap = useMemo(() => (runner === undefined ? undefined : buildSessionRecap(runner)), [runner]);
  const abandoned = runner?.phase === 'abandoned';
  const tooShort = recap !== undefined && recap.durationS < MIN_WORKOUT_DURATION_S;

  useEffect(() => {
    // Écriture immédiate (idempotente, workoutSaved dans le store) : même si
    // l'app est quittée sur le récap, la séance est déjà au journal.
    usePlayerStore.getState().saveWorkout();
  }, []);

  if (runner === undefined || recap === undefined) {
    return <SafeAreaView style={styles.screen} />;
  }

  const leave = (to?: '/rpe-entry') => {
    usePlayerStore.getState().reset();
    if (to === undefined) {
      router.dismissTo('/');
    } else {
      router.dismissTo('/');
      router.push(to);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {abandoned ? t('player.recap.titleAbandoned') : t('player.recap.title')}
        </Text>
        <Text style={styles.subtitle}>{t('player.recap.subtitle')}</Text>

        <StatCardTrio
          items={[
            { label: t('player.recap.statDistance'), value: formatDistanceKm(recap.distanceM) },
            { label: t('player.recap.statDuration'), value: formatClock(recap.durationS) },
            {
              label: t('player.recap.statAvgPace'),
              value:
                recap.avgPaceSecPerKm === undefined
                  ? t('player.emptyValue')
                  : formatPace(recap.avgPaceSecPerKm),
            },
          ]}
        />

        <Card>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('player.recap.workPace')}</Text>
            <Text style={styles.rowValue}>
              {recap.workPaceSecPerKm === undefined
                ? t('player.emptyValue')
                : formatPace(recap.workPaceSecPerKm)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('player.recap.hr')}</Text>
            <Text style={styles.rowValue}>{t('player.emptyValue')}</Text>
          </View>
          <Text style={styles.hint}>{t('player.recap.hrPending')}</Text>
          {recap.skippedSteps > 0 ? (
            <Text style={styles.hint}>{t('player.recap.skipped', { count: recap.skippedSteps })}</Text>
          ) : null}
        </Card>

        {tooShort ? <Text style={styles.hint}>{t('player.recap.tooShort')}</Text> : null}
      </ScrollView>
      <View style={styles.footer}>
        {saved ? (
          <>
            <Text style={styles.hint}>{t('player.recap.ratePrompt')}</Text>
            <Button label={t('player.recap.rateCta')} onPress={() => leave('/rpe-entry')} />
          </>
        ) : null}
        <Button variant="ghost" label={t('player.recap.close')} onPress={() => leave()} />
      </View>
    </SafeAreaView>
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
  footer: {
    padding: spacing.screenGutter,
    gap: spacing.cardGap,
  },
  title: {
    color: colors.text,
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
  },
  rowValue: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  hint: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
});
