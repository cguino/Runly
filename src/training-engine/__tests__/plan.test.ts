import type { PlannedSession, SessionBlock, TrainingPlan } from '@/schemas';

import { personas } from '../__fixtures__/personas';
import { generatePlan, placeWeekSessions, WEEKLY_GROWTH } from '../plan';
import { isKeySession } from '../plan-adjust';
import { estimateBlocksKm } from '../session-templates';

function expectPlan(name: string): { plan: TrainingPlan; recommendations: string[] } {
  const input = personas[name];
  expect(input).toBeDefined();
  const result = generatePlan(input!);
  expect(result.outcome).toBe('plan');
  if (result.outcome !== 'plan') {
    throw new Error('unreachable');
  }
  return result;
}

function isQuality(session: PlannedSession): boolean {
  return isKeySession(session) && session.sessionType !== 'sortie_longue';
}

function hasPaceTarget(blocks: SessionBlock[]): boolean {
  return blocks.some((b) =>
    b.kind === 'step'
      ? b.target.type === 'pace'
      : hasPaceTarget(b.blocks) || (b.recovery !== undefined && b.recovery.target.type === 'pace'),
  );
}

describe('generatePlan — refus et garde-fous (E3-1)', () => {
  it('refuse < 2 séances/sem (spec §5)', () => {
    const input = personas['marc-semi-14sem-3j']!;
    const result = generatePlan({
      ...input,
      context: { ...input.context, sessionsPerWeek: 1 },
    });
    expect(result).toEqual({ outcome: 'refused', reason: 'too_few_sessions' });
  });

  it('refuse une date de course passée', () => {
    const input = personas['marc-semi-14sem-3j']!;
    const result = generatePlan({
      ...input,
      goal: { ...input.goal, raceDate: '2026-07-01' },
    });
    expect(result).toEqual({ outcome: 'refused', reason: 'race_date_not_ahead' });
  });

  it('objectif irréaliste → raisons + alternatives (autre objectif, finir, date ultérieure)', () => {
    const result = generatePlan(personas['objectif-irrealiste']!);
    expect(result.outcome).toBe('unrealistic');
    if (result.outcome !== 'unrealistic') {
      throw new Error('unreachable');
    }
    expect(result.reasons).toEqual(
      expect.arrayContaining(['too_few_weeks', 'volume_gap', 'pace_above_capacity']),
    );
    const types = result.alternatives.map((a) => a.type);
    expect(types).toEqual(['finish_ambition', 'later_date', 'other_goal']);
    const otherGoal = result.alternatives.find((a) => a.type === 'other_goal');
    expect(otherGoal).toEqual({ type: 'other_goal', raceDistance: '10k' });
  });

  it('recommande ≥ 3 séances pour un chrono à 2 j/sem (persona 5K débutant)', () => {
    const result = expectPlan('5k-debutant-2j');
    expect(result.recommendations).toContain('recommend_three_sessions_for_chrono');
  });
});

describe('generatePlan — propriétés du plan (spec §7.2)', () => {
  const planPersonas = [
    'marc-semi-14sem-3j',
    'marathon-prudent-post-blessure',
    '5k-debutant-2j',
    '10k-chrono-5j',
    'sans-historique',
  ] as const;

  it('Marc : 14 semaines datées, affûtage présent', () => {
    const { plan } = expectPlan('marc-semi-14sem-3j');
    expect(plan.weeks).toHaveLength(14);
    const taper = plan.phases.find((p) => p.type === 'affutage');
    expect(taper).toBeDefined();
    expect(taper!.weekCount).toBeGreaterThanOrEqual(1);
    // Toutes les séances sont datées dans la fenêtre du plan.
    for (const week of plan.weeks) {
      for (const session of week.sessions) {
        expect(session.scheduledDate >= '2026-07-20').toBe(true);
        expect(session.scheduledDate <= '2026-10-25').toBe(true);
      }
    }
  });

  it.each(planPersonas)(
    '%s : progression ≤ 10 %% (8 %% si antécédent) entre semaines de charge',
    (name) => {
      const input = personas[name]!;
      const { plan } = expectPlan(name);
      const rate = input.context.injuryWithin12Months
        ? WEEKLY_GROWTH.cautious
        : WEEKLY_GROWTH.standard;
      const taperStart = plan.phases.find((p) => p.type === 'affutage')!.startWeekIndex;
      let lastLoad: number | undefined;
      for (const week of plan.weeks) {
        if (week.weekIndex >= taperStart || week.isRecovery) {
          continue;
        }
        const volume = week.targetVolumeKm!;
        if (lastLoad !== undefined) {
          expect(volume).toBeLessThanOrEqual(lastLoad * (1 + rate) + 0.5);
        }
        lastLoad = volume;
      }
    },
  );

  it.each(planPersonas)('%s : 1 semaine allégée / 3-4 en phase de charge', (name) => {
    const { plan } = expectPlan(name);
    const taperStart = plan.phases.find((p) => p.type === 'affutage')!.startWeekIndex;
    const buildWeeks = plan.weeks.filter((w) => w.weekIndex < taperStart);
    if (buildWeeks.length >= 4) {
      expect(buildWeeks.some((w) => w.isRecovery)).toBe(true);
    }
    // Jamais deux semaines allégées d'affilée.
    for (let i = 1; i < buildWeeks.length; i += 1) {
      expect(buildWeeks[i]!.isRecovery && buildWeeks[i - 1]!.isRecovery).toBe(false);
    }
  });

  it.each(planPersonas)('%s : volume majoritairement facile (~80 %% EF)', (name) => {
    const input = personas[name]!;
    const vma = input.physio.vmaKmh;
    const workSpeed = vma !== undefined ? vma * 0.87 : 12;

    // Volume « dur » = les steps de travail des séances de qualité uniquement —
    // échauffement, récupérations et retour au calme restent du volume facile.
    const hardKm = (blocks: SessionBlock[]): number =>
      blocks.reduce((sum, block) => {
        if (block.kind === 'series') {
          return sum + block.repetitions * hardKm(block.blocks);
        }
        if (block.role !== 'travail') {
          return sum;
        }
        return (
          sum +
          (block.extent.type === 'distance'
            ? block.extent.meters / 1000
            : (block.extent.seconds / 3600) * workSpeed)
        );
      }, 0);

    const { plan } = expectPlan(name);
    for (const week of plan.weeks) {
      const total = week.sessions.reduce((sum, s) => sum + estimateBlocksKm(s.blocks, vma), 0);
      const hard = week.sessions.filter(isQuality).reduce((sum, s) => sum + hardKm(s.blocks), 0);
      expect((total - hard) / total).toBeGreaterThanOrEqual(0.7);
    }
  });

  it.each(planPersonas)(
    '%s : jamais 2 qualités d’affilée, pas de qualité la veille de la SL',
    (name) => {
      const { plan } = expectPlan(name);
      for (const week of plan.weeks) {
        const sorted = [...week.sessions].sort((a, b) =>
          a.scheduledDate.localeCompare(b.scheduledDate),
        );
        for (let i = 1; i < sorted.length; i += 1) {
          const prev = sorted[i - 1]!;
          const curr = sorted[i]!;
          const consecutive =
            new Date(`${curr.scheduledDate}T00:00:00Z`).getTime() -
              new Date(`${prev.scheduledDate}T00:00:00Z`).getTime() ===
            86_400_000;
          if (consecutive) {
            expect(isQuality(prev) && isQuality(curr)).toBe(false);
            expect(isQuality(prev) && curr.sessionType === 'sortie_longue').toBe(false);
          }
        }
      }
    },
  );

  it('10K 5 j/sem : 2 qualités/sem en phase spécifique', () => {
    const { plan } = expectPlan('10k-chrono-5j');
    const specific = plan.phases.find((p) => p.type === 'specifique')!;
    const specificWeeks = plan.weeks.filter(
      (w) =>
        w.weekIndex >= specific.startWeekIndex &&
        w.weekIndex < specific.startWeekIndex + specific.weekCount &&
        !w.isRecovery,
    );
    expect(specificWeeks.length).toBeGreaterThan(0);
    for (const week of specificWeeks) {
      expect(week.sessions.filter(isQuality)).toHaveLength(2);
    }
  });

  it('sans historique : aucune cible allure — zones FC et RPE uniquement', () => {
    const { plan } = expectPlan('sans-historique');
    for (const week of plan.weeks) {
      for (const session of week.sessions) {
        expect(hasPaceTarget(session.blocks)).toBe(false);
      }
    }
  });

  it('chaque semaine de charge contient exactement 1 sortie longue', () => {
    const { plan } = expectPlan('marc-semi-14sem-3j');
    const lastWeek = plan.weeks[plan.weeks.length - 1]!;
    for (const week of plan.weeks) {
      const longRuns = week.sessions.filter((s) => s.sessionType === 'sortie_longue');
      expect(longRuns).toHaveLength(week === lastWeek ? 0 : 1);
    }
  });
});

describe('placeWeekSessions (E3-2)', () => {
  it('place la SL sur le dernier jour et la qualité loin de la SL', () => {
    const { assignments, downgraded } = placeWeekSessions([1, 3, 6], 3, ['seuil'], {
      includeLongRun: true,
    });
    expect(downgraded).toBe(false);
    expect(assignments).toEqual([
      { day: 1, type: 'seuil' },
      { day: 3, type: 'ef' },
      { day: 6, type: 'sortie_longue' },
    ]);
  });

  it('rétrograde la qualité en EF quand seuls des jours adjacents à la SL restent', () => {
    const { assignments, downgraded } = placeWeekSessions([5, 6], 2, ['vma_court'], {
      includeLongRun: true,
    });
    expect(downgraded).toBe(true);
    expect(assignments).toEqual([
      { day: 5, type: 'ef' },
      { day: 6, type: 'sortie_longue' },
    ]);
  });

  it('ne place jamais 2 qualités sur des jours consécutifs', () => {
    const { assignments } = placeWeekSessions([0, 1, 2, 4, 6], 5, ['seuil', 'vma_court'], {
      includeLongRun: true,
    });
    const qualityDays = assignments.filter((a) => a.type !== 'ef' && a.type !== 'sortie_longue');
    for (let i = 1; i < qualityDays.length; i += 1) {
      expect(Math.abs(qualityDays[i]!.day - qualityDays[i - 1]!.day)).toBeGreaterThan(1);
    }
  });
});
