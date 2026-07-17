import { addDays, dayOfWeek, diffDays } from '@/lib/dates';
import type {
  PlannedSession,
  SessionBlock,
  SessionStep,
  SessionType,
  TrainingPlan,
} from '@/schemas';

import type { LoadState } from './load';
import { forecastLoadState } from './load';
import { buildSession } from './session-templates';

/**
 * Flexibilité du plan (E8, spec §7.9) — fonctions pures, zéro import React.
 * « Le plan est une proposition, pas un contrat » : déplacer/ajouter une
 * séance est toujours permis ; l'app avertit (codes typés, traduits par
 * l'UI), elle n'interdit JAMAIS. Sorties = codes, jamais de texte.
 */

// ---------------------------------------------------------------------------
// Qualification des séances
// ---------------------------------------------------------------------------

/** Une séance « de qualité » : intensité élevée (ni EF, ni récup, ni SL). */
export function isQualitySession(session: Pick<PlannedSession, 'sessionType'>): boolean {
  return (
    session.sessionType !== 'ef' &&
    session.sessionType !== 'recuperation' &&
    session.sessionType !== 'sortie_longue'
  );
}

/** Statuts considérés « actifs » dans la semaine (à jouer ou déjà déplacés). */
function isActive(session: PlannedSession): boolean {
  return session.status === 'planned' || session.status === 'moved';
}

// ---------------------------------------------------------------------------
// Avertissements de déplacement (E8-3) — jamais bloquants
// ---------------------------------------------------------------------------

/**
 * Enchaînements déconseillés (spec §7.9) :
 * - `quality_back_to_back` : deux qualités sur des jours adjacents ;
 * - `quality_before_long_run` : une qualité la veille de la sortie longue
 *   (déclenché aussi bien en déplaçant la qualité qu'en déplaçant la SL).
 */
export type SessionMoveWarning = 'quality_back_to_back' | 'quality_before_long_run';

export function moveSessionWarnings(params: {
  /** La séance déplacée. */
  session: Pick<PlannedSession, 'sessionType'>;
  /** Sa date d'arrivée, ISO `YYYY-MM-DD`. */
  newDate: string;
  /** Les autres séances (la séance déplacée exclue) ; seuls les statuts actifs comptent. */
  otherSessions: PlannedSession[];
}): SessionMoveWarning[] {
  const { session, newDate, otherSessions } = params;
  const others = otherSessions.filter(isActive);
  const warnings: SessionMoveWarning[] = [];

  if (isQualitySession(session)) {
    const qualityAdjacent = others.some(
      (s) => isQualitySession(s) && Math.abs(diffDays(s.scheduledDate, newDate)) === 1,
    );
    if (qualityAdjacent) {
      warnings.push('quality_back_to_back');
    }
    const beforeLongRun = others.some(
      (s) => s.sessionType === 'sortie_longue' && diffDays(newDate, s.scheduledDate) === 1,
    );
    if (beforeLongRun) {
      warnings.push('quality_before_long_run');
    }
  }

  if (session.sessionType === 'sortie_longue') {
    const qualityDayBefore = others.some(
      (s) => isQualitySession(s) && diffDays(s.scheduledDate, newDate) === 1,
    );
    if (qualityDayBefore) {
      warnings.push('quality_before_long_run');
    }
  }

  return warnings;
}

// ---------------------------------------------------------------------------
// Déplacement & ajout dans le plan — immuables
// ---------------------------------------------------------------------------

/** Référence positionnelle d'une séance dans un plan. */
export type PlanSessionRef = { weekIndex: number; sessionIndex: number };

/**
 * Déplace une séance du plan vers `newDate` (statut `moved`), sans jamais
 * la retirer de sa semaine. Retourne un nouveau plan (immuable) ; plan
 * inchangé si la référence est invalide ou la date identique.
 */
export function movePlannedSession(
  plan: TrainingPlan,
  ref: PlanSessionRef,
  newDate: string,
): TrainingPlan {
  const week = plan.weeks[ref.weekIndex];
  const session = week?.sessions[ref.sessionIndex];
  if (week === undefined || session === undefined || session.scheduledDate === newDate) {
    return plan;
  }
  return {
    ...plan,
    weeks: plan.weeks.map((w, wi) =>
      wi === ref.weekIndex
        ? {
            ...w,
            sessions: w.sessions.map((s, si) =>
              si === ref.sessionIndex ? { ...s, scheduledDate: newDate, status: 'moved' } : s,
            ),
          }
        : w,
    ),
  };
}

/**
 * Ajoute une séance spontanée au plan (E8-4) : rattachée à la semaine
 * couvrant sa date (bornée aux semaines existantes du plan).
 */
export function addSessionToPlan(plan: TrainingPlan, session: PlannedSession): TrainingPlan {
  if (plan.weeks.length === 0) {
    return plan;
  }
  const firstDate = plan.weeks[0]?.sessions[0]?.scheduledDate;
  const planStart =
    firstDate === undefined ? session.scheduledDate : addDays(firstDate, -dayOfWeek(firstDate));
  const rawIndex = Math.floor(diffDays(planStart, session.scheduledDate) / 7);
  const weekIndex = Math.min(Math.max(rawIndex, 0), plan.weeks.length - 1);
  return {
    ...plan,
    weeks: plan.weeks.map((w, wi) =>
      wi === weekIndex
        ? {
            ...w,
            sessions: [...w.sessions, session].sort((a, b) =>
              a.scheduledDate < b.scheduledDate ? -1 : 1,
            ),
          }
        : w,
    ),
  };
}

// ---------------------------------------------------------------------------
// Charge estimée d'une séance planifiée (ACWR prévisionnel, E7-3/E8-3)
// ---------------------------------------------------------------------------

/**
 * RPE attendu par type de séance (réglage produit, validation coach G3) —
 * sert à valoriser les séances planifiées en UA (RPE attendu × durée
 * estimée), dans la même unité que le sRPE réalisé.
 */
export const EXPECTED_SESSION_RPE: Readonly<Record<SessionType, number>> = {
  recuperation: 2,
  ef: 3,
  sortie_longue: 4,
  tempo: 5,
  fartlek: 6,
  seuil: 7,
  vma_court: 8,
};

/**
 * Durée estimée d'une structure de blocs, en secondes : les distances sont
 * converties avec une vitesse de référence par intensité (miroir de
 * `estimateBlocksKm` — VMA connue, sinon vitesses prudentes par défaut).
 */
export function estimateBlocksDurationS(blocks: SessionBlock[], vmaKmh?: number): number {
  const easySpeed = vmaKmh !== undefined ? vmaKmh * 0.7 : 10;
  const workSpeed = vmaKmh !== undefined ? vmaKmh * 0.87 : 12;

  const stepS = (s: SessionStep): number => {
    if (s.extent.type === 'duration') {
      return s.extent.seconds;
    }
    const speed = s.target.type === 'pace' || s.target.type === 'rpe' ? workSpeed : easySpeed;
    return (s.extent.meters / 1000 / speed) * 3600;
  };

  const blockS = (block: SessionBlock): number => {
    if (block.kind === 'step') {
      return stepS(block);
    }
    const inner = block.blocks.reduce((sum, b) => sum + blockS(b), 0);
    const recovery = block.recovery ? stepS(block.recovery) : 0;
    return block.repetitions * inner + Math.max(0, block.repetitions - 1) * recovery;
  };

  return Math.round(blocks.reduce((sum, b) => sum + blockS(b), 0));
}

/** Durée par défaut (min) si une séance n'a aucun bloc (course libre). */
export const DEFAULT_SESSION_DURATION_MIN = 45;

/**
 * Charge estimée d'une séance planifiée, en UA : RPE attendu du type ×
 * durée estimée des blocs (minutes). Même unité que le sRPE réalisé —
 * la projection reste comparable à la chronique.
 */
export function estimatePlannedSessionLoad(
  session: Pick<PlannedSession, 'sessionType' | 'blocks'>,
  vmaKmh?: number,
): number {
  const durationS = estimateBlocksDurationS(session.blocks, vmaKmh);
  const durationMin = durationS > 0 ? durationS / 60 : DEFAULT_SESSION_DURATION_MIN;
  return Math.round(EXPECTED_SESSION_RPE[session.sessionType] * durationMin);
}

/**
 * Séances à venir valorisées pour l'ACWR prévisionnel : statuts actifs,
 * strictement après `today` (le jour même est déjà dans la chronique
 * réalisée dès que la séance est faite).
 */
export function upcomingPlannedLoads(
  sessions: PlannedSession[],
  today: string,
  vmaKmh?: number,
): { scheduledDate: string; estimatedLoad: number }[] {
  return sessions
    .filter((s) => isActive(s) && s.scheduledDate > today)
    .map((s) => ({
      scheduledDate: s.scheduledDate,
      estimatedLoad: estimatePlannedSessionLoad(s, vmaKmh),
    }));
}

/**
 * Recalcul de l'ACWR prévisionnel pour un ensemble de séances planifiées
 * (E8-3) : brancher la chronique réalisée + les séances (déplacées/ajoutées
 * comprises) sur la projection J+7.
 */
export function forecastForSessions(params: {
  dailyLoads: { date: string; load: number }[];
  today: string;
  sessions: PlannedSession[];
  vmaKmh?: number;
  historyStart?: string;
}): LoadState {
  return forecastLoadState({
    dailyLoads: params.dailyLoads,
    today: params.today,
    plannedSessions: upcomingPlannedLoads(params.sessions, params.today, params.vmaKmh),
    ...(params.historyStart !== undefined ? { historyStart: params.historyStart } : {}),
  });
}

/**
 * Règle d'équilibre (spec §7.9, E8-4) : une séance déplacée/ajoutée ne
 * déclenche une suggestion d'allègement QUE si la charge projetée sort de
 * la zone favorable par le haut. En dessous, l'app se tait (pas de
 * culpabilisation).
 */
export function lighteningSuggested(projected: LoadState): boolean {
  return projected.status === 'pic';
}

// ---------------------------------------------------------------------------
// Statut d'affichage & vue semaine (E8-1)
// ---------------------------------------------------------------------------

/** Statut d'affichage d'une séance : prévue / faite / manquée (E8-1). */
export type SessionDisplayStatus = 'prevu' | 'fait' | 'manque';

export function sessionDisplayStatus(
  session: Pick<PlannedSession, 'status' | 'scheduledDate'>,
  today: string,
): SessionDisplayStatus {
  if (session.status === 'done') {
    return 'fait';
  }
  if (session.status === 'missed' || session.status === 'cancelled') {
    return 'manque';
  }
  return session.scheduledDate < today ? 'manque' : 'prevu';
}

export type WeekDayOverview = {
  /** Date du jour, ISO `YYYY-MM-DD`. */
  date: string;
  /** Jour de semaine : 0 = lundi … 6 = dimanche. */
  day: number;
  /** Séances du jour (vide = repos, affiché explicitement — spec §7.10). */
  sessions: { session: PlannedSession; displayStatus: SessionDisplayStatus }[];
};

/**
 * Vue semaine 7 jours fixes lun→dim (E8-1) : chaque jour de la semaine de
 * `weekStartMonday`, avec ses séances et leur statut d'affichage. Les jours
 * sans séance sont présents (jours de repos affichés explicitement).
 */
export function buildWeekOverview(
  sessions: PlannedSession[],
  weekStartMonday: string,
  today: string,
): WeekDayOverview[] {
  return Array.from({ length: 7 }, (_, day) => {
    const date = addDays(weekStartMonday, day);
    return {
      date,
      day,
      sessions: sessions
        .filter((s) => s.scheduledDate === date && s.status !== 'cancelled')
        .map((session) => ({ session, displayStatus: sessionDisplayStatus(session, today) })),
    };
  });
}

/** Lundi de la semaine contenant `isoDate`. */
export function mondayOf(isoDate: string): string {
  return addDays(isoDate, -dayOfWeek(isoDate));
}

// ---------------------------------------------------------------------------
// Semaine type manuelle (E8-6) — sans objectif, 100 % manuel
// ---------------------------------------------------------------------------

/** Types composables de la semaine type (le fartlek se crée via le builder, Lot 10). */
export type TemplateSessionType = Exclude<SessionType, 'fartlek'>;

/** Une entrée de semaine type : un type de séance sur un jour (0 = lundi). */
export type WeekTemplateEntry = { day: number; sessionType: TemplateSessionType };

/**
 * Matérialise la semaine type sur une semaine civile : une séance planifiée
 * par entrée, structurée par les templates du moteur (E8-6). `fromDay`
 * permet de ne matérialiser que les jours restants de la semaine courante
 * (on ne crée pas rétroactivement des séances « manquées »).
 */
export function instantiateWeekTemplate(
  template: WeekTemplateEntry[],
  weekStartMonday: string,
  options: { vmaKmh?: number; fromDay?: number } = {},
): PlannedSession[] {
  const fromDay = options.fromDay ?? 0;
  return [...template]
    .filter((entry) => entry.day >= fromDay)
    .sort((a, b) => a.day - b.day)
    .map((entry) => {
      const spec = buildSession({ type: entry.sessionType, vmaKmh: options.vmaKmh });
      return {
        scheduledDate: addDays(weekStartMonday, entry.day),
        sessionType: spec.sessionType,
        blocks: spec.blocks,
        status: 'planned' as const,
      };
    });
}

// ---------------------------------------------------------------------------
// Résumé réalisé d'une semaine passée (timeline, E8-2)
// ---------------------------------------------------------------------------

export type WeekRealizedSummary = {
  /** Séances réalisées dans la semaine. */
  count: number;
  /** Charge totale réalisée (UA). */
  totalLoad: number;
  /** RPE moyen des séances notées ; `undefined` si aucune. */
  avgRpe: number | undefined;
};

/** Agrège le réalisé d'une semaine civile (lun→dim) pour la timeline passée. */
export function weekRealizedSummary(
  workouts: { startedAt: string; load: number; rpe?: number }[],
  weekStartMonday: string,
): WeekRealizedSummary {
  const weekEnd = addDays(weekStartMonday, 6);
  const inWeek = workouts.filter((w) => {
    const date = w.startedAt.slice(0, 10);
    return date >= weekStartMonday && date <= weekEnd;
  });
  const rpes = inWeek.flatMap((w) => (w.rpe === undefined ? [] : [w.rpe]));
  return {
    count: inWeek.length,
    totalLoad: Math.round(inWeek.reduce((sum, w) => sum + w.load, 0)),
    avgRpe:
      rpes.length > 0
        ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10
        : undefined,
  };
}
