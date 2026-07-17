import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TemplateSessionType } from '@/training-engine';
import { Card, Chip, colors, Label, spacing, typography } from '@/ui';

import { usePlanStore } from './plan-store';
import { sessionTypeLabel } from './session-format';

/**
 * Mode semaine type manuelle (E8-6, D5/D9) : sans objectif, l'utilisateur
 * compose sa semaine 100 % manuellement — un type de séance par jour choisi,
 * la jauge arbitre. Le fartlek se compose via le builder (Lot 10).
 */

const TYPES: TemplateSessionType[] = [
  'ef',
  'sortie_longue',
  'vma_court',
  'seuil',
  'tempo',
  'recuperation',
];

export function WeekTemplateEditor() {
  const { t } = useTranslation();
  const weekTemplate = usePlanStore((state) => state.weekTemplate);
  const addTemplateEntry = usePlanStore((state) => state.addTemplateEntry);
  const removeTemplateEntry = usePlanStore((state) => state.removeTemplateEntry);
  const [pickingDay, setPickingDay] = useState<number | undefined>(undefined);

  return (
    <Card>
      <Label>{t('planTab.weekType.title')}</Label>
      <Text style={styles.intro}>{t('planTab.weekType.intro')}</Text>
      {Array.from({ length: 7 }, (_, day) => {
        const dayLabel = t(`week.days.d${day}`);
        const entries = weekTemplate
          .map((entry, index) => ({ entry, index }))
          .filter(({ entry }) => entry.day === day);
        return (
          <View key={day} style={styles.dayRow}>
            <Text style={styles.day}>{dayLabel}</Text>
            <View style={styles.dayBody}>
              {entries.length === 0 && pickingDay !== day && (
                <Text style={styles.rest}>{t('planTab.weekType.rest')}</Text>
              )}
              {entries.map(({ entry, index }) => (
                <View key={index} style={styles.entryRow}>
                  <Text style={styles.entryTitle} numberOfLines={1}>
                    {sessionTypeLabel(t, entry.sessionType)}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => removeTemplateEntry(index)}
                  >
                    <Text style={styles.remove}>{t('planTab.weekType.remove')}</Text>
                  </Pressable>
                </View>
              ))}
              {pickingDay === day ? (
                <View style={styles.chipRow}>
                  {TYPES.map((type) => (
                    <Chip
                      key={type}
                      label={sessionTypeLabel(t, type)}
                      onPress={() => {
                        addTemplateEntry({ day, sessionType: type });
                        setPickingDay(undefined);
                      }}
                    />
                  ))}
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('planTab.weekType.addForDay', { day: dayLabel })}
                  hitSlop={8}
                  onPress={() => setPickingDay(day)}
                >
                  <Text style={styles.add}>＋</Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  intro: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    lineHeight: 17,
  },
  dayRow: {
    flexDirection: 'row',
    gap: spacing.cardGap,
    alignItems: 'flex-start',
    minHeight: 28,
  },
  day: {
    width: 36,
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    paddingTop: 2,
  },
  dayBody: {
    flex: 1,
    gap: 6,
  },
  // `textFaint` est réservé au fond `bg` : dans une carte → `textMuted`.
  rest: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.cardGap,
  },
  entryTitle: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  remove: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  add: {
    color: colors.action,
    fontSize: typography.body.fontSize,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
