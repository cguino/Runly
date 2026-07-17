import { Link } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text } from 'react-native';

import {
  AlertBanner,
  latestEntryWithoutFeedback,
  LoadGaugeCard,
  useJournalStore,
  useLoadStore,
  usePlanStore,
  WeekOverviewCard,
} from '@/features';
import { colors, radii, spacing, typography } from '@/ui';

/**
 * Accueil : jauge de charge ACWR + bannière d'alerte (Lot 7) et semaine
 * 7 jours fixes lun→dim avec jours de repos et statuts (Lot 8, E8-1).
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const entries = useJournalStore((state) => state.entries);
  const refresh = useLoadStore((state) => state.refresh);
  const activeAlert = useLoadStore((state) => state.activeAlert);
  const pendingFeedback = latestEntryWithoutFeedback(entries) !== undefined;

  // Le plan (ou la semaine type) alimente la jauge prévisionnelle (E7-3/E8).
  useEffect(() => {
    usePlanStore.getState().hydrateFromOnboarding();
    usePlanStore.getState().ensureCurrentWeek();
  }, []);

  // La jauge se recalcule à chaque évolution du journal (séance ajoutée, RPE noté).
  useEffect(() => {
    refresh();
  }, [refresh, entries]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('screens.home.title')}</Text>
      {activeAlert !== undefined && <AlertBanner alert={activeAlert} />}
      <LoadGaugeCard />
      <WeekOverviewCard />
      {pendingFeedback && (
        <Link href="/rpe-entry" style={styles.rowLink}>
          <Text style={styles.rowLabel}>{t('load.rpePrompt')}</Text>
        </Link>
      )}
      <Link href="/manual-workout" style={styles.rowLink}>
        <Text style={styles.rowLabel}>{t('screensHome.addManualWorkout')}</Text>
      </Link>
      <Text style={styles.disclaimer}>{t('load.disclaimer')}</Text>
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
    marginBottom: spacing.cardGap,
  },
  rowLink: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPadding,
  },
  rowLabel: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  disclaimer: {
    color: colors.textFaint,
    fontSize: typography.caption.fontSize,
    textAlign: 'center',
    marginTop: spacing.cardGap,
  },
});
