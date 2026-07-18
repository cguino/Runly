import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { formatDecimal } from '@/i18n';
import { addDays, dayOfWeek } from '@/lib/dates';
import type { SessionBlock, SessionType } from '@/schemas';
import { BottomSheet, Button, Chip, colors, spacing, typography } from '@/ui';

import { usePlanStore } from '../plan/plan-store';

/**
 * « L'ajouter à ma semaine » depuis une fiche séance (E4-3, spec §7.3) :
 * choix du jour + impact sur la jauge prévisionnelle AVANT confirmation.
 * Après ajout, suggestion d'allègement SEULEMENT si la charge projetée
 * sort de la zone favorable (règle E8-4) — sinon l'app se tait.
 */

type AddToWeekSheetProps = {
  visible: boolean;
  onClose: () => void;
  sessionType: SessionType;
  blocks: SessionBlock[];
};

function localIsoDate(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function AddToWeekSheet({ visible, onClose, sessionType, blocks }: AddToWeekSheetProps) {
  const { t } = useTranslation();
  const previewAdd = usePlanStore((state) => state.previewAdd);
  const addSpontaneousSession = usePlanStore((state) => state.addSpontaneousSession);
  const [date, setDate] = useState<string | undefined>(undefined);
  const [outcome, setOutcome] = useState<'added' | 'lightening' | undefined>(undefined);

  const today = localIsoDate();
  const nextDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const preview = useMemo(() => {
    if (date === undefined || !visible) {
      return undefined;
    }
    return previewAdd({ sessionType, blocks, date });
  }, [previewAdd, sessionType, blocks, date, visible]);

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

  const close = () => {
    setDate(undefined);
    setOutcome(undefined);
    onClose();
  };

  const confirm = () => {
    if (date === undefined) {
      return;
    }
    const { lightening } = addSpontaneousSession({ sessionType, blocks, date });
    setOutcome(lightening ? 'lightening' : 'added');
  };

  return (
    <BottomSheet visible={visible} onClose={close} title={t('library.add.title')}>
      {outcome === undefined ? (
        <>
          <Text style={styles.intro}>{t('library.add.intro')}</Text>
          <Text style={styles.label}>{t('library.add.dayLabel')}</Text>
          <View style={styles.chipRow}>
            {nextDays.map((day) => (
              <Chip
                key={day}
                label={t(`week.days.d${dayOfWeek(day)}`)}
                selected={date === day}
                onPress={() => setDate(day)}
              />
            ))}
          </View>
          {preview !== undefined && <Text style={styles.impact}>{impactLine()}</Text>}
          <Button
            label={t('library.add.confirm')}
            onPress={confirm}
            disabled={date === undefined}
          />
        </>
      ) : (
        <>
          <Text style={styles.added}>{t('planTab.add.added')}</Text>
          {outcome === 'lightening' && (
            // Sortie de zone uniquement (spec §7.9) — jamais de rouge ici :
            // le danger est réservé à la jauge et aux alertes de pic.
            <Text style={styles.lightening}>{t('planTab.add.lightening')}</Text>
          )}
          <Button label={t('library.add.close')} onPress={close} variant="ghost" />
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  intro: {
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
  impact: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: spacing.cardGap,
  },
  added: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  lightening: {
    color: colors.warn,
    fontSize: typography.body.fontSize,
    lineHeight: 22,
  },
});
