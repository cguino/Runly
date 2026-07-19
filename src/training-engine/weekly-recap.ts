import { addDays, dayOfWeek } from '@/lib/dates';

import { buildDailyLoads, computeLoadState } from './load';
import type { GaugeStatus } from './load';

/**
 * Récap hebdo (E9-2, spec §6.2) — fonction pure : réalisé vs prévu,
 * évolution de l'ACWR sur la semaine et code de message d'adaptation.
 * Sortie = codes + valeurs, JAMAIS de texte : le contenu utilisateur est
 * rendu par `src/services/notifications/content.ts` via `src/i18n`
 * (filtre wording `note-reglementaire-dm.md`).
 * D15 : le récap constate, il ne culpabilise pas — aucun compteur de série,
 * aucun code de « relance » agressif.
 */

/** Variation d'ACWR en dessous de laquelle la tendance est « stable ». */
export const RECAP_TREND_EPSILON = 0.05;

export type WeeklyRecapTrend = 'hausse' | 'baisse' | 'stable' | 'indeterminee';

/**
 * Code de message d'adaptation pour la semaine suivante (traduit par l'UI) :
 * - `semaine_legere` : pic de charge → proposer d'alléger ;
 * - `continuite` : zone favorable → continuer ainsi ;
 * - `relance_douce` : sous-charge → une séance douce de plus, sans pression ;
 * - `calibration` : jauge encore en apprentissage.
 */
export type WeeklyRecapAdaptation =
  'semaine_legere' | 'continuite' | 'relance_douce' | 'calibration';

export type WeeklyRecap = {
  /** Lundi de la semaine récapitulée, ISO `YYYY-MM-DD`. */
  weekStart: string;
  /** Dimanche de la semaine récapitulée. */
  weekEnd: string;
  /** Séances prévues sur la semaine (hors annulées). */
  plannedCount: number;
  /** Séances réalisées sur la semaine. */
  doneCount: number;
  /** Distance réalisée cumulée (m) — 0 si aucune distance connue. */
  distanceM: number;
  /** Durée réalisée cumulée (s). */
  durationS: number;
  /** ACWR à la veille du lundi (fin de semaine précédente), si calculable. */
  acwrStart?: number;
  /** ACWR au dimanche soir, si calculable. */
  acwrEnd?: number;
  /** Statut de jauge au dimanche soir. */
  endStatus: GaugeStatus;
  trend: WeeklyRecapTrend;
  adaptation: WeeklyRecapAdaptation;
};

/** Séance réalisée minimale pour le récap (agrégats + charge valorisée en UA). */
export type RecapWorkout = {
  /** Datetime ISO (ou date `YYYY-MM-DD`) de début de séance. */
  startedAt: string;
  durationS: number;
  distanceM?: number;
  /** Charge en UA (sRPE ou amorçage, D4) — déjà valorisée par l'appelant. */
  load: number;
};

function trendOf(acwrStart: number | undefined, acwrEnd: number | undefined): WeeklyRecapTrend {
  if (acwrStart === undefined || acwrEnd === undefined) {
    return 'indeterminee';
  }
  const delta = acwrEnd - acwrStart;
  if (delta > RECAP_TREND_EPSILON) {
    return 'hausse';
  }
  if (delta < -RECAP_TREND_EPSILON) {
    return 'baisse';
  }
  return 'stable';
}

function adaptationOf(status: GaugeStatus): WeeklyRecapAdaptation {
  switch (status) {
    case 'calibration':
      return 'calibration';
    case 'pic':
      return 'semaine_legere';
    case 'sous_charge':
      return 'relance_douce';
    case 'favorable':
      return 'continuite';
  }
}

/**
 * Construit le récap de la semaine `weekStart` (un lundi) → dimanche :
 * réalisé vs prévu, évolution ACWR (veille du lundi → dimanche) et code
 * d'adaptation dérivé du statut de jauge de fin de semaine.
 * `workouts` doit couvrir tout l'historique disponible (pas seulement la
 * semaine) : les fenêtres 7/28 j de l'ACWR en dépendent.
 */
export function buildWeeklyRecap(params: {
  /** Lundi de la semaine récapitulée, ISO `YYYY-MM-DD`. */
  weekStart: string;
  /** Historique complet des séances réalisées, valorisées en UA. */
  workouts: RecapWorkout[];
  /** Séances planifiées (toutes dates) ; seules celles de la semaine comptent. */
  plannedSessions: { scheduledDate: string; status?: string }[];
  /** Première date couverte par les données (état calibration). */
  historyStart?: string;
}): WeeklyRecap {
  const { weekStart, workouts, plannedSessions } = params;
  if (dayOfWeek(weekStart) !== 0) {
    throw new RangeError(`weekStart doit être un lundi : ${weekStart}`);
  }
  const weekEnd = addDays(weekStart, 6);

  const inWeek = (date: string): boolean => date >= weekStart && date <= weekEnd;

  const doneThisWeek = workouts.filter((workout) => inWeek(workout.startedAt.slice(0, 10)));
  const plannedCount = plannedSessions.filter(
    (session) => inWeek(session.scheduledDate) && session.status !== 'cancelled',
  ).length;

  const distanceM = doneThisWeek.reduce((sum, workout) => sum + (workout.distanceM ?? 0), 0);
  const durationS = doneThisWeek.reduce((sum, workout) => sum + workout.durationS, 0);

  const dailyLoads = buildDailyLoads(workouts.map(({ startedAt, load }) => ({ startedAt, load })));
  const historyStart = params.historyStart ?? dailyLoads[0]?.date;
  const endState = computeLoadState({ dailyLoads, today: weekEnd, historyStart });
  const startState = computeLoadState({
    dailyLoads,
    today: addDays(weekStart, -1),
    historyStart,
  });

  return {
    weekStart,
    weekEnd,
    plannedCount,
    doneCount: doneThisWeek.length,
    distanceM,
    durationS,
    acwrStart: startState.acwr,
    acwrEnd: endState.acwr,
    endStatus: endState.status,
    trend: trendOf(startState.acwr, endState.acwr),
    adaptation: adaptationOf(endState.status),
  };
}
