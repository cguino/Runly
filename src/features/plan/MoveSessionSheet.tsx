import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { addDays, dayOfWeek } from '@/lib/dates';
import { formatDateFr, formatDecimal } from '@/i18n';
import type { PlannedSession } from '@/schemas';
import { mondayOf } from '@/training-engine';
import { BottomSheet, Button, Chip, colors, spacing, typography } from '@/ui';

import { usePlanStore } from './plan-store';
import { sessionTypeLabel } from './session-format';

/**
 * Bottom sheet « Choisir un autre jour » (E8-3, spec §7.9) : les 7 jours de
 * la semaine comme cibles (les jours de repos servent de cibles de dépôt),
 * recalcul de l'ACWR prévisionnel et avertissement sur les enchaînements
 * déconseillés — l'app avertit, elle n'empêche JAMAIS. « Garder mon plan »
 * reste toujours disponible.
 */

type MoveSessionSheetProps = {
  session: PlannedSession | undefined;
  visible: boolean;
  onClose: () => void;
};

export function MoveSessionSheet({ session, visible, onClose }: MoveSessionSheetProps) {
  const { t } = useTranslation();
  const previewMove = usePlanStore((state) => state.previewMove);
  const moveSession = usePlanStore((state) => state.moveSession);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);

  const weekDays = useMemo(() => {
    if (session === undefined) {
      return [];
    }
    const monday = mondayOf(session.scheduledDate);
    return Array.from({ length: 7 }, (_, day) => addDays(monday, day));
  }, [session]);

  const preview = useMemo(() => {
    if (session?.id === undefined || selectedDate === undefined) {
      return undefined;
    }
    return previewMove(session.id, selectedDate);
  }, [previewMove, session, selectedDate]);

  const close = () => {
    setSelectedDate(undefined);
    onClose();
  };

  const confirm = () => {
    if (session?.id !== undefined && selectedDate !== undefined) {
      moveSession(session.id, selectedDate);
    }
    close();
  };

  const impactLine = () => {
    if (preview === undefined) {
      return undefined;
    }
    const before = preview.forecastBefore.acwr;
    const after = preview.forecastAfter.acwr;
    if (before === undefined || after === undefined) {
      return t('planTab.move.impactCalibration');
    }
    return t('planTab.move.impact', {
      before: formatDecimal(before),
      after: formatDecimal(after),
    });
  };

  return (
    <BottomSheet visible={visible} onClose={close} title={t('planTab.move.title')}>
      {session !== undefined && (
        <>
          <Text style={styles.subtitle}>
            {t('planTab.move.subtitle', {
              title: sessionTypeLabel(t, session.sessionType),
              date: formatDateFr(session.scheduledDate),
            })}
          </Text>
          <Text style={styles.label}>{t('planTab.move.dayLabel')}</Text>
          <View style={styles.chipRow}>
            {weekDays.map((date) =>
              date === session.scheduledDate ? null : (
                <Chip
                  key={date}
                  label={t(`week.days.d${dayOfWeek(date)}`)}
                  selected={selectedDate === date}
                  onPress={() => setSelectedDate(date)}
                />
              ),
            )}
          </View>

          {preview !== undefined && (
            <View style={styles.previewBox}>
              <Text style={styles.impact}>{impactLine()}</Text>
              {preview.warnings.map((warning) => (
                <Text key={warning} style={styles.warning}>
                  {t(`planTab.move.warnings.${warning}`)}
                </Text>
              ))}
            </View>
          )}

          <Button
            label={t('planTab.move.confirm')}
            onPress={confirm}
            disabled={selectedDate === undefined}
          />
          <Button label={t('planTab.move.keep')} onPress={close} variant="ghost" />
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewBox: {
    gap: spacing.cardGap,
  },
  impact: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  warning: {
    color: colors.warn,
    fontSize: typography.caption.fontSize,
    lineHeight: 17,
  },
});
