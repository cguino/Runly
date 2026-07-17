import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { addDays, dayOfWeek } from '@/lib/dates';
import type { TemplateSessionType } from '@/training-engine';
import { BottomSheet, Button, Chip, colors, typography } from '@/ui';

import { usePlanStore } from './plan-store';
import { sessionTypeLabel } from './session-format';

/**
 * Bottom sheet « Ajouter une séance » spontanée (E8-4, spec §7.9) : la
 * séance entre dans la charge comme les autres. Suggestion d'allègement
 * SEULEMENT si la charge projetée sort de la zone favorable — sinon l'app
 * se tait (pas de culpabilisation). Le fartlek se compose via le builder
 * (Lot 10).
 */

const TYPES: TemplateSessionType[] = [
  'ef',
  'sortie_longue',
  'vma_court',
  'seuil',
  'tempo',
  'recuperation',
];

type AddSessionSheetProps = {
  visible: boolean;
  onClose: () => void;
};

function localIsoDate(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function AddSessionSheet({ visible, onClose }: AddSessionSheetProps) {
  const { t } = useTranslation();
  const addSpontaneousSession = usePlanStore((state) => state.addSpontaneousSession);
  const [sessionType, setSessionType] = useState<TemplateSessionType>('ef');
  const [date, setDate] = useState<string | undefined>(undefined);
  const [outcome, setOutcome] = useState<'added' | 'lightening' | undefined>(undefined);

  const today = localIsoDate();
  const nextDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const close = () => {
    setOutcome(undefined);
    setDate(undefined);
    onClose();
  };

  const confirm = () => {
    if (date === undefined) {
      return;
    }
    const { lightening } = addSpontaneousSession({ sessionType, date });
    setOutcome(lightening ? 'lightening' : 'added');
  };

  return (
    <BottomSheet visible={visible} onClose={close} title={t('planTab.add.title')}>
      {outcome === undefined ? (
        <>
          <Text style={styles.intro}>{t('planTab.add.intro')}</Text>
          <Text style={styles.label}>{t('planTab.add.typeLabel')}</Text>
          <View style={styles.chipRow}>
            {TYPES.map((type) => (
              <Chip
                key={type}
                label={sessionTypeLabel(t, type)}
                selected={sessionType === type}
                onPress={() => setSessionType(type)}
              />
            ))}
          </View>
          <Text style={styles.label}>{t('planTab.add.dayLabel')}</Text>
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
          <Button
            label={t('planTab.add.confirm')}
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
          <Button label={t('planTab.add.close')} onPress={close} variant="ghost" />
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
