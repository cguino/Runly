import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatApprox, formatDateFr, formatDecimal, formatDistanceKm } from '@/i18n';
import { addDays, dayOfWeek } from '@/lib/dates';
import type { PlannedSession, PlannedWeek, TrainingPlan } from '@/schemas';
import type { WeekRealizedSummary } from '@/training-engine';
import {
  estimateBlocksKm,
  mondayOf,
  sessionDisplayStatus,
  weekRealizedSummary,
} from '@/training-engine';
import type { TimelineStep } from '@/ui';
import {
  Button,
  Card,
  Chip,
  colors,
  Label,
  Pill,
  spacing,
  TimelineStepper,
  typography,
} from '@/ui';

import { useJournalStore } from '../journal/journal-store';
import { entryLoad } from '../load/load-store';
import { usePhysioStore } from '../profile/physio-store';
import { AddSessionSheet } from './AddSessionSheet';
import { GoalSection } from './GoalSection';
import { MoveSessionSheet } from './MoveSessionSheet';
import { usePlanStore } from './plan-store';
import { sessionTypeLabel } from './session-format';
import { WeekTemplateEditor } from './WeekTemplateEditor';

/**
 * Onglet Plan (E8-2, spec §7.10) : timeline verticale continue — semaines
 * passées (réalisé vs prévu, RPE, charge) et à venir (phases de
 * périodisation, semaines allégées marquées). C'est aussi le lieu de
 * gestion de l'objectif (E8-7) et de la semaine type sans objectif (E8-6).
 * Séance à venir → bottom sheet de déplacement (E8-3) ; séance passée →
 * détail prévu/réalisé (E8-5).
 */

function localIsoDate(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Semaines passées affichées en mode semaine type. */
const MANUAL_PAST_WEEKS = 4;

export function PlanTimelineScreen() {
  const { t } = useTranslation();
  const plan = usePlanStore((state) => state.plan);
  const manualSessions = usePlanStore((state) => state.manualSessions);
  const entries = useJournalStore((state) => state.entries);
  const fcmaxBpm = usePhysioStore((state) => state.profile.fcmaxBpm?.value);

  const today = useMemo(() => localIsoDate(), []);
  const [movingSession, setMovingSession] = useState<PlannedSession | undefined>(undefined);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    usePlanStore.getState().hydrateFromOnboarding();
    usePlanStore.getState().ensureCurrentWeek();
  }, []);

  // Réalisé (journal) valorisé en UA — pour les résumés des semaines passées.
  const realizedWorkouts = useMemo(
    () =>
      entries.map((entry) => ({
        startedAt: entry.workout.startedAt,
        load: entryLoad(entry, fcmaxBpm),
        rpe: entry.feedback?.rpe,
      })),
    [entries, fcmaxBpm],
  );

  const onSessionPress = (session: PlannedSession) => {
    const status = sessionDisplayStatus(session, today);
    if (status === 'prevu') {
      setMovingSession(session);
    } else {
      router.push({ pathname: '/past-session', params: { sessionId: session.id ?? '' } });
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('screens.plan.title')}</Text>
      <Text style={styles.intro}>{t('planTab.intro')}</Text>

      <GoalSection />

      {plan === undefined && <WeekTemplateEditor />}

      <Button label={t('planTab.add.open')} onPress={() => setAdding(true)} variant="ghost" />

      <Label>{t('planTab.timeline.label')}</Label>
      {plan !== undefined ? (
        <PlanWeeks
          plan={plan}
          today={today}
          realizedWorkouts={realizedWorkouts}
          onSessionPress={onSessionPress}
        />
      ) : (
        <ManualWeeks
          sessions={manualSessions}
          today={today}
          realizedWorkouts={realizedWorkouts}
          onSessionPress={onSessionPress}
        />
      )}

      <MoveSessionSheet
        session={movingSession}
        visible={movingSession !== undefined}
        onClose={() => setMovingSession(undefined)}
      />
      <AddSessionSheet visible={adding} onClose={() => setAdding(false)} />
    </ScrollView>
  );
}

type RealizedWorkout = { startedAt: string; load: number; rpe?: number };

function PlanWeeks({
  plan,
  today,
  realizedWorkouts,
  onSessionPress,
}: {
  plan: TrainingPlan;
  today: string;
  realizedWorkouts: RealizedWorkout[];
  onSessionPress: (session: PlannedSession) => void;
}) {
  const { t } = useTranslation();
  const firstDate = plan.weeks[0]?.sessions[0]?.scheduledDate;
  const planStart = firstDate !== undefined ? mondayOf(firstDate) : mondayOf(today);
  const currentMonday = mondayOf(today);

  return (
    <>
      {plan.weeks.map((week) => {
        const weekStart = addDays(planStart, week.weekIndex * 7);
        const phase = plan.phases.find((p) => p.startWeekIndex === week.weekIndex);
        const isPast = addDays(weekStart, 6) < today;
        return (
          <View key={week.weekIndex} style={styles.weekBlock}>
            {phase !== undefined && (
              <Text style={styles.phase}>{t(`planTab.timeline.phases.${phase.type}`)}</Text>
            )}
            <WeekCard
              title={t('planTab.timeline.weekTitle', { n: week.weekIndex + 1 })}
              isCurrent={weekStart === currentMonday}
              isRecovery={week.isRecovery}
              volumeKm={week.targetVolumeKm}
              sessions={week.sessions}
              today={today}
              realized={isPast ? weekRealizedSummary(realizedWorkouts, weekStart) : undefined}
              onSessionPress={onSessionPress}
            />
          </View>
        );
      })}
    </>
  );
}

function ManualWeeks({
  sessions,
  today,
  realizedWorkouts,
  onSessionPress,
}: {
  sessions: PlannedSession[];
  today: string;
  realizedWorkouts: RealizedWorkout[];
  onSessionPress: (session: PlannedSession) => void;
}) {
  const { t } = useTranslation();
  const currentMonday = mondayOf(today);

  // Passé : les N dernières semaines civiles (réalisé vs matérialisé).
  const pastWeeks = Array.from({ length: MANUAL_PAST_WEEKS }, (_, i) =>
    addDays(currentMonday, -7 * (MANUAL_PAST_WEEKS - i)),
  );

  return (
    <>
      {pastWeeks.map((weekStart) => {
        const summary = weekRealizedSummary(realizedWorkouts, weekStart);
        const weekSessions = sessions.filter(
          (s) => s.scheduledDate >= weekStart && s.scheduledDate <= addDays(weekStart, 6),
        );
        if (summary.count === 0 && weekSessions.length === 0) {
          return null;
        }
        return (
          <WeekCard
            key={weekStart}
            title={t('planTab.timeline.pastWeekTitle', { date: formatDateFr(weekStart) })}
            isCurrent={false}
            isRecovery={false}
            sessions={weekSessions}
            today={today}
            realized={summary}
            onSessionPress={onSessionPress}
          />
        );
      })}
      <WeekCard
        title={t('planTab.timeline.currentWeekTitle')}
        isCurrent
        isRecovery={false}
        sessions={sessions.filter(
          (s) => s.scheduledDate >= currentMonday && s.scheduledDate <= addDays(currentMonday, 6),
        )}
        today={today}
        onSessionPress={onSessionPress}
      />
    </>
  );
}

function WeekCard({
  title,
  isCurrent,
  isRecovery,
  volumeKm,
  sessions,
  today,
  realized,
  onSessionPress,
}: {
  title: string;
  isCurrent: boolean;
  isRecovery: boolean;
  volumeKm?: PlannedWeek['targetVolumeKm'];
  sessions: PlannedSession[];
  today: string;
  realized?: WeekRealizedSummary;
  onSessionPress: (session: PlannedSession) => void;
}) {
  const { t } = useTranslation();
  const vmaKmh = usePhysioStore((state) => state.profile.vmaKmh?.value);

  const visible = sessions.filter((s) => s.status !== 'cancelled');
  const steps: TimelineStep[] = visible.map((session) => {
    const status = sessionDisplayStatus(session, today);
    const km = estimateBlocksKm(session.blocks, vmaKmh);
    const dayLabel = t(`week.days.d${dayOfWeek(session.scheduledDate)}`);
    const dateLabel = formatDateFr(session.scheduledDate).slice(0, 5); // « JJ/MM »
    const kmLabel = km > 0 ? ` · ${formatApprox(formatDistanceKm(km * 1000))}` : '';
    const statusLabel = status === 'prevu' ? '' : ` · ${t(`week.status.${status}`)}`;
    return {
      title: sessionTypeLabel(t, session.sessionType),
      subtitle: `${dayLabel} ${dateLabel}${kmLabel}${statusLabel}`,
      state: status === 'fait' ? 'done' : status === 'prevu' && isCurrent ? 'active' : 'todo',
      testID: session.id !== undefined ? `timeline-session-${session.id}` : undefined,
    };
  });

  return (
    <Card active={isCurrent}>
      <View style={styles.weekHeader}>
        <Text style={styles.weekTitle}>{title}</Text>
        {isCurrent && <Chip label={t('planTab.timeline.currentBadge')} />}
        {isRecovery && <Pill label={t('planTab.timeline.recoveryBadge')} variant="warn" />}
      </View>
      {volumeKm !== undefined && (
        <Text style={styles.weekMeta}>
          {t('planTab.timeline.volumePlanned', { km: formatDecimal(volumeKm, 1) })}
        </Text>
      )}
      {realized !== undefined && (
        <Text style={styles.weekMeta}>
          {t('planTab.timeline.realizedSummary', {
            count: realized.count,
            planned: visible.length,
            load: realized.totalLoad,
          })}
          {realized.avgRpe !== undefined
            ? ` · ${t('planTab.timeline.realizedRpe', { rpe: formatDecimal(realized.avgRpe, 1) })}`
            : ''}
        </Text>
      )}
      {steps.length > 0 ? (
        <TimelineStepper
          steps={steps}
          onStepPress={(index) => {
            const session = visible[index];
            if (session !== undefined) {
              onSessionPress(session);
            }
          }}
        />
      ) : (
        <Text style={styles.weekMeta}>{t('planTab.timeline.pastWeekEmpty')}</Text>
      )}
    </Card>
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
  intro: {
    color: colors.textFaint,
    fontSize: typography.caption.fontSize,
    marginBottom: spacing.cardGap,
  },
  weekBlock: {
    gap: spacing.cardGap,
  },
  phase: {
    color: colors.textMuted,
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
    textTransform: typography.label.textTransform,
    marginTop: spacing.cardGap,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.cardGap,
  },
  weekTitle: {
    color: colors.text,
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
  },
  weekMeta: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    fontVariant: ['tabular-nums'],
  },
});
