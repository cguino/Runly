import { addDays, dayOfWeek, diffDays, nextMonday } from '@/lib/dates';
import type { PlannedSession, PlannedWeek, TrainingPlan } from '@/schemas';

import { generatePlan } from './plan';
import type { MissedSessionOutcome, PlanGenerationResult, PlanInput } from './plan-types';

/**
 * Ajustements de plan (E3-3, E3-5) — fonctions pures.
 * Principe spec §6.4 : on ne « rattrape » jamais en empilant.
 */

/** Une séance est « clé » si c'est la sortie longue ou une qualité. */
export function isKeySession(session: PlannedSession): boolean {
  return session.sessionType !== 'ef' && session.sessionType !== 'recuperation';
}

/** Rupture ≥ 2 semaines sans séance réalisée → re-périodisation proposée (spec §6.4). */
export const REPERIODIZATION_GAP_DAYS = 14;

export function shouldProposeReperiodization(
  lastCompletedDate: string | undefined,
  today: string,
): boolean {
  if (lastCompletedDate === undefined) {
    return false;
  }
  return diffDays(lastCompletedDate, today) >= REPERIODIZATION_GAP_DAYS;
}

/**
 * Séance manquée traitée à J+1 (E3-5) :
 * - séance secondaire (EF/récup) → abandonnée, on n'empile jamais ;
 * - séance clé → re-proposée au premier jour libre restant de SA semaine
 *   (en respectant : pas 2 qualités d'affilée, pas de qualité la veille de
 *   la sortie longue) ; si le jour est pris par une EF, l'EF est abandonnée ;
 *   si aucun jour ne convient → abandonnée.
 * Retourne le plan mis à jour (nouvelle référence) + l'issue.
 */
export function handleMissedSession(
  plan: TrainingPlan,
  missedDate: string,
  today: string,
): { plan: TrainingPlan; outcome: MissedSessionOutcome } {
  const weekIndex = plan.weeks.findIndex((w) =>
    w.sessions.some((s) => s.scheduledDate === missedDate && s.status === 'planned'),
  );
  const week = plan.weeks[weekIndex];
  if (week === undefined) {
    return { plan, outcome: { action: 'cancelled' } };
  }
  const missed = week.sessions.find(
    (s) => s.scheduledDate === missedDate && s.status === 'planned',
  );
  if (missed === undefined) {
    return { plan, outcome: { action: 'cancelled' } };
  }

  const updateWeek = (sessions: PlannedSession[]): TrainingPlan => ({
    ...plan,
    weeks: plan.weeks.map((w, i) => (i === weekIndex ? { ...w, sessions } : w)),
  });

  if (!isKeySession(missed)) {
    return {
      plan: updateWeek(week.sessions.map((s) => (s === missed ? { ...s, status: 'missed' } : s))),
      outcome: { action: 'cancelled' },
    };
  }

  // Séance clé : chercher un jour de re-proposition dans la semaine restante.
  const weekStart = addDays(missedDate, -dayOfWeek(missedDate));
  const weekEnd = addDays(weekStart, 6);
  const isQuality = missed.sessionType !== 'sortie_longue';
  const others = week.sessions.filter((s) => s !== missed);

  const occupiedKey = (date: string) =>
    others.some((s) => s.scheduledDate === date && s.status === 'planned' && isKeySession(s));
  const qualityAdjacent = (date: string) =>
    others.some(
      (s) =>
        s.status === 'planned' &&
        isKeySession(s) &&
        s.sessionType !== 'sortie_longue' &&
        Math.abs(diffDays(s.scheduledDate, date)) === 1,
    );
  const beforeLongRun = (date: string) =>
    others.some(
      (s) =>
        s.status === 'planned' &&
        s.sessionType === 'sortie_longue' &&
        diffDays(date, s.scheduledDate) === 1,
    );

  let candidate = today > missedDate ? today : addDays(missedDate, 1);
  while (candidate <= weekEnd) {
    const blockedForQuality = isQuality && (qualityAdjacent(candidate) || beforeLongRun(candidate));
    if (!occupiedKey(candidate) && !blockedForQuality) {
      const displacedEf = others.find(
        (s) => s.scheduledDate === candidate && s.status === 'planned' && !isKeySession(s),
      );
      const sessions = week.sessions.map((s) => {
        if (s === missed) {
          return { ...s, scheduledDate: candidate, status: 'moved' as const };
        }
        if (displacedEf !== undefined && s === displacedEf) {
          return { ...s, status: 'cancelled' as const };
        }
        return s;
      });
      return {
        plan: updateWeek(sessions),
        outcome: {
          action: 'rescheduled',
          newDate: candidate,
          ...(displacedEf !== undefined
            ? { cancelledSecondaryDate: displacedEf.scheduledDate }
            : {}),
        },
      };
    }
    candidate = addDays(candidate, 1);
  }

  return {
    plan: updateWeek(week.sessions.map((s) => (s === missed ? { ...s, status: 'missed' } : s))),
    outcome: { action: 'cancelled' },
  };
}

/**
 * Re-génération du plan restant (E3-3) : les semaines entièrement passées
 * sont préservées telles quelles, le futur est régénéré avec le nouveau
 * contexte (dispo, séances/sem), version incrémentée.
 */
export function regenerateRemainingPlan(
  existingPlan: TrainingPlan,
  input: PlanInput,
): PlanGenerationResult {
  const cutoff = nextMonday(input.today);
  const pastWeeks = existingPlan.weeks.filter((w) =>
    w.sessions.every((s) => s.scheduledDate < cutoff),
  );

  const lastPastVolume = pastWeeks[pastWeeks.length - 1]?.targetVolumeKm;
  const regenerated = generatePlan({
    ...input,
    context: {
      ...input.context,
      currentWeeklyVolumeKm: lastPastVolume ?? input.context.currentWeeklyVolumeKm,
    },
  });
  if (regenerated.outcome !== 'plan') {
    return regenerated;
  }

  const offset = pastWeeks.length;
  const futureWeeks: PlannedWeek[] = regenerated.plan.weeks.map((w) => ({
    ...w,
    weekIndex: w.weekIndex + offset,
  }));
  const phases = regenerated.plan.phases.map((p) => ({
    ...p,
    startWeekIndex: p.startWeekIndex + offset,
  }));

  return {
    ...regenerated,
    plan: {
      ...regenerated.plan,
      version: existingPlan.version + 1,
      phases,
      weeks: [...pastWeeks, ...futureWeeks],
    },
  };
}
