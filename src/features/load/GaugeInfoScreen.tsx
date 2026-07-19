import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { Card, colors, spacing, typography } from '@/ui';

/**
 * Écran pédagogie de la jauge (« Comment ça marche ? », E7-2) : 3 sections
 * courtes — charge récente (aiguë), habitude (chronique), ratio.
 * Ton coach bienveillant, tutoiement (charte §5) ; wording passé au filtre
 * de `note-reglementaire-dm.md` (aide à la décision, jamais de prédiction).
 */

const SECTIONS = ['acute', 'chronic', 'ratio'] as const;

export function GaugeInfoScreen() {
  const { t } = useTranslation();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>{t('gauge.info.intro')}</Text>
      {SECTIONS.map((section) => (
        <Card key={section}>
          <Text style={styles.sectionTitle}>{t(`gauge.info.${section}Title`)}</Text>
          <Text style={styles.sectionBody}>{t(`gauge.info.${section}Body`)}</Text>
        </Card>
      ))}
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
  intro: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    lineHeight: 24,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
  },
  sectionBody: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    lineHeight: 24,
  },
  disclaimer: {
    color: colors.textFaint,
    fontSize: typography.caption.fontSize,
    textAlign: 'center',
    marginTop: spacing.cardGap,
  },
});
