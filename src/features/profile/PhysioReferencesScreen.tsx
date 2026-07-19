import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatDateFr, formatDecimal } from '@/i18n';
import type { Confidence, PhysioField, PhysioValue } from '@/schemas';
import { hrZoneBpm } from '@/training-engine';
import { colors, Pill, radii, spacing, typography } from '@/ui';

import { usePhysioStore } from './physio-store';

/**
 * Écran Profil > Références physio (E2-4, E2-5) : valeurs éditables, badges
 * de provenance, historique des révisions, protocole demi-Cooper expliqué,
 * proposition de recalcul jamais imposée.
 */

const CONFIDENCE_VARIANT: Record<Confidence, 'positive' | 'warn'> = {
  mesure: 'positive',
  estime: 'warn',
  defaut: 'warn',
};

const FIELD_DECIMALS: Record<PhysioField, number> = {
  vmaKmh: 1,
  fcmaxBpm: 0,
  sv1PctVma: 0,
  sv2PctVma: 0,
};

/** Parse une saisie française (« 16,8 ») en nombre, sinon undefined. */
function parseFrenchNumber(raw: string): number | undefined {
  const parsed = Number(raw.trim().replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function PhysioValueRow({ field, physioValue }: { field: PhysioField; physioValue?: PhysioValue }) {
  const { t } = useTranslation();
  const setManualValue = usePhysioStore((state) => state.setManualValue);
  const [draft, setDraft] = useState<string | undefined>(undefined);

  const displayed =
    physioValue === undefined ? '' : formatDecimal(physioValue.value, FIELD_DECIMALS[field]);

  const commit = () => {
    if (draft !== undefined) {
      const parsed = parseFrenchNumber(draft);
      if (parsed !== undefined && parsed !== physioValue?.value) {
        setManualValue(field, parsed);
      }
    }
    setDraft(undefined);
  };

  return (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.rowLabel}>{t(`physio.fields.${field}`)}</Text>
        {physioValue ? (
          <Pill
            label={t(`physio.confidence.${physioValue.confidence}`)}
            variant={CONFIDENCE_VARIANT[physioValue.confidence]}
          />
        ) : (
          <Pill label={t('physio.emptyValue')} variant="muted" />
        )}
      </View>
      <View style={styles.rowValue}>
        <TextInput
          style={styles.valueInput}
          value={draft ?? displayed}
          onChangeText={setDraft}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="decimal-pad"
          placeholder={t('physio.emptyValue')}
          placeholderTextColor={colors.textMuted}
        />
        <Text style={styles.valueUnit}>{t(`physio.units.${field}`)}</Text>
      </View>
    </View>
  );
}

function RecalcBanner() {
  const { t } = useTranslation();
  const proposal = usePhysioStore((state) => state.recalcProposal);
  const acceptRecalc = usePhysioStore((state) => state.acceptRecalc);
  const dismissRecalc = usePhysioStore((state) => state.dismissRecalc);

  if (proposal === undefined) {
    return null;
  }
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerTitle}>
        {t('physio.recalcTitle', { value: formatDecimal(proposal.proposedVmaKmh, 1) })}
      </Text>
      <Text style={styles.bannerBody}>{t('physio.recalcBody')}</Text>
      <View style={styles.bannerActions}>
        <Pressable
          accessibilityRole="button"
          style={styles.bannerAccept}
          onPress={() => acceptRecalc()}
        >
          <Text style={styles.bannerAcceptLabel}>{t('physio.recalcAccept')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.bannerKeep} onPress={dismissRecalc}>
          <Text style={styles.bannerKeepLabel}>{t('physio.recalcKeep')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ZonesCard() {
  const { t } = useTranslation();
  const zones = usePhysioStore((state) => state.profile.zones);
  const fcmax = usePhysioStore((state) => state.profile.fcmaxBpm);

  if (!zones) {
    return null;
  }
  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>{t('physio.zonesTitle')}</Text>
      {zones.map((zone) => {
        const bpm = fcmax ? hrZoneBpm(fcmax.value, zone) : undefined;
        return (
          <View key={zone.zone} style={styles.zoneRow}>
            <Text style={styles.zoneName}>{t('physio.zoneLabel', { n: zone.zone })}</Text>
            <Text style={styles.zoneRange}>
              {bpm
                ? t('physio.zoneBpm', { min: bpm.minBpm, max: bpm.maxBpm })
                : t('physio.zonePct', { min: zone.minPctFcmax, max: zone.maxPctFcmax })}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function RevisionsCard() {
  const { t } = useTranslation();
  const revisions = usePhysioStore((state) => state.profile.revisions);

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>{t('physio.revisionsTitle')}</Text>
      {revisions.length === 0 ? (
        <Text style={styles.cardCaption}>{t('physio.revisionsEmpty')}</Text>
      ) : (
        [...revisions].reverse().map((revision, index) => (
          <View key={`${revision.at}-${index}`} style={styles.revisionRow}>
            <Text style={styles.revisionMain}>
              {t(`physio.fields.${revision.field}`)} →{' '}
              {formatDecimal(revision.newValue, FIELD_DECIMALS[revision.field])}{' '}
              {t(`physio.units.${revision.field}`)}
            </Text>
            <Text style={styles.cardCaption}>
              {revision.source === 'manuel'
                ? t('physio.revisionManual')
                : t('physio.revisionRecalc')}
              {revision.previousValue !== null
                ? ` · ${t('physio.revisionFrom', { value: formatDecimal(revision.previousValue, FIELD_DECIMALS[revision.field]) })}`
                : ''}
              {` · ${formatDateFr(revision.at)}`}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

export function PhysioReferencesScreen() {
  const { t } = useTranslation();
  const vmaKmh = usePhysioStore((s) => s.profile.vmaKmh);
  const fcmaxBpm = usePhysioStore((s) => s.profile.fcmaxBpm);
  const sv1PctVma = usePhysioStore((s) => s.profile.sv1PctVma);
  const sv2PctVma = usePhysioStore((s) => s.profile.sv2PctVma);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.caption}>{t('physio.intro')}</Text>
      <RecalcBanner />
      <View style={styles.card}>
        <PhysioValueRow field="vmaKmh" physioValue={vmaKmh} />
        <PhysioValueRow field="fcmaxBpm" physioValue={fcmaxBpm} />
        <PhysioValueRow field="sv1PctVma" physioValue={sv1PctVma} />
        <PhysioValueRow field="sv2PctVma" physioValue={sv2PctVma} />
      </View>
      <ZonesCard />
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>{t('physio.cooperTitle')}</Text>
        <Text style={styles.cardCaption}>{t('physio.cooperBody')}</Text>
      </View>
      <RevisionsCard />
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPadding,
    gap: spacing.cardGap,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    letterSpacing: typography.label.letterSpacing,
    textTransform: typography.label.textTransform,
  },
  row: {
    gap: 4,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  rowValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  valueInput: {
    color: colors.text,
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    fontVariant: ['tabular-nums'],
    padding: 0,
    minWidth: 72,
  },
  valueUnit: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  zoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  zoneName: {
    color: colors.text,
    fontSize: typography.body.fontSize,
  },
  zoneRange: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    fontVariant: ['tabular-nums'],
  },
  revisionRow: {
    gap: 2,
  },
  revisionMain: {
    color: colors.text,
    fontSize: typography.body.fontSize,
  },
  caption: {
    color: colors.textFaint,
    fontSize: typography.caption.fontSize,
    lineHeight: 17,
  },
  cardCaption: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    lineHeight: 17,
  },
  banner: {
    backgroundColor: colors.warnBg,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: 8,
  },
  bannerTitle: {
    color: colors.warn,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  bannerBody: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  bannerActions: {
    flexDirection: 'row',
    gap: spacing.cardGap,
    marginTop: 4,
  },
  bannerAccept: {
    backgroundColor: colors.action,
    borderRadius: radii.cta,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bannerAcceptLabel: {
    color: colors.onAction,
    fontWeight: '700',
  },
  bannerKeep: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.cta,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bannerKeepLabel: {
    color: colors.textMuted,
    fontWeight: '600',
  },
});
