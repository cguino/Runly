import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { SessionBlock, StepRole } from '@/schemas';
import { BottomSheet, Button, Chip, colors, TextField, typography } from '@/ui';

import type { BlockDraft } from './builder-input';
import { draftToBlock } from './builder-input';

/**
 * Éditeur d'un bloc du builder (E4-4) : durée|distance @ allure|zone|RPE,
 * en step simple ou en série (répétitions × travail, récup entre). Le CTA
 * reste désactivé tant que la saisie ne donne pas un bloc valide.
 *
 * UI v1 : une série se compose d'un step de travail — le modèle (E4-1)
 * accepte des séries à steps multiples et imbriquées, l'éditeur suivra
 * les usages.
 */

const ROLES: StepRole[] = ['echauffement', 'travail', 'recuperation', 'retour_calme'];
const ROLE_LABEL_KEYS: Record<StepRole, string> = {
  echauffement: 'blocks.warmup',
  travail: 'blocks.work',
  recuperation: 'blocks.recovery',
  retour_calme: 'blocks.cooldown',
};
const SERIES_REPETITIONS = [2, 3, 4, 5, 6, 8, 10, 12];
const HR_ZONES = [1, 2, 3, 4, 5];
const RPE_VALUES = [2, 3, 4, 5, 6, 7, 8, 9];

function initialDraft(mode: 'step' | 'series'): BlockDraft {
  return {
    repetitions: mode === 'series' ? 4 : 1,
    role: 'travail',
    extentType: 'duration',
    extentValue: '',
    targetType: 'none',
    paceMin: '',
    paceMax: '',
    hrZone: 2,
    rpe: 7,
    recoveryMinutes: '',
  };
}

type BlockEditorSheetProps = {
  visible: boolean;
  /** step = bloc simple ; series = répétitions × travail + récup. */
  mode: 'step' | 'series';
  onSubmit: (block: SessionBlock) => void;
  onClose: () => void;
};

/**
 * Le brouillon repart vierge à chaque ouverture : le parent change la `key`
 * du composant à chaque ouverture (remontage), pas de setState en effect.
 */
export function BlockEditorSheet({ visible, mode, onSubmit, onClose }: BlockEditorSheetProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<BlockDraft>(() => initialDraft(mode));

  const patch = (partial: Partial<BlockDraft>) => setDraft((d) => ({ ...d, ...partial }));
  const block = draftToBlock(draft);

  const confirm = () => {
    if (block !== undefined) {
      onSubmit(block);
      onClose();
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t(
        mode === 'series' ? 'library.builder.block.seriesTitle' : 'library.builder.block.stepTitle',
      )}
    >
      {mode === 'series' ? (
        <>
          <Text style={styles.label}>{t('library.builder.block.repsLabel')}</Text>
          <View style={styles.chipRow}>
            {SERIES_REPETITIONS.map((reps) => (
              <Chip
                key={reps}
                label={`${reps}×`}
                selected={draft.repetitions === reps}
                onPress={() => patch({ repetitions: reps })}
              />
            ))}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.label}>{t('library.builder.block.roleLabel')}</Text>
          <View style={styles.chipRow}>
            {ROLES.map((role) => (
              <Chip
                key={role}
                label={t(ROLE_LABEL_KEYS[role])}
                selected={draft.role === role}
                onPress={() => patch({ role })}
              />
            ))}
          </View>
        </>
      )}

      <Text style={styles.label}>{t('library.builder.block.extentLabel')}</Text>
      <View style={styles.chipRow}>
        <Chip
          label={t('library.builder.block.duration')}
          selected={draft.extentType === 'duration'}
          onPress={() => patch({ extentType: 'duration', extentValue: '' })}
        />
        <Chip
          label={t('library.builder.block.distance')}
          selected={draft.extentType === 'distance'}
          onPress={() => patch({ extentType: 'distance', extentValue: '' })}
        />
      </View>
      <TextField
        value={draft.extentValue}
        onChangeText={(extentValue) => patch({ extentValue })}
        keyboardType="numeric"
        placeholder={t(
          draft.extentType === 'duration'
            ? 'library.builder.block.durationPlaceholder'
            : 'library.builder.block.distancePlaceholder',
        )}
        unit={t(
          draft.extentType === 'duration'
            ? 'library.builder.block.durationUnit'
            : 'library.builder.block.distanceUnit',
        )}
      />

      <Text style={styles.label}>{t('library.builder.block.targetLabel')}</Text>
      <View style={styles.chipRow}>
        <Chip
          label={t('library.builder.block.targetFree')}
          selected={draft.targetType === 'none'}
          onPress={() => patch({ targetType: 'none' })}
        />
        <Chip
          label={t('library.builder.block.targetPace')}
          selected={draft.targetType === 'pace'}
          onPress={() => patch({ targetType: 'pace' })}
        />
        <Chip
          label={t('library.builder.block.targetZone')}
          selected={draft.targetType === 'hrZone'}
          onPress={() => patch({ targetType: 'hrZone' })}
        />
        <Chip
          label={t('library.builder.block.targetRpe')}
          selected={draft.targetType === 'rpe'}
          onPress={() => patch({ targetType: 'rpe' })}
        />
      </View>

      {draft.targetType === 'pace' && (
        <View style={styles.paceRow}>
          <View style={styles.paceField}>
            <TextField
              label={t('library.builder.block.paceMinLabel')}
              value={draft.paceMin}
              onChangeText={(paceMin) => patch({ paceMin })}
              placeholder={t('library.builder.block.pacePlaceholder')}
              unit={t('library.builder.block.paceUnit')}
            />
          </View>
          <View style={styles.paceField}>
            <TextField
              label={t('library.builder.block.paceMaxLabel')}
              value={draft.paceMax}
              onChangeText={(paceMax) => patch({ paceMax })}
              placeholder={t('library.builder.block.pacePlaceholder')}
              unit={t('library.builder.block.paceUnit')}
            />
          </View>
        </View>
      )}
      {draft.targetType === 'hrZone' && (
        <View style={styles.chipRow}>
          {HR_ZONES.map((zone) => (
            <Chip
              key={zone}
              label={t('blocks.hrZone', { n: zone })}
              selected={draft.hrZone === zone}
              onPress={() => patch({ hrZone: zone })}
            />
          ))}
        </View>
      )}
      {draft.targetType === 'rpe' && (
        <View style={styles.chipRow}>
          {RPE_VALUES.map((rpe) => (
            <Chip
              key={rpe}
              label={t('blocks.rpeTarget', { value: rpe })}
              selected={draft.rpe === rpe}
              onPress={() => patch({ rpe })}
            />
          ))}
        </View>
      )}

      {mode === 'series' && (
        <TextField
          label={t('library.builder.block.recoveryLabel')}
          value={draft.recoveryMinutes}
          onChangeText={(recoveryMinutes) => patch({ recoveryMinutes })}
          placeholder={t('library.builder.block.recoveryPlaceholder')}
          keyboardType="numeric"
          unit={t('library.builder.block.durationUnit')}
        />
      )}

      <Button
        label={t('library.builder.block.confirm')}
        onPress={confirm}
        disabled={block === undefined}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
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
  paceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paceField: {
    flex: 1,
  },
});
