import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatApprox, formatDistanceKm, formatDuration } from '@/i18n';
import type { SessionBlock, SessionType } from '@/schemas';
import { sessionTypeSchema } from '@/schemas';
import {
  buildLibrarySession,
  estimateSessionTotals,
  EXPECTED_SESSION_RPE,
} from '@/training-engine';
import { Button, Card, colors, Label, spacing, StatCardTrio, typography } from '@/ui';

import { blockLines, sessionTypeLabel } from '../plan/session-format';
import { usePlayerStore } from '../player';
import { usePhysioStore } from '../profile';
import { AddToWeekSheet } from './AddToWeekSheet';
import { useLibraryStore } from './library-store';

/**
 * Fiche séance (E4-3, US-05/US-05b, spec §7.3) : structure en blocs avec
 * allures/FC cibles, distance et durée totales estimées (calcul auto), et
 * le versant pédagogique — ce que c'est, ce que ça développe, pour quels
 * objectifs, l'effort attendu, conseils, pièges, variantes. Deux actions :
 * « L'ajouter à ma semaine » (impact jauge prévisionnelle) et « La faire
 * maintenant » (player). Sert aussi de fiche aux séances du builder
 * (`customId`).
 */

/** « La faire maintenant » : prépare le player puis l'ouvre (E4-3). */
function playSession(sessionType: SessionType, blocks: SessionBlock[], title: string): void {
  usePlayerStore.getState().prepare({
    sessionId: `library-${Date.now()}`,
    sessionType,
    blocks,
    title,
  });
  router.push('/player');
}

/** Sections pédagogiques de la fiche d'un type (contenu : `library.sheets`). */
const PEDAGOGY_SECTIONS = [
  { labelKey: 'developsLabel', contentKey: 'develops' },
  { labelKey: 'goalsLabel', contentKey: 'goals' },
  { labelKey: 'rpeLabel', contentKey: 'rpe' },
] as const;

const PEDAGOGY_LISTS = [
  { labelKey: 'tipsLabel', contentKey: 'tips' },
  { labelKey: 'mistakesLabel', contentKey: 'mistakes' },
  { labelKey: 'variantsLabel', contentKey: 'variants' },
] as const;

export function SessionSheetScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ type?: string; customId?: string }>();
  const savedSessions = useLibraryStore((state) => state.savedSessions);
  const vmaKmh = usePhysioStore((state) => state.profile.vmaKmh?.value);
  const [adding, setAdding] = useState(false);

  const parsedType = sessionTypeSchema.safeParse(params.type);
  const custom =
    params.customId !== undefined ? savedSessions.find((s) => s.id === params.customId) : undefined;

  const resolved: { sessionType: SessionType; blocks: SessionBlock[]; title: string } | undefined =
    custom !== undefined
      ? { sessionType: custom.sessionType, blocks: custom.blocks, title: custom.name }
      : parsedType.success
        ? {
            sessionType: parsedType.data,
            blocks: buildLibrarySession(parsedType.data, vmaKmh).blocks,
            title: sessionTypeLabel(t, parsedType.data),
          }
        : undefined;

  if (resolved === undefined) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.body}>{t('library.sheet.notFound')}</Text>
      </View>
    );
  }

  const { sessionType, blocks, title } = resolved;
  const totals = estimateSessionTotals(blocks, vmaKmh);
  const isTypeSheet = custom === undefined && parsedType.success;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      {isTypeSheet && <Text style={styles.what}>{t(`library.sheets.${sessionType}.what`)}</Text>}

      <StatCardTrio
        items={[
          {
            label: t('library.sheet.statDistance'),
            value: formatApprox(formatDistanceKm(totals.distanceM)),
          },
          {
            label: t('library.sheet.statDuration'),
            value: formatApprox(formatDuration(totals.durationS)),
          },
          {
            label: t('library.sheet.statRpe'),
            value: t('library.sheet.rpeValue', { value: EXPECTED_SESSION_RPE[sessionType] }),
          },
        ]}
      />

      <Label>{t('library.sheet.structureLabel')}</Label>
      <Card>
        {blockLines(t, blocks).map((line, index) => (
          <Text key={`${index}-${line}`} style={styles.blockLine}>
            {line}
          </Text>
        ))}
        {vmaKmh === undefined && <Text style={styles.hint}>{t('library.sheet.vmaHint')}</Text>}
      </Card>

      {isTypeSheet &&
        PEDAGOGY_SECTIONS.map(({ labelKey, contentKey }) => (
          <View key={labelKey} style={styles.section}>
            <Label>{t(`library.sheet.${labelKey}`)}</Label>
            <Text style={styles.body}>{t(`library.sheets.${sessionType}.${contentKey}`)}</Text>
          </View>
        ))}

      {isTypeSheet &&
        PEDAGOGY_LISTS.map(({ labelKey, contentKey }) => (
          <View key={labelKey} style={styles.section}>
            <Label>{t(`library.sheet.${labelKey}`)}</Label>
            {(
              t(`library.sheets.${sessionType}.${contentKey}`, {
                returnObjects: true,
              }) as string[]
            ).map((item) => (
              <Text key={item} style={styles.body}>
                {'•'} {item}
              </Text>
            ))}
          </View>
        ))}

      <Button
        label={t('library.sheet.doNow')}
        onPress={() => playSession(sessionType, blocks, title)}
        icon="▶"
      />
      <Button
        label={t('library.sheet.addToWeek')}
        onPress={() => setAdding(true)}
        variant="ghost"
      />

      <AddToWeekSheet
        visible={adding}
        onClose={() => setAdding(false)}
        sessionType={sessionType}
        blocks={blocks}
      />
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
  notFound: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.screenGutter,
  },
  title: {
    color: colors.text,
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
  },
  what: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    lineHeight: 22,
  },
  section: {
    gap: 6,
  },
  body: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    lineHeight: 22,
  },
  blockLine: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
});
