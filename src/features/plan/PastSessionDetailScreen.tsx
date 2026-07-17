import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text } from 'react-native';

import {
  formatApprox,
  formatDateFr,
  formatDecimal,
  formatDistanceKm,
  formatDuration,
} from '@/i18n';
import type { PlannedSession } from '@/schemas';
import type { TimelineStep } from '@/ui';
import {
  estimateBlocksDurationS,
  estimateBlocksKm,
  estimatePlannedSessionLoad,
} from '@/training-engine';
import { Card, Chip, colors, Label, spacing, StatCardTrio, TimelineStepper, typography } from '@/ui';

import { useJournalStore } from '../journal/journal-store';
import { entryLoad } from '../load/load-store';
import { usePhysioStore } from '../profile/physio-store';
import { usePlanStore } from './plan-store';
import { blockLines, sessionTypeLabel } from './session-format';

/**
 * Détail d'une séance passée (E8-5) : comparaison prévu / réalisé.
 * Prévu : structure par bloc + estimations. Réalisé : agrégats de la séance
 * mesurée (durée, distance, charge, RPE) — le détail réalisé bloc par bloc
 * arrive avec les séances jouées dans le player (Lot 6).
 */

export function PastSessionDetailScreen() {
  const { t } = useTranslation();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const plan = usePlanStore((state) => state.plan);
  const manualSessions = usePlanStore((state) => state.manualSessions);
  const archivedPlans = usePlanStore((state) => state.archivedPlans);
  const entries = useJournalStore((state) => state.entries);
  const vmaKmh = usePhysioStore((state) => state.profile.vmaKmh?.value);
  const fcmaxBpm = usePhysioStore((state) => state.profile.fcmaxBpm?.value);

  const session: PlannedSession | undefined = useMemo(() => {
    if (sessionId === undefined || sessionId === '') {
      return undefined;
    }
    const all = [
      ...(plan?.weeks.flatMap((w) => w.sessions) ?? []),
      ...manualSessions,
      ...archivedPlans.flatMap((p) => p.weeks.flatMap((w) => w.sessions)),
    ];
    return all.find((s) => s.id === sessionId);
  }, [sessionId, plan, manualSessions, archivedPlans]);

  const realized = useMemo(() => {
    if (session === undefined) {
      return undefined;
    }
    // Rapprochement : workout explicitement associé (E6-5), sinon même jour.
    return (
      entries.find((e) => e.workout.matchedPlannedSessionId === session.id) ??
      entries.find((e) => e.workout.startedAt.slice(0, 10) === session.scheduledDate)
    );
  }, [entries, session]);

  if (session === undefined) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.body}>{t('planTab.past.notFound')}</Text>
      </ScrollView>
    );
  }

  const plannedKm = estimateBlocksKm(session.blocks, vmaKmh);
  const plannedDurationS = estimateBlocksDurationS(session.blocks, vmaKmh);
  const plannedLoad = estimatePlannedSessionLoad(session, vmaKmh);
  const steps: TimelineStep[] = blockLines(t, session.blocks).map((line) => ({
    title: line,
    state: 'done',
  }));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {sessionTypeLabel(t, session.sessionType)} · {formatDateFr(session.scheduledDate)}
      </Text>

      <Label>{t('planTab.past.plannedLabel')}</Label>
      <Card>
        <StatCardTrio
          items={[
            {
              label: t('planTab.past.statDistance'),
              value: plannedKm > 0 ? formatApprox(formatDistanceKm(plannedKm * 1000)) : '—',
            },
            {
              label: t('planTab.past.statDuration'),
              value: plannedDurationS > 0 ? formatApprox(formatDuration(plannedDurationS)) : '—',
            },
            {
              label: t('planTab.past.statLoad'),
              value: `${formatApprox(String(plannedLoad))} ${t('planTab.past.loadUnit')}`,
            },
          ]}
        />
        {steps.length > 0 && (
          <>
            <Label>{t('planTab.past.structureLabel')}</Label>
            <TimelineStepper steps={steps} />
          </>
        )}
      </Card>

      <Label>{t('planTab.past.realizedLabel')}</Label>
      <Card>
        {realized === undefined ? (
          <Text style={styles.body}>{t('planTab.past.noWorkout')}</Text>
        ) : (
          <>
            <StatCardTrio
              items={[
                {
                  label: t('planTab.past.statDistance'),
                  value:
                    realized.workout.distanceM !== undefined
                      ? formatDistanceKm(realized.workout.distanceM)
                      : '—',
                },
                {
                  label: t('planTab.past.statDuration'),
                  value: formatDuration(realized.workout.durationS),
                },
                {
                  label: t('planTab.past.statLoad'),
                  value: `${formatDecimal(entryLoad(realized, fcmaxBpm), 0)} ${t('planTab.past.loadUnit')}`,
                },
              ]}
            />
            {realized.feedback !== undefined && (
              <Chip label={t('planTab.past.rpe', { value: realized.feedback.rpe })} />
            )}
            <Text style={styles.caption}>{t('planTab.past.blockRealizedNote')}</Text>
          </>
        )}
      </Card>
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
  title: {
    color: colors.text,
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
  },
  body: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    lineHeight: 22,
  },
  caption: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    lineHeight: 17,
  },
});
