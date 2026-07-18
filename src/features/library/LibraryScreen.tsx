import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatApprox, formatDistanceKm, formatDuration } from '@/i18n';
import type { CustomSession, SessionType } from '@/schemas';
import { estimateSessionTotals, LIBRARY_SESSION_TYPES } from '@/training-engine';
import { Button, Card, Chip, colors, Label, spacing, typography } from '@/ui';

import { sessionTypeLabel } from '../plan/session-format';
import { usePhysioStore } from '../profile';
import { useLibraryStore } from './library-store';

/**
 * Onglet Séances (E4-3, spec §7.3) : bibliothèque pédagogique librement
 * explorable — les 7 types de séance en fiches, indépendantes du plan —
 * et « Mes séances » du builder (E4-4). Tap → fiche (`/session-sheet`).
 */

function TypeRow({ type }: { type: SessionType }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/session-sheet', params: { type } })}
    >
      {({ pressed }) => (
        <Card style={pressed ? styles.pressed : undefined}>
          <Text style={styles.rowTitle}>{sessionTypeLabel(t, type)}</Text>
          <Text style={styles.rowSubtitle}>{t(`library.sheets.${type}.what`)}</Text>
        </Card>
      )}
    </Pressable>
  );
}

function CustomRow({ session }: { session: CustomSession }) {
  const { t } = useTranslation();
  const duplicateSession = useLibraryStore((state) => state.duplicateSession);
  const vmaKmh = usePhysioStore((state) => state.profile.vmaKmh?.value);
  const totals = estimateSessionTotals(session.blocks, vmaKmh);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/session-sheet', params: { customId: session.id } })}
    >
      {({ pressed }) => (
        <Card style={pressed ? styles.pressed : undefined}>
          <Text style={styles.rowTitle}>{session.name}</Text>
          <Text style={styles.rowSubtitle}>
            {t('library.customSummary', {
              distance: formatApprox(formatDistanceKm(totals.distanceM)),
              duration: formatApprox(formatDuration(totals.durationS)),
            })}
          </Text>
          <View style={styles.rowActions}>
            <Chip label={sessionTypeLabel(t, session.sessionType)} />
            <Chip label={t('library.duplicate')} onPress={() => duplicateSession(session.id)} />
          </View>
        </Card>
      )}
    </Pressable>
  );
}

export function LibraryScreen() {
  const { t } = useTranslation();
  const savedSessions = useLibraryStore((state) => state.savedSessions);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('library.title')}</Text>
      <Text style={styles.intro}>{t('library.intro')}</Text>

      <Label>{t('library.customLabel')}</Label>
      {savedSessions.length === 0 ? (
        <Text style={styles.empty}>{t('library.customEmpty')}</Text>
      ) : (
        savedSessions.map((session) => <CustomRow key={session.id} session={session} />)
      )}
      <Button label={t('library.create')} onPress={() => router.push('/session-builder')} />

      <Label>{t('library.typesLabel')}</Label>
      {LIBRARY_SESSION_TYPES.map((type) => (
        <TypeRow key={type} type={type} />
      ))}
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
  intro: {
    color: colors.textFaint,
    fontSize: typography.caption.fontSize,
    marginBottom: spacing.cardGap,
  },
  empty: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    lineHeight: 22,
  },
  rowTitle: {
    color: colors.text,
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    lineHeight: 17,
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8,
  },
  pressed: {
    opacity: 0.85,
  },
});
