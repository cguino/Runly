import { addDays, diffDays, nextMonday } from '@/lib/dates';
import type {
  PlannedSession,
  PlannedWeek,
  PlanPhase,
  RaceDistance,
  SessionType,
} from '@/schemas';
import { RACE_DISTANCES_M } from '@/schemas';

import { RACE_INTENSITY } from './physio';
import { buildSession, estimateBlocksKm } from './session-templates';
import type {
  PlanAlternative,
  PlanGenerationResult,
  PlanInput,
  PlanRecommendation,
  UnrealisticReason,
} from './plan-types';

/**
 * Générateur de plan périodisé (E3-1, E3-2) — fonction pure, déclenchée
 * uniquement si un objectif daté existe (D5). Règles produit (spec §5,
 * §7.2) : phases générale → spécifique → affûtage, 1 semaine allégée /
 * 3–4, ~80 % du volume facile, 1–2 qualités/sem, progression ≤ 10 %
 * (5–8 % si antécédent < 12 mois), refus < 2 séances/sem, garde-fou
 * objectif irréaliste avec alternatives.
 *
 * Interprétation documentée (à valider G3) : la contrainte de progression
 * s'applique entre semaines de CHARGE — la semaine allégée descend à 70 %
 * puis la reprise revient au niveau de la dernière semaine de charge + g.
 */

// --- Réglages produit (validation coach G3) --------------------------------

/** Semaines minimales de préparation par distance. */
export const MIN_PLAN_WEEKS: Record<RaceDistance, number> = {
  '5k': 4,
  '10k': 6,
  semi: 8,
  marathon: 12,
};

/** Affûtage 7–14 j (spec §7.2) : 1 semaine, 2 pour semi/marathon. */
export const TAPER_WEEKS: Record<RaceDistance, number> = {
  '5k': 1,
  '10k': 1,
  semi: 2,
  marathon: 2,
};

/** Volume pic visé (km/sem) pour une ambition chrono ; « finir » = 75 %. */
export const PEAK_VOLUME_KM: Record<RaceDistance, number> = {
  '5k': 30,
  '10k': 35,
  semi: 45,
  marathon: 55,
};

/** Volume de départ par défaut sans historique ni déclaration (km/sem). */
export const DEFAULT_START_VOLUME_KM: Record<RaceDistance, number> = {
  '5k': 15,
  '10k': 18,
  semi: 22,
  marathon: 28,
};

/** Progression hebdo entre semaines de charge. */
export const WEEKLY_GROWTH = { standard: 0.09, cautious: 0.06 } as const;

/** Semaine allégée : 70 % de la dernière semaine de charge, toutes les 4 semaines. */
export const RECOVERY_FACTOR = 0.7;
export const RECOVERY_EVERY = 4;

/** Marge de tolérance sur le % VMA de course avant « irréaliste ». */
const PACE_MARGIN_PCT = 3;

/** Le pic doit être atteignable à 85 % près. */
const VOLUME_FEASIBILITY_RATIO = 0.85;

// --- Structure hebdo --------------------------------------------------------

type WeekKind = 'build' | 'recovery' | 'taper' | 'race';

type WeekPlanSpec = {
  weekIndex: number;
  kind: WeekKind;
  volumeKm: number;
  qualityTypes: SessionType[];
};

function targetPeakKm(input: PlanInput): number {
  const base = PEAK_VOLUME_KM[input.goal.raceDistance];
  return input.goal.ambition === 'chrono' ? base : Math.round(base * 0.75);
}

function startVolumeKm(input: PlanInput): number {
  return input.context.currentWeeklyVolumeKm ?? DEFAULT_START_VOLUME_KM[input.goal.raceDistance];
}

function growthRate(input: PlanInput): number {
  return input.context.injuryWithin12Months ? WEEKLY_GROWTH.cautious : WEEKLY_GROWTH.standard;
}

/** Nombre de semaines de charge nécessaires pour approcher le pic. */
function weeksNeededForVolume(from: number, peak: number, rate: number): number {
  if (from >= peak * VOLUME_FEASIBILITY_RATIO) {
    return 1;
  }
  return Math.ceil(Math.log((peak * VOLUME_FEASIBILITY_RATIO) / from) / Math.log(1 + rate)) + 1;
}

function checkFeasibility(input: PlanInput, weeksCount: number): UnrealisticReason[] {
  const reasons: UnrealisticReason[] = [];
  const distance = input.goal.raceDistance;
  if (weeksCount < MIN_PLAN_WEEKS[distance]) {
    reasons.push('too_few_weeks');
  }
  const rate = growthRate(input);
  const buildWeeks = weeksCount - TAPER_WEEKS[distance];
  const reachable = startVolumeKm(input) * (1 + rate) ** Math.max(0, buildWeeks - 1);
  if (reachable < targetPeakKm(input) * VOLUME_FEASIBILITY_RATIO) {
    reasons.push('volume_gap');
  }
  if (
    input.goal.ambition === 'chrono' &&
    input.goal.targetTimeS !== undefined &&
    input.physio.vmaKmh !== undefined
  ) {
    const distanceKm = RACE_DISTANCES_M[distance] / 1000;
    const requiredSpeedKmh = distanceKm / (input.goal.targetTimeS / 3600);
    const requiredPctVma = (requiredSpeedKmh / input.physio.vmaKmh) * 100;
    if (requiredPctVma > RACE_INTENSITY[distance].pctVma[1] + PACE_MARGIN_PCT) {
      reasons.push('pace_above_capacity');
    }
  }
  return reasons;
}

function buildAlternatives(input: PlanInput, startDate: string): PlanAlternative[] {
  const alternatives: PlanAlternative[] = [];
  if (input.goal.ambition === 'chrono') {
    alternatives.push({ type: 'finish_ambition' });
  }
  const rate = growthRate(input);
  const neededWeeks = Math.max(
    MIN_PLAN_WEEKS[input.goal.raceDistance],
    weeksNeededForVolume(startVolumeKm(input), targetPeakKm(input), rate) +
      TAPER_WEEKS[input.goal.raceDistance],
  );
  alternatives.push({ type: 'later_date', suggestedRaceDate: addDays(startDate, neededWeeks * 7) });
  const shorter: RaceDistance[] = ['semi', '10k', '5k'];
  const currentIndex = ['marathon', 'semi', '10k', '5k'].indexOf(input.goal.raceDistance);
  const candidate = shorter[currentIndex] as RaceDistance | undefined;
  if (candidate !== undefined) {
    alternatives.push({ type: 'other_goal', raceDistance: candidate });
  }
  return alternatives;
}

/** Types de qualité selon la phase, alternés pour varier les stimulus. */
function qualityTypesFor(
  kind: WeekKind,
  phase: 'generale' | 'specifique',
  sessionsPerWeek: number,
  weekIndex: number,
): SessionType[] {
  if (kind === 'recovery' || kind === 'race') {
    return [];
  }
  if (kind === 'taper') {
    return ['tempo'];
  }
  if (phase === 'generale') {
    return ['vma_court'];
  }
  const twoQualities = sessionsPerWeek >= 4;
  if (twoQualities) {
    return weekIndex % 2 === 0 ? ['seuil', 'vma_court'] : ['tempo', 'seuil'];
  }
  return weekIndex % 2 === 0 ? ['seuil'] : ['tempo'];
}

function buildWeekSpecs(
  input: PlanInput,
  weeksCount: number,
): { specs: WeekPlanSpec[]; phases: PlanPhase[] } {
  const distance = input.goal.raceDistance;
  const taper = TAPER_WEEKS[distance];
  const buildWeeks = weeksCount - taper;
  const generalWeeks = Math.ceil(buildWeeks / 2);
  const specificWeeks = buildWeeks - generalWeeks;

  const phases: PlanPhase[] = [
    { type: 'generale', startWeekIndex: 0, weekCount: generalWeeks },
    { type: 'specifique', startWeekIndex: generalWeeks, weekCount: specificWeeks },
    { type: 'affutage', startWeekIndex: buildWeeks, weekCount: taper },
  ];

  const rate = growthRate(input);
  const peak = targetPeakKm(input);
  const specs: WeekPlanSpec[] = [];
  let lastLoadVolume = startVolumeKm(input);
  let volume = lastLoadVolume;

  for (let i = 0; i < weeksCount; i += 1) {
    const inTaper = i >= buildWeeks;
    const isRaceWeek = i === weeksCount - 1;
    let kind: WeekKind;
    if (isRaceWeek) {
      kind = 'race';
    } else if (inTaper) {
      kind = 'taper';
    } else if ((i + 1) % RECOVERY_EVERY === 0) {
      kind = 'recovery';
    } else {
      kind = 'build';
    }

    if (kind === 'build') {
      volume = i === 0 ? lastLoadVolume : Math.min(lastLoadVolume * (1 + rate), peak);
      lastLoadVolume = volume;
    } else if (kind === 'recovery') {
      volume = lastLoadVolume * RECOVERY_FACTOR;
    } else if (kind === 'taper') {
      volume = lastLoadVolume * 0.6;
    } else {
      // Semaine de course : quelques rappels courts, la fraîcheur prime.
      volume = lastLoadVolume * 0.3;
    }

    const phase = i < generalWeeks ? 'generale' : 'specifique';
    specs.push({
      weekIndex: i,
      kind,
      volumeKm: Math.round(volume * 2) / 2,
      qualityTypes: qualityTypesFor(kind, phase, input.context.sessionsPerWeek, i),
    });
  }
  return { specs, phases };
}

// --- Placement sur les jours (E3-2) -----------------------------------------

type DayAssignment = { day: number; type: SessionType };

/**
 * Place SL + qualités + EF sur les jours disponibles :
 * jamais 2 qualités d'affilée, pas de qualité la veille de la sortie longue.
 * Une qualité non plaçable est rétrogradée en EF (jamais de violation).
 */
export function placeWeekSessions(
  days: number[],
  sessionsCount: number,
  qualityTypes: SessionType[],
  options: { includeLongRun: boolean },
): { assignments: DayAssignment[]; downgraded: boolean } {
  const sorted = [...new Set(days)].sort((a, b) => a - b).slice(0, Math.max(sessionsCount, 0));
  const assignments: DayAssignment[] = [];
  let downgraded = false;

  const longRunDay = options.includeLongRun ? sorted[sorted.length - 1] : undefined;
  if (longRunDay !== undefined) {
    assignments.push({ day: longRunDay, type: 'sortie_longue' });
  }

  const candidates = sorted.filter((d) => d !== longRunDay);
  const qualityDays: number[] = [];
  const remainingQualities = [...qualityTypes];

  for (const day of candidates) {
    if (remainingQualities.length === 0) {
      break;
    }
    const adjacentToQuality = qualityDays.some((q) => Math.abs(q - day) === 1);
    const dayBeforeLongRun = longRunDay !== undefined && day === longRunDay - 1;
    if (adjacentToQuality || dayBeforeLongRun) {
      continue;
    }
    const type = remainingQualities.shift();
    if (type !== undefined) {
      qualityDays.push(day);
      assignments.push({ day, type });
    }
  }
  if (remainingQualities.length > 0) {
    downgraded = true;
  }

  for (const day of candidates) {
    if (!assignments.some((a) => a.day === day)) {
      assignments.push({ day, type: 'ef' });
    }
  }
  assignments.sort((a, b) => a.day - b.day);
  return { assignments, downgraded };
}

// --- Génération -------------------------------------------------------------

function buildPlannedWeek(
  spec: WeekPlanSpec,
  input: PlanInput,
  startDate: string,
): { week: PlannedWeek; downgraded: boolean } {
  const weekStart = addDays(startDate, spec.weekIndex * 7);
  const sessionsCount =
    spec.kind === 'race'
      ? Math.min(2, input.context.sessionsPerWeek)
      : input.context.sessionsPerWeek;
  const { assignments, downgraded } = placeWeekSessions(
    input.context.preferredDays,
    sessionsCount,
    spec.qualityTypes,
    { includeLongRun: spec.kind !== 'race' },
  );

  const vma = input.physio.vmaKmh;
  const qualityKm = assignments
    .filter((a) => a.type !== 'ef' && a.type !== 'sortie_longue')
    .map((a) =>
      estimateBlocksKm(
        buildSession({ type: a.type as Exclude<SessionType, 'fartlek'>, vmaKmh: vma }).blocks,
        vma,
      ),
    )
    .reduce((a, b) => a + b, 0);
  const efCount = assignments.filter((a) => a.type === 'ef').length;
  const hasLongRun = assignments.some((a) => a.type === 'sortie_longue');
  // Volume continu restant : la sortie longue en prend la plus grosse part
  // (elle reste plus longue que chaque EF), le reste se répartit entre EF.
  const remaining = Math.max(spec.volumeKm - qualityKm, 4);
  const longRunShare = efCount <= 1 ? 0.55 : 0.45;
  const longRunKm = hasLongRun ? Math.round(remaining * longRunShare * 2) / 2 : 0;
  const efKmEach =
    efCount > 0 ? Math.max(4, Math.round(((remaining - longRunKm) / efCount) * 2) / 2) : 0;

  const sessions: PlannedSession[] = assignments.map((assignment) => {
    const type = assignment.type as Exclude<SessionType, 'fartlek'>;
    const distanceKm = type === 'sortie_longue' ? longRunKm : type === 'ef' ? efKmEach : undefined;
    const spec_ = buildSession({ type, vmaKmh: vma, distanceKm });
    return {
      scheduledDate: addDays(weekStart, assignment.day),
      sessionType: spec_.sessionType,
      blocks: spec_.blocks,
      status: 'planned',
    };
  });

  return {
    week: {
      weekIndex: spec.weekIndex,
      targetVolumeKm: spec.volumeKm,
      isRecovery: spec.kind === 'recovery',
      sessions,
    },
    downgraded,
  };
}

export function generatePlan(input: PlanInput): PlanGenerationResult {
  const recommendations: PlanRecommendation[] = [];

  if (input.context.sessionsPerWeek < 2) {
    return { outcome: 'refused', reason: 'too_few_sessions' };
  }
  if (diffDays(input.today, input.goal.raceDate) <= 0) {
    return { outcome: 'refused', reason: 'race_date_not_ahead' };
  }

  const startDate = nextMonday(input.today);
  const weeksCount = Math.floor(diffDays(startDate, input.goal.raceDate) / 7) + 1;

  const reasons = checkFeasibility(input, weeksCount);
  if (reasons.length > 0) {
    return { outcome: 'unrealistic', reasons, alternatives: buildAlternatives(input, startDate) };
  }

  if (input.goal.ambition === 'chrono' && input.context.sessionsPerWeek < 3) {
    recommendations.push('recommend_three_sessions_for_chrono');
  }
  let effectiveInput = input;
  if (input.context.preferredDays.length < input.context.sessionsPerWeek) {
    recommendations.push('sessions_capped_to_preferred_days');
    effectiveInput = {
      ...input,
      context: { ...input.context, sessionsPerWeek: input.context.preferredDays.length },
    };
    if (effectiveInput.context.sessionsPerWeek < 2) {
      return { outcome: 'refused', reason: 'too_few_sessions' };
    }
  }

  const { specs, phases } = buildWeekSpecs(effectiveInput, weeksCount);
  let anyDowngraded = false;
  const weeks: PlannedWeek[] = specs.map((spec) => {
    const { week, downgraded } = buildPlannedWeek(spec, effectiveInput, startDate);
    anyDowngraded = anyDowngraded || downgraded;
    return week;
  });
  if (anyDowngraded) {
    recommendations.push('quality_downgraded_to_ef');
  }

  return {
    outcome: 'plan',
    plan: { phases, status: 'active', version: 1, weeks },
    recommendations,
  };
}
