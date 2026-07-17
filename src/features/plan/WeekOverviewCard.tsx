import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { formatDecimal } from '@/i18n';
import type { PlannedSession } from '@/schemas';
import type { SessionDisplayStatus } from '@/training-engine';
import { buildWeekOverview, estimateBlocksKm, mondayOf } from '@/training-engine';
import type { PillVariant } from '@/ui';
import { Card, colors, Label, Pill, spacing, typography } from '@/ui';

import { usePhysioStore } from '../profile/physio-store';
import { selectActiveSessions, usePlanStore } from './plan-store';
import { sessionTypeLabel } from './session-format';

/**
 * Accueil — semaine 7 jours fixes lun→dim (E8-1) : jours de repos affichés
 * explicitement (le repos fait partie de l'entraînement, spec §7.10),
 * statut de chaque séance (prévue / faite / manquée), volume prévu.
 * Aucune règle métier : tout vient de `buildWeekOverview` (training-engine).
 */

const STATUS_VARIANTS: Record<SessionDisplayStatus, PillVariant> = {
  prevu: 'muted',
  fait: 'positive',
  manque: 'warn',
};

function localIsoDate(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function WeekOverviewCard() {
  const { t } = useTranslation();
  const plan = usePlanStore((state) => state.plan);
  const manualSessions = usePlanStore((state) => state.manualSessions);
  const vmaKmh = usePhysioStore((state) => state.profile.vmaKmh?.value);

  const today = useMemo(() => localIsoDate(), []);
  const monday = mondayOf(today);

  const sessions = useMemo(
    () => selectActiveSessions({ plan, manualSessions }),
    [plan, manualSessions],
  );
  const overview = useMemo(
    () => buildWeekOverview(sessions, monday, today),
    [sessions, monday, today],
  );

  const volumeKm = useMemo(() => {
    const weekSessions = overview.flatMap((day) => day.sessions);
    if (plan !== undefined) {
      const week = plan.weeks.find((w) =>
        w.sessions.some((s) => weekSessions.some((d) => d.session === s)),
      );
      if (week?.targetVolumeKm !== undefined) {
        return week.targetVolumeKm;
      }
    }
    const total = weekSessions.reduce(
      (sum, { session }) => sum + estimateBlocksKm(session.blocks, vmaKmh),
      0,
    );
    return Math.round(total * 10) / 10;
  }, [overview, plan, vmaKmh]);

  return (
    <Card>
      <Label>{t('week.title')}</Label>
      {overview.map((day) => (
        <View key={day.date} style={styles.row}>
          <Text style={styles.day}>{t(`week.days.d${day.day}`)}</Text>
          {day.sessions.length === 0 ? (
            <Text style={styles.rest}>{t('week.rest')}</Text>
          ) : (
            <View style={styles.sessions}>
              {day.sessions.map(({ session, displayStatus }, index) => (
                <SessionRow
                  key={session.id ?? `${day.date}-${index}`}
                  session={session}
                  displayStatus={displayStatus}
                />
              ))}
            </View>
          )}
        </View>
      ))}
      {volumeKm > 0 && (
        <Text style={styles.volume}>{t('week.volume', { km: formatDecimal(volumeKm, 1) })}</Text>
      )}
    </Card>
  );
}

function SessionRow({
  session,
  displayStatus,
}: {
  session: PlannedSession;
  displayStatus: SessionDisplayStatus;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.sessionRow}>
      <Text style={styles.sessionTitle} numberOfLines={1}>
        {sessionTypeLabel(t, session.sessionType)}
      </Text>
      <Pill label={t(`week.status.${displayStatus}`)} variant={STATUS_VARIANTS[displayStatus]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.cardGap,
    minHeight: 28,
  },
  day: {
    width: 36,
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  rest: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
  },
  sessions: {
    flex: 1,
    gap: 4,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.cardGap,
  },
  sessionTitle: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  volume: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    marginTop: 4,
  },
});
