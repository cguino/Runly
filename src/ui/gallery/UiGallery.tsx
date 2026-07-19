import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '../BottomSheet';
import { Button } from '../Button';
import { Card } from '../Card';
import { Chip } from '../Chip';
import { Label } from '../Label';
import { Pill } from '../Pill';
import { StatCardTrio } from '../StatCard';
import { TextField } from '../TextField';
import { colors, spacing, typography } from '../theme';
import { TimelineStepper } from '../TimelineStepper';
import { WeeklyChecklist } from '../WeeklyChecklist';

/**
 * Galerie interne de revue visuelle du design system (Lot 2, gate 🔍).
 * Écran de dev : accessible depuis Profil en build de développement.
 */
export function UiGallery() {
  const { t } = useTranslation();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [checked, setChecked] = useState([true, false, false]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.caption}>{t('gallery.intro')}</Text>

      <Label>{t('gallery.sections.buttons')}</Label>
      <Button label={t('gallery.samples.ctaStart')} icon="▶" onPress={() => {}} />
      <Button label={t('gallery.samples.ctaGhost')} variant="ghost" onPress={() => {}} />

      <Label>{t('gallery.sections.pills')}</Label>
      <View style={styles.rowWrap}>
        <Pill label={t('gallery.samples.pillPositive')} variant="positive" />
        <Pill label={t('gallery.samples.pillWarn')} variant="warn" />
        <Pill label={t('gallery.samples.pillMuted')} variant="muted" />
        <Chip label={t('gallery.samples.chipQuality')} />
        <Chip label={t('gallery.samples.chipRpe')} />
      </View>

      <Label>{t('gallery.sections.cards')}</Label>
      <Card>
        <Text style={styles.cardTitle}>{t('gallery.samples.cardTitle')}</Text>
        <Text style={styles.cardBody}>{t('gallery.samples.cardBody')}</Text>
        <Card nested active>
          <Text style={styles.cardTitle}>{t('gallery.samples.nestedCard')}</Text>
          <Text style={styles.cardCaption}>{t('gallery.samples.nestedCaption')}</Text>
        </Card>
      </Card>

      <Label>{t('gallery.sections.stats')}</Label>
      <StatCardTrio
        items={[
          { label: t('gallery.samples.statDistance'), value: '9,0 km' },
          { label: t('gallery.samples.statDuration'), value: '47 min' },
          { label: t('gallery.samples.statLoad'), value: '282 UA' },
        ]}
      />

      <Label>{t('gallery.sections.timeline')}</Label>
      <Card>
        <TimelineStepper
          steps={[
            {
              title: t('gallery.samples.timelineWarmup'),
              subtitle: t('gallery.samples.timelineWarmupSub'),
              state: 'done',
            },
            {
              title: t('gallery.samples.timelineWork'),
              subtitle: t('gallery.samples.timelineWorkSub'),
              state: 'active',
            },
            {
              title: t('gallery.samples.timelineCooldown'),
              subtitle: t('gallery.samples.timelineCooldownSub'),
              state: 'todo',
            },
          ]}
        />
      </Card>

      <Label>{t('gallery.sections.checklist')}</Label>
      <Card>
        <WeeklyChecklist
          items={[
            {
              day: t('gallery.samples.checkMonday'),
              title: t('gallery.samples.checkMondayTitle'),
              tag: t('gallery.samples.chipQuality'),
              done: checked[0] ?? false,
            },
            {
              day: t('gallery.samples.checkWednesday'),
              title: t('gallery.samples.checkWednesdayTitle'),
              tag: t('gallery.samples.chipRpe'),
              done: checked[1] ?? false,
            },
            {
              day: t('gallery.samples.checkSaturday'),
              title: t('gallery.samples.checkSaturdayTitle'),
              done: checked[2] ?? false,
            },
          ]}
          onToggle={(index) =>
            setChecked((prev) => prev.map((value, i) => (i === index ? !value : value)))
          }
        />
      </Card>

      <Label>{t('gallery.sections.inputs')}</Label>
      <TextField
        value={inputValue}
        onChangeText={setInputValue}
        label={t('gallery.samples.inputLabel')}
        placeholder={t('gallery.samples.inputPlaceholder')}
        unit={t('gallery.samples.inputUnit')}
        keyboardType="decimal-pad"
      />

      <Label>{t('gallery.sections.sheet')}</Label>
      <Button
        label={t('gallery.samples.openSheet')}
        variant="ghost"
        onPress={() => setSheetVisible(true)}
      />
      <BottomSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title={t('gallery.samples.sheetTitle')}
      >
        <Text style={styles.cardBody}>{t('gallery.samples.sheetBody')}</Text>
        <Button label={t('gallery.samples.sheetClose')} onPress={() => setSheetVisible(false)} />
      </BottomSheet>
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
    paddingBottom: 48,
  },
  caption: {
    color: colors.textFaint,
    fontSize: typography.caption.fontSize,
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardCaption: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  cardBody: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
  },
});
