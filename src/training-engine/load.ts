import { addDays, diffDays } from '@/lib/dates';

/**
 * Charge d'entraînement & ACWR (E7-1, E7-3 ; spec §7.6 ; D4, D16).
 * Fonctions pures : le moteur ne lit jamais l'horloge — « aujourd'hui »
 * est toujours un paramètre. Zéro import React/Expo (plan §2).
 */

// ---------------------------------------------------------------------------
// Constantes de la jauge (D16 : rolling 7 j / 28 j ; charte §4)
// ---------------------------------------------------------------------------

/** Bornes de la jauge ACWR (D16 ; charte §4). */
export const ACWR_ZONES = {
  underloadMin: 0.6,
  optimalMin: 0.8,
  peakMin: 1.3,
  max: 1.6,
} as const;

/** Fenêtres de calcul de charge (D16). */
export const LOAD_WINDOWS = { acuteDays: 7, chronicDays: 28 } as const;

/** Jauge « en calibration » tant que < 4 semaines de données (spec §7.6). */
export const CALIBRATION_MIN_DAYS = LOAD_WINDOWS.chronicDays;

/** Horizon de l'ACWR prévisionnel (E7-3) : projection à J+7. */
export const FORECAST_HORIZON_DAYS = 7;

// ---------------------------------------------------------------------------
// Charge de séance — sRPE et fallback d'amorçage (D4)
// ---------------------------------------------------------------------------

/** Méthode de valorisation d'une séance en UA. */
export type LoadMethod = 'srpe' | 'amorcage';

/**
 * Facteurs d'effort par zone FC (fallback d'amorçage, D4) : équivalents RPE
 * médians ressentis par zone (Foster), pour que `durée × facteur` reste
 * comparable au sRPE `durée × RPE` — même unité UA, pas de « marche » dans
 * la chronique à la bascule amorçage → sRPE (test de continuité exigé).
 * Zones en % FCmax : Z1 50–60, Z2 60–70, Z3 70–80, Z4 80–90, Z5 90–100.
 */
export const ZONE_EFFORT_FACTORS: Readonly<Record<1 | 2 | 3 | 4 | 5, number>> = {
  1: 2,
  2: 3,
  3: 4.5,
  4: 6.5,
  5: 9,
};

/**
 * Facteur par défaut sans donnée FC : zone 2 (endurance fondamentale),
 * l'allure très majoritaire chez la cible (spec §5 : ~80 % du volume facile).
 */
export const DEFAULT_EFFORT_FACTOR = ZONE_EFFORT_FACTORS[2];

/** Zone FC (1–5) depuis un % de FCmax — bornes hautes exclusives, clampé. */
export function zoneFromPctFcmax(pctFcmax: number): 1 | 2 | 3 | 4 | 5 {
  if (!Number.isFinite(pctFcmax) || pctFcmax < 0) {
    throw new RangeError(`% FCmax invalide : ${pctFcmax}`);
  }
  if (pctFcmax < 60) return 1;
  if (pctFcmax < 70) return 2;
  if (pctFcmax < 80) return 3;
  if (pctFcmax < 90) return 4;
  return 5;
}

/** Charge sRPE (spec §7.6) : RPE 0–10 × durée en minutes, en UA. */
export function sessionLoadSrpe(rpe: number, durationMin: number): number {
  if (!Number.isFinite(rpe) || rpe < 0 || rpe > 10) {
    throw new RangeError(`RPE hors échelle 0–10 : ${rpe}`);
  }
  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    throw new RangeError(`durée invalide : ${durationMin} min`);
  }
  return rpe * durationMin;
}

/**
 * Charge d'amorçage (D4) : durée × facteur de zone FC moyenne. Le facteur
 * dérive du % FCmax si `avgHrBpm` et `fcmaxBpm` sont connus, sinon facteur
 * endurance fondamentale par défaut. Mêmes UA que le sRPE (normalisation D4).
 */
export function sessionLoadAmorcage(
  durationMin: number,
  hr: { avgHrBpm?: number; fcmaxBpm?: number } = {},
): number {
  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    throw new RangeError(`durée invalide : ${durationMin} min`);
  }
  const { avgHrBpm, fcmaxBpm } = hr;
  const factor =
    avgHrBpm !== undefined && fcmaxBpm !== undefined && fcmaxBpm > 0
      ? ZONE_EFFORT_FACTORS[zoneFromPctFcmax((avgHrBpm / fcmaxBpm) * 100)]
      : DEFAULT_EFFORT_FACTOR;
  return durationMin * factor;
}

/**
 * Charge d'une séance : sRPE si un RPE est saisi, sinon fallback d'amorçage
 * (historique importé sans RPE, D4). Retourne la méthode utilisée pour
 * traçabilité (agrégat `load` du Workout, spec §9).
 */
export function workoutLoad(
  workout: { durationS: number; avgHrBpm?: number },
  context: { rpe?: number; fcmaxBpm?: number } = {},
): { load: number; method: LoadMethod } {
  const durationMin = workout.durationS / 60;
  if (context.rpe !== undefined) {
    return { load: sessionLoadSrpe(context.rpe, durationMin), method: 'srpe' };
  }
  return {
    load: sessionLoadAmorcage(durationMin, {
      avgHrBpm: workout.avgHrBpm,
      fcmaxBpm: context.fcmaxBpm,
    }),
    method: 'amorcage',
  };
}

// ---------------------------------------------------------------------------
// Chronique quotidienne
// ---------------------------------------------------------------------------

/** Charge agrégée d'un jour (date ISO `YYYY-MM-DD`). */
export type DailyLoad = { date: string; load: number };

/**
 * Agrège les charges de séance par jour civil (date locale de `startedAt`).
 * Résultat trié par date croissante ; les jours sans séance sont absents
 * (ils comptent 0 dans les fenêtres glissantes).
 */
export function buildDailyLoads(sessions: { startedAt: string; load: number }[]): DailyLoad[] {
  const byDay = new Map<string, number>();
  for (const session of sessions) {
    const date = session.startedAt.slice(0, 10);
    byDay.set(date, (byDay.get(date) ?? 0) + session.load);
  }
  return [...byDay.entries()]
    .map(([date, load]) => ({ date, load }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

// ---------------------------------------------------------------------------
// ACWR rolling 7 j / 28 j (D16) & état de la jauge
// ---------------------------------------------------------------------------

/** État de la jauge (spec §7.6 ; aligné sur `load_metrics.gauge_status`). */
export type GaugeStatus = 'calibration' | 'sous_charge' | 'favorable' | 'pic';

export type LoadState = {
  /** Jour du calcul (ISO `YYYY-MM-DD`). */
  date: string;
  /** Charge aiguë : somme des 7 jours glissants (UA). */
  acuteLoad7d: number;
  /** Charge chronique : moyenne hebdomadaire des 28 jours glissants (UA/sem). */
  chronicWeeklyLoad28d: number;
  /** ACWR = aiguë / chronique ; `undefined` si la chronique est nulle. */
  acwr: number | undefined;
  /** Jours d'historique disponibles (première donnée → aujourd'hui inclus). */
  historyDays: number;
  status: GaugeStatus;
};

function sumWindow(dailyLoads: DailyLoad[], fromDate: string, toDate: string): number {
  let sum = 0;
  for (const { date, load } of dailyLoads) {
    if (date >= fromDate && date <= toDate) {
      sum += load;
    }
  }
  return sum;
}

/**
 * Calcule l'état de charge au jour `today` : charge aiguë (somme 7 j),
 * chronique (moyenne hebdo des 28 j glissants — D16), ACWR et statut de
 * jauge. Fenêtres partielles (< 28 j d'historique) : la moyenne hebdo est
 * rapportée aux jours réellement couverts, et la jauge reste `calibration`
 * (< 4 semaines de données → alertes désactivées, spec §7.6).
 * Trous de données et arrêts : les jours sans séance comptent 0 — un arrêt
 * long fait décroître la chronique, la reprise se lit dans l'ACWR.
 */
export function computeLoadState(params: {
  dailyLoads: DailyLoad[];
  today: string;
  /** Première date couverte par les données ; défaut : première charge connue. */
  historyStart?: string;
}): LoadState {
  const { dailyLoads, today } = params;
  const firstDate = params.historyStart ?? dailyLoads[0]?.date;
  const historyDays =
    firstDate === undefined || firstDate > today ? 0 : diffDays(firstDate, today) + 1;

  const acuteFrom = addDays(today, -(LOAD_WINDOWS.acuteDays - 1));
  const chronicFrom = addDays(today, -(LOAD_WINDOWS.chronicDays - 1));
  const acuteLoad7d = sumWindow(dailyLoads, acuteFrom, today);
  const chronicSum = sumWindow(dailyLoads, chronicFrom, today);

  // Fenêtre partielle : moyenne hebdo rapportée aux jours couverts.
  const coveredDays = Math.min(Math.max(historyDays, 1), LOAD_WINDOWS.chronicDays);
  const chronicWeeklyLoad28d = chronicSum / (coveredDays / 7);

  const acwr = chronicWeeklyLoad28d > 0 ? acuteLoad7d / chronicWeeklyLoad28d : undefined;

  let status: GaugeStatus;
  if (historyDays < CALIBRATION_MIN_DAYS) {
    status = 'calibration';
  } else if (acwr === undefined || acwr < ACWR_ZONES.optimalMin) {
    status = 'sous_charge';
  } else if (acwr <= ACWR_ZONES.peakMin) {
    status = 'favorable';
  } else {
    status = 'pic';
  }

  return { date: today, acuteLoad7d, chronicWeeklyLoad28d, acwr, historyDays, status };
}

/**
 * ACWR prévisionnel (E7-3) : état projeté à J+7 si l'utilisateur suit son
 * plan — chronique passée + séances planifiées valorisées à leur charge
 * estimée. Les séances planifiées hors de la fenêtre (passées ou au-delà
 * de J+7) sont ignorées.
 */
export function forecastLoadState(params: {
  dailyLoads: DailyLoad[];
  today: string;
  plannedSessions: { scheduledDate: string; estimatedLoad: number }[];
  historyStart?: string;
}): LoadState {
  const { dailyLoads, today, plannedSessions } = params;
  const horizon = addDays(today, FORECAST_HORIZON_DAYS);
  const planned = plannedSessions
    .filter(({ scheduledDate }) => scheduledDate > today && scheduledDate <= horizon)
    .map(({ scheduledDate, estimatedLoad }) => ({
      startedAt: scheduledDate,
      load: estimatedLoad,
    }));
  const combined = buildDailyLoads([
    ...dailyLoads.map(({ date, load }) => ({ startedAt: date, load })),
    ...planned,
  ]);
  return computeLoadState({
    dailyLoads: combined,
    today: horizon,
    historyStart: params.historyStart ?? dailyLoads[0]?.date,
  });
}

/**
 * Nombre de jours consécutifs (en remontant depuis `today`) où la jauge est
 * en `sous_charge` — entrée du déclencheur « sous-charge > 2 semaines »
 * (E7-4). S'arrête dès qu'un jour n'est plus en sous-charge (calibration
 * comprise).
 */
export function consecutiveUnderloadDays(params: {
  dailyLoads: DailyLoad[];
  today: string;
  historyStart?: string;
}): number {
  const { dailyLoads, today } = params;
  const historyStart = params.historyStart ?? dailyLoads[0]?.date;
  if (historyStart === undefined || historyStart > today) {
    return 0;
  }
  let days = 0;
  let cursor = today;
  while (cursor >= historyStart) {
    const { status } = computeLoadState({ dailyLoads, today: cursor, historyStart });
    if (status !== 'sous_charge') {
      break;
    }
    days += 1;
    cursor = addDays(cursor, -1);
  }
  return days;
}
