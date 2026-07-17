import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, colors, Label, spacing, TimelineStepper, typography } from '@/ui';
import { useKeepAwake } from '@/services';

import { usePlayerStore } from './player-store';
import { blocksToBrief } from './session-format';

/**
 * Mode carte (E5-6) : l'utilisateur court avec sa montre — pas de tracking
 * ici, juste le brief de séance consultable écran actif. La séance remonte
 * ensuite via la santé et le matching différé (E6-5) la rapproche de la
 * séance planifiée.
 */
export function CardModeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  useKeepAwake();
  const runner = usePlayerStore((state) => state.runner);

  const title =
    runner?.title ??
    (runner?.sessionType === undefined
      ? t('player.title')
      : t(`player.sessionTypes.${runner.sessionType}`));

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('player.carte.title')}</Text>
        <Text style={styles.body}>{t('player.carte.body')}</Text>
        <Card>
          <Label>{t('player.carte.structure')}</Label>
          <Text style={styles.sessionTitle}>{title}</Text>
          <TimelineStepper
            steps={blocksToBrief(runner?.blocks ?? []).map((line) => ({
              title: line.title,
              subtitle: line.subtitle,
              state: 'todo' as const,
            }))}
          />
        </Card>
        <Text style={styles.hint}>{t('player.carte.matching')}</Text>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          label={t('player.carte.done')}
          onPress={() => {
            usePlayerStore.getState().reset();
            router.dismissTo('/');
          }}
        />
      </View>
    </SafeAreaView>
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
  footer: {
    padding: spacing.screenGutter,
    gap: spacing.cardGap,
  },
  title: {
    color: colors.text,
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
  },
  body: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
  },
  sessionTitle: {
    color: colors.text,
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
  },
  hint: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
  },
});
