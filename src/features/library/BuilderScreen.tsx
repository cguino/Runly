import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatApprox, formatDistanceKm, formatDuration } from '@/i18n';
import type { SessionBlock, SessionType } from '@/schemas';
import { estimateSessionTotals, LIBRARY_SESSION_TYPES } from '@/training-engine';
import { Button, Card, Chip, colors, Label, spacing, TextField, typography } from '@/ui';

import { blockLine, sessionTypeLabel } from '../plan/session-format';
import { usePhysioStore } from '../profile';
import { BlockEditorSheet } from './BlockEditorSheet';
import { useLibraryStore } from './library-store';

/**
 * Builder de séance (E4-4, US-06, spec §7.3) : création par blocs —
 * step durée|distance @ allure|zone FC|RPE, séries avec récup — calcul
 * auto distance/durée totales, sauvegarde dans « Mes séances ». La
 * duplication se fait depuis la bibliothèque (fiche listée).
 */

export function BuilderScreen() {
  const { t } = useTranslation();
  const saveSession = useLibraryStore((state) => state.saveSession);
  const vmaKmh = usePhysioStore((state) => state.profile.vmaKmh?.value);

  const [name, setName] = useState('');
  const [sessionType, setSessionType] = useState<SessionType>('fartlek');
  const [blocks, setBlocks] = useState<SessionBlock[]>([]);
  const [editor, setEditor] = useState<'step' | 'series' | undefined>(undefined);
  /** Incrémenté à chaque ouverture : remonte l'éditeur avec un brouillon vierge. */
  const [editorKey, setEditorKey] = useState(0);
  const [saved, setSaved] = useState(false);

  const openEditor = (mode: 'step' | 'series') => {
    setEditorKey((k) => k + 1);
    setEditor(mode);
  };

  const totals = estimateSessionTotals(blocks, vmaKmh);
  const canSave = name.trim().length > 0 && blocks.length > 0;

  const save = () => {
    const session = saveSession({ name, sessionType, blocks });
    if (session !== undefined) {
      setSaved(true);
    }
  };

  if (saved) {
    return (
      <View style={styles.savedContainer}>
        <Text style={styles.savedText}>{t('library.builder.saved')}</Text>
        <Button label={t('library.builder.backToLibrary')} onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TextField
        label={t('library.builder.nameLabel')}
        value={name}
        onChangeText={setName}
        placeholder={t('library.builder.namePlaceholder')}
      />

      <Label>{t('library.builder.typeLabel')}</Label>
      <Text style={styles.hint}>{t('library.builder.typeHint')}</Text>
      <View style={styles.chipRow}>
        {LIBRARY_SESSION_TYPES.map((type) => (
          <Chip
            key={type}
            label={sessionTypeLabel(t, type)}
            selected={sessionType === type}
            onPress={() => setSessionType(type)}
          />
        ))}
      </View>

      <Label>{t('library.builder.blocksLabel')}</Label>
      {blocks.length === 0 ? (
        <Text style={styles.empty}>{t('library.builder.empty')}</Text>
      ) : (
        blocks.map((block, index) => (
          <Card key={`${index}-${blockLine(t, block)}`} nested>
            <Text style={styles.blockLine}>{blockLine(t, block)}</Text>
            <View style={styles.chipRow}>
              <Chip
                label={t('library.builder.remove')}
                onPress={() => setBlocks((current) => current.filter((_, i) => i !== index))}
              />
            </View>
          </Card>
        ))
      )}
      {blocks.length > 0 && (
        <Text style={styles.totals}>
          {t('library.customSummary', {
            distance: formatApprox(formatDistanceKm(totals.distanceM)),
            duration: formatApprox(formatDuration(totals.durationS)),
          })}
        </Text>
      )}

      <Button
        label={t('library.builder.addStep')}
        onPress={() => openEditor('step')}
        variant="ghost"
      />
      <Button
        label={t('library.builder.addSeries')}
        onPress={() => openEditor('series')}
        variant="ghost"
      />

      <Button label={t('library.builder.save')} onPress={save} disabled={!canSave} />

      <BlockEditorSheet
        key={editorKey}
        visible={editor !== undefined}
        mode={editor ?? 'step'}
        onSubmit={(block) => setBlocks((current) => [...current, block])}
        onClose={() => setEditor(undefined)}
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
  savedContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: spacing.screenGutter,
    gap: spacing.cardGap,
  },
  savedText: {
    color: colors.text,
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    textAlign: 'center',
  },
  hint: {
    color: colors.textFaint,
    fontSize: typography.caption.fontSize,
  },
  empty: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    lineHeight: 22,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  blockLine: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontVariant: ['tabular-nums'],
  },
  totals: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    fontVariant: ['tabular-nums'],
  },
});
