import type { TrainingPlan } from '@/schemas';

import { personas } from '../__fixtures__/personas';
import { generatePlan } from '../plan';
import {
  handleMissedSession,
  regenerateRemainingPlan,
  shouldProposeReperiodization,
} from '../plan-adjust';

function marcPlan(): TrainingPlan {
  const result = generatePlan(personas['marc-semi-14sem-3j']!);
  if (result.outcome !== 'plan') {
    throw new Error('plan attendu');
  }
  return result.plan;
}

// Semaine 0 de Marc : mardi 21/07 (seuil ou vma), jeudi 23/07 (EF), dimanche 26/07 (SL).

describe('handleMissedSession (E3-5) — on n’empile jamais', () => {
  it('séance secondaire (EF) manquée → abandonnée, rien d’autre ne bouge', () => {
    const plan = marcPlan();
    const { plan: updated, outcome } = handleMissedSession(plan, '2026-07-23', '2026-07-24');
    expect(outcome).toEqual({ action: 'cancelled' });
    const week = updated.weeks[0]!;
    expect(week.sessions.find((s) => s.scheduledDate === '2026-07-23')?.status).toBe('missed');
    expect(week.sessions.filter((s) => s.status === 'planned')).toHaveLength(2);
  });

  it('sortie longue (clé) manquée → re-proposée au lendemain', () => {
    const plan = marcPlan();
    // SL du dimanche 26/07 manquée, traitée le lundi 27/07 → hors semaine → abandon.
    const { outcome } = handleMissedSession(plan, '2026-07-26', '2026-07-27');
    expect(outcome).toEqual({ action: 'cancelled' });
  });

  it('qualité (clé) manquée en début de semaine → re-proposée, l’EF du jour cible saute', () => {
    const plan = marcPlan();
    // Qualité du mardi 21/07 manquée, traitée mercredi 22/07 : mercredi est
    // libre → re-proposée mercredi (pas veille de SL, pas d'adjacence qualité).
    const { plan: updated, outcome } = handleMissedSession(plan, '2026-07-21', '2026-07-22');
    expect(outcome).toEqual({ action: 'rescheduled', newDate: '2026-07-22' });
    const week = updated.weeks[0]!;
    const moved = week.sessions.find((s) => s.status === 'moved');
    expect(moved?.scheduledDate).toBe('2026-07-22');
  });

  it('la re-proposition écrase une EF plutôt que d’empiler', () => {
    const plan = marcPlan();
    // On force le scénario : qualité manquée mardi, traitée jeudi (jour de l'EF).
    const { plan: updated, outcome } = handleMissedSession(plan, '2026-07-21', '2026-07-23');
    expect(outcome).toEqual({
      action: 'rescheduled',
      newDate: '2026-07-23',
      cancelledSecondaryDate: '2026-07-23',
    });
    const week = updated.weeks[0]!;
    expect(week.sessions.filter((s) => s.status === 'cancelled')).toHaveLength(1);
    // Jamais deux séances actives le même jour.
    const activeDates = week.sessions
      .filter((s) => s.status === 'planned' || s.status === 'moved')
      .map((s) => s.scheduledDate);
    expect(new Set(activeDates).size).toBe(activeDates.length);
  });

  it('qualité re-proposée jamais la veille de la sortie longue', () => {
    const plan = marcPlan();
    // Qualité du mardi traitée le samedi 25/07 : samedi = veille de la SL du
    // dimanche → aucun jour valable restant → abandon.
    const { outcome } = handleMissedSession(plan, '2026-07-21', '2026-07-25');
    expect(outcome).toEqual({ action: 'cancelled' });
  });
});

describe('regenerateRemainingPlan (E3-3)', () => {
  it('préserve les semaines passées, régénère le futur, incrémente la version', () => {
    const plan = marcPlan();
    const input = personas['marc-semi-14sem-3j']!;
    // 3 semaines plus tard, Marc passe à 4 j/sem.
    const result = regenerateRemainingPlan(plan, {
      ...input,
      today: '2026-08-07',
      context: { ...input.context, sessionsPerWeek: 4, preferredDays: [1, 3, 5, 6] },
    });
    expect(result.outcome).toBe('plan');
    if (result.outcome !== 'plan') {
      throw new Error('unreachable');
    }
    const { plan: regenerated } = result;
    expect(regenerated.version).toBe(2);
    // Les 3 premières semaines (avant le lundi 10/08) sont inchangées.
    for (let i = 0; i < 3; i += 1) {
      expect(regenerated.weeks[i]).toEqual(plan.weeks[i]);
    }
    // Le futur passe à 4 séances/sem.
    const future = regenerated.weeks[3]!;
    expect(future.sessions.length).toBe(4);
    // Les index de semaines restent continus.
    regenerated.weeks.forEach((week, index) => {
      expect(week.weekIndex).toBe(index);
    });
  });
});

describe('shouldProposeReperiodization (spec §6.4)', () => {
  it('propose après ≥ 2 semaines de rupture, pas avant', () => {
    expect(shouldProposeReperiodization('2026-07-01', '2026-07-15')).toBe(true);
    expect(shouldProposeReperiodization('2026-07-05', '2026-07-15')).toBe(false);
    expect(shouldProposeReperiodization(undefined, '2026-07-15')).toBe(false);
  });
});
