import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatDistanceKm, formatPace } from '@/i18n';
import { buildSession, currentFlatStep, nextFlatStep, paceCue } from '@/training-engine';
import { useKeepAwake } from '@/services';
import { Button, colors, Label, Pill, radii, spacing, typography } from '@/ui';
import type { PillVariant } from '@/ui';

import { usePhysioStore } from '../profile';
import { PaceTargetBar } from './PaceTargetBar';
import { usePlayerStore } from './player-store';
import {
  blocksToBrief,
  extentLabel,
  formatClock,
  stepCountdownLabel,
  stepHeading,
  stepSummary,
  targetLabel,
} from './session-format';

/**
 * Player de séance (E5-3, charte §4) : timer géant tabular, barre d'allure
 * cible, trio allure/distance/durée (pas de FC temps réel, D6), bannière
 * coaching, prochain bloc, chip GPS, fond teinté vert dans la cible.
 * Aucune règle métier ici — tout vient du store et des fonctions pures.
 */

const GPS_PILL_VARIANT: Record<string, PillVariant> = {
  acquiring: 'muted',
  ok: 'positive',
  weak: 'warn',
  lost: 'warn',
};

/** Sans séance préparée (démo, dev) : séance seuil sur la VMA du profil. */
function useEnsureSession(): void {
  useEffect(() => {
    const store = usePlayerStore.getState();
    store.hydrate();
    if (usePlayerStore.getState().runner === undefined) {
      const vmaKmh = usePhysioStore.getState().profile.vmaKmh?.value;
      const spec = buildSession({ type: 'seuil', vmaKmh });
      store.prepare({
        sessionId: `player-${Date.now()}`,
        sessionType: spec.sessionType,
        blocks: spec.blocks,
      });
    }
  }, []);
}

export function PlayerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  useKeepAwake();
  useEnsureSession();

  const runner = usePlayerStore((state) => state.runner);
  const gpsSignal = usePlayerStore((state) => state.gpsSignal);
  const pace = usePlayerStore((state) => state.smoothedPaceSecPerKm);
  const restored = usePlayerStore((state) => state.restored);
  const gpsDenied = usePlayerStore((state) => state.gpsDenied);
  const [confirmFinish, setConfirmFinish] = useState(false);

  const phase = runner?.phase;
  useEffect(() => {
    if (phase === 'completed' || phase === 'abandoned') {
      router.replace('/player/recap');
    }
  }, [phase, router]);

  if (runner === undefined) {
    return <SafeAreaView style={styles.screen} />;
  }

  if (runner.phase === 'ready') {
    const title =
      runner.title ??
      (runner.sessionType === undefined ? t('player.title') : t(`player.sessionTypes.${runner.sessionType}`));
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.briefContent}>
          <Text style={styles.title}>{title}</Text>
          <Label>{t('player.carte.structure')}</Label>
          {blocksToBrief(runner.blocks).map((line, index) => (
            <View key={`${line.title}-${index}`} style={styles.briefRow}>
              <Text style={styles.briefTitle}>{line.title}</Text>
              {line.subtitle ? <Text style={styles.briefSubtitle}>{line.subtitle}</Text> : null}
            </View>
          ))}
        </ScrollView>
        <View style={styles.footer}>
          <Button
            icon="▶"
            label={t('player.start')}
            onPress={() => void usePlayerStore.getState().start()}
          />
          <Button
            variant="ghost"
            label={t('player.cardMode')}
            onPress={() => router.replace('/player/carte')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const step = currentFlatStep(runner);
  const next = nextFlatStep(runner);
  const cue = step === undefined ? 'no_target' : paceCue(step.step.target, pace);
  const paused = runner.phase === 'paused';
  const inTarget = cue === 'in_target';

  return (
    <SafeAreaView style={styles.screen}>
      {inTarget ? <View pointerEvents="none" style={styles.inTargetGlow} /> : null}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Label>{step === undefined ? '' : stepHeading(step)}</Label>
          <Pill label={t(`player.gps.${gpsSignal}`)} variant={GPS_PILL_VARIANT[gpsSignal] ?? 'muted'} />
        </View>

        {restored ? <Pill label={t('player.restoreBanner')} variant="warn" /> : null}
        {gpsDenied ? <Text style={styles.hint}>{t('player.permissionDenied')}</Text> : null}

        <View style={styles.timerBlock}>
          <Text
            style={styles.timer}
            numberOfLines={1}
            adjustsFontSizeToFit
            accessibilityLabel={t('player.stats.duration')}
          >
            {step === undefined
              ? formatClock(runner.totalElapsedMs / 1000)
              : stepCountdownLabel(step, runner.stepElapsedMs, runner.stepDistanceM)}
          </Text>
          {step === undefined ? null : (
            <Text style={styles.timerSub}>
              {t('player.stepOf', { extent: extentLabel(step.step.extent) })}
            </Text>
          )}
        </View>

        {step !== undefined && step.step.target.type === 'pace' ? (
          <View style={styles.paceBlock}>
            <View style={styles.paceHeader}>
              <Label>{t('player.targetLabel')}</Label>
              <Text style={styles.paceTarget}>{targetLabel(step.step.target)}</Text>
            </View>
            <PaceTargetBar target={step.step.target} smoothedPaceSecPerKm={pace} />
          </View>
        ) : step !== undefined ? (
          <View style={styles.paceHeader}>
            <Label>{t('player.targetLabel')}</Label>
            <Text style={styles.paceTarget}>{targetLabel(step.step.target)}</Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Label>{t('player.stats.pace')}</Label>
            <Text style={styles.statValue}>
              {pace === undefined ? t('player.emptyValue') : formatPace(pace)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Label>{t('player.stats.distance')}</Label>
            <Text style={styles.statValue}>{formatDistanceKm(runner.totalDistanceM)}</Text>
          </View>
          <View style={styles.stat}>
            <Label>{t('player.stats.duration')}</Label>
            <Text style={styles.statValue}>{formatClock(runner.totalElapsedMs / 1000)}</Text>
          </View>
        </View>

        <View style={[styles.coaching, inTarget && styles.coachingPositive]}>
          <Text style={[styles.coachingText, inTarget && styles.coachingTextPositive]}>
            {inTarget ? '✓ ' : ''}
            {t(`player.coaching.${cue}`)}
          </Text>
        </View>

        <View style={styles.nextBlock}>
          <Label>{t('player.nextLabel')}</Label>
          <Text style={styles.nextText}>
            {next === undefined ? t('player.nextNone') : stepSummary(next)}
          </Text>
        </View>

        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={paused ? t('player.controls.resume') : t('player.controls.pause')}
            onPress={() =>
              paused ? usePlayerStore.getState().resume() : usePlayerStore.getState().pause()
            }
            style={styles.pauseButton}
          >
            <Text style={styles.pauseIcon}>{paused ? '▶' : '⏸'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('player.controls.skip')}
            onPress={() => usePlayerStore.getState().skip()}
            style={styles.skipButton}
          >
            <Text style={styles.skipIcon}>⏭</Text>
          </Pressable>
        </View>

        {paused ? (
          confirmFinish ? (
            <View style={styles.finishConfirm}>
              <Text style={styles.hint}>{t('player.finishConfirm.body')}</Text>
              <Button
                label={t('player.finishConfirm.confirm')}
                onPress={() => usePlayerStore.getState().finishNow()}
              />
              <Button
                variant="ghost"
                label={t('player.finishConfirm.cancel')}
                onPress={() => setConfirmFinish(false)}
              />
            </View>
          ) : (
            <Button
              variant="ghost"
              label={t('player.controls.finish')}
              onPress={() => setConfirmFinish(true)}
            />
          )
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const CONTROL_PAUSE_SIZE = 64;
const CONTROL_SKIP_SIZE = 56;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  inTargetGlow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.positiveBg,
  },
  content: {
    flex: 1,
    padding: spacing.screenGutter,
    gap: spacing.cardGap,
  },
  briefContent: {
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
  briefRow: {
    backgroundColor: colors.surface,
    borderRadius: radii.cardNested,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPadding,
    gap: 2,
  },
  briefTitle: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  briefSubtitle: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    fontVariant: ['tabular-nums'],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerBlock: {
    alignItems: 'center',
    gap: 2,
  },
  timer: {
    color: colors.text,
    fontSize: typography.timerGiant.fontSize,
    fontWeight: typography.timerGiant.fontWeight,
    fontVariant: ['tabular-nums'],
  },
  timerSub: {
    color: colors.textMuted,
    fontSize: typography.body.fontSize,
    fontVariant: ['tabular-nums'],
  },
  paceBlock: {
    gap: 8,
  },
  paceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paceTarget: {
    color: colors.action,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.cardGap,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPadding,
    gap: 4,
  },
  statValue: {
    color: colors.text,
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    fontVariant: ['tabular-nums'],
  },
  coaching: {
    borderRadius: radii.cardNested,
    backgroundColor: colors.surface2,
    padding: spacing.cardPadding,
  },
  coachingPositive: {
    backgroundColor: colors.positiveBg,
  },
  coachingText: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    textAlign: 'center',
  },
  coachingTextPositive: {
    color: colors.positive,
  },
  nextBlock: {
    gap: 4,
  },
  nextText: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginTop: 'auto',
  },
  pauseButton: {
    width: CONTROL_PAUSE_SIZE,
    height: CONTROL_PAUSE_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseIcon: {
    color: colors.bg,
    fontSize: 24,
    fontWeight: '700',
  },
  skipButton: {
    width: CONTROL_SKIP_SIZE,
    height: CONTROL_SKIP_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipIcon: {
    color: colors.text,
    fontSize: 20,
  },
  finishConfirm: {
    gap: spacing.cardGap,
  },
  hint: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    textAlign: 'center',
  },
});
