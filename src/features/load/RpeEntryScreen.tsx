import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fr } from '@/i18n';
import { Button, colors, radii, spacing, typography } from '@/ui';

import { latestEntryWithoutFeedback, useJournalStore } from '../journal';
import { useLoadStore } from './load-store';

/**
 * Saisie RPE post-séance (E7-5, G6) : échelle 0–10 avec ancres émoji,
 * enregistrée sur la dernière séance sans feedback du journal. La jauge se
 * met à jour dans la foulée (refresh du store de charge).
 * TODO(Lot 9) : cette saisie sera aussi proposée par notification 30 min
 * après la détection d'un workout importé (infra notifications au Lot 9).
 */

const RPE_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/** Ancre émoji d'une valeur RPE (G6 : 😌 0–1 · 🙂 2–3 · 😊 4–5 · 😅 6–7 · 🥵 8–9 · 🤯 10). */
function anchorOf(value: number) {
  return fr.rpe.anchors.find((anchor) => value <= anchor.max) ?? fr.rpe.anchors[0];
}

export function RpeEntryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [rpe, setRpe] = useState<number>();

  const entries = useJournalStore((state) => state.entries);
  const addFeedback = useJournalStore((state) => state.addFeedbackToLatestWorkout);
  const refreshLoad = useLoadStore((state) => state.refresh);
  const pendingEntry = latestEntryWithoutFeedback(entries);

  const anchor = rpe === undefined ? undefined : anchorOf(rpe);

  const save = () => {
    if (rpe === undefined) {
      return;
    }
    if (addFeedback(rpe)) {
      refreshLoad();
      router.back();
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.question}>{t('rpe.question')}</Text>
      {pendingEntry === undefined ? (
        <Text style={styles.hint}>{t('rpe.noWorkout')}</Text>
      ) : (
        <>
          <View style={styles.anchor}>
            <Text style={styles.anchorEmoji}>{anchor?.emoji ?? ' '}</Text>
            <Text style={styles.anchorLabel}>{anchor?.label ?? t('rpe.hint')}</Text>
          </View>
          <View style={styles.scale}>
            {RPE_VALUES.map((value) => {
              const selected = value === rpe;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${value} — ${anchorOf(value)?.label ?? ''}`}
                  onPress={() => setRpe(value)}
                  style={[styles.value, selected && styles.valueSelected]}
                >
                  <Text style={[styles.valueText, selected && styles.valueTextSelected]}>
                    {value}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>{t('rpe.hint')}</Text>
          <Button label={t('rpe.save')} onPress={save} disabled={rpe === undefined} />
        </>
      )}
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
  question: {
    color: colors.text,
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
  },
  anchor: {
    alignItems: 'center',
    gap: 4,
    minHeight: 88,
    justifyContent: 'center',
  },
  anchorEmoji: {
    fontSize: typography.display.fontSize,
  },
  anchorLabel: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  scale: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  value: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueSelected: {
    backgroundColor: colors.action,
    borderColor: colors.action,
  },
  valueText: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  valueTextSelected: {
    color: colors.onAction,
  },
  hint: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    textAlign: 'center',
  },
});
