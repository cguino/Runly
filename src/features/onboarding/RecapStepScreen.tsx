import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { formatDecimal } from '@/i18n';
import { Button, Card, Chip, colors, Label, spacing, StatCardTrio, typography } from '@/ui';

import { useOnboardingStore } from './onboarding-store';
import { StepScreen } from './StepScreen';

const BRAND_KEYS = ['garmin', 'coros', 'polar', 'suunto', 'applewatch'] as const;

type Phase = 'summary' | 'pedagogy' | 'watch';

/**
 * OB6 — Restitution (E1-6) : « Voici ton plan de N semaines » (résumé du
 * plan généré) OU « Compose ta semaine type » (D5, sans objectif) ; puis
 * 3 écrans courts de pédagogie jauge ; puis guides d'activation du partage
 * santé par marque de montre (friction n°1, spike-sources-donnees.md).
 */
export function RecapStepScreen() {
  const { t } = useTranslation();
  const plan = useOnboardingStore((state) => state.plan);
  const context = useOnboardingStore((state) => state.context);
  const complete = useOnboardingStore((state) => state.complete);

  const [phase, setPhase] = useState<Phase>('summary');
  const [pedagogyStep, setPedagogyStep] = useState<1 | 2 | 3>(1);

  const finish = () => {
    complete();
    router.replace('/');
  };

  if (phase === 'summary') {
    return (
      <StepScreen
        title={
          plan !== undefined
            ? t('onboarding.restitution.planTitle', { weeks: plan.weeks.length })
            : t('onboarding.restitution.weekTypeTitle')
        }
        intro={
          plan !== undefined
            ? t('onboarding.restitution.planBody')
            : t('onboarding.restitution.weekTypeBody')
        }
      >
        {plan !== undefined ? (
          <>
            <StatCardTrio
              items={[
                { label: t('onboarding.restitution.statWeeks'), value: String(plan.weeks.length) },
                {
                  label: t('onboarding.restitution.statSessions'),
                  value: String(context.sessionsPerWeek),
                },
                {
                  label: t('onboarding.restitution.statPeak'),
                  value: `${formatDecimal(
                    Math.max(...plan.weeks.map((week) => week.targetVolumeKm ?? 0)),
                    1,
                  )} km`,
                },
              ]}
            />
            <View style={styles.chipRow}>
              {plan.phases.map((planPhase) => (
                <Chip
                  key={planPhase.type}
                  label={`${t(`onboarding.restitution.phases.${planPhase.type}`)} · ${t(
                    'onboarding.restitution.phaseWeeks',
                    { count: planPhase.weekCount },
                  )}`}
                />
              ))}
            </View>
          </>
        ) : null}
        <Button
          label={t('onboarding.restitution.pedagogyNext')}
          onPress={() => setPhase('pedagogy')}
        />
      </StepScreen>
    );
  }

  if (phase === 'pedagogy') {
    const next = () => {
      if (pedagogyStep < 3) {
        setPedagogyStep((pedagogyStep + 1) as 2 | 3);
      } else {
        setPhase('watch');
      }
    };
    return (
      <StepScreen title={t(`onboarding.restitution.pedagogy${pedagogyStep}Title`)}>
        <Label>{t('onboarding.restitution.pedagogyLabel', { step: pedagogyStep })}</Label>
        <Card>
          <Text style={styles.body}>{t(`onboarding.restitution.pedagogy${pedagogyStep}Body`)}</Text>
        </Card>
        <Button label={t('onboarding.restitution.pedagogyNext')} onPress={next} />
      </StepScreen>
    );
  }

  return (
    <StepScreen
      title={t('onboarding.restitution.watchTitle')}
      intro={t('onboarding.restitution.watchBody')}
    >
      {BRAND_KEYS.map((brand) => (
        <Card key={brand} nested>
          <Label>{t(`onboarding.restitution.brands.${brand}`)}</Label>
          <Text style={styles.caption}>{t(`onboarding.restitution.brands.${brand}Body`)}</Text>
        </Card>
      ))}
      <Text style={styles.disclaimer}>{t('onboarding.restitution.disclaimer')}</Text>
      <Button label={t('onboarding.restitution.cta')} onPress={finish} />
    </StepScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    lineHeight: 22,
  },
  caption: {
    color: colors.textMuted,
    fontSize: typography.caption.fontSize,
    lineHeight: 17,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.cardGap,
  },
  disclaimer: {
    color: colors.textFaint,
    fontSize: typography.caption.fontSize,
    textAlign: 'center',
  },
});
