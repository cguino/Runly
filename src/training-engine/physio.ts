import type { HrZone, PhysioValue, RaceDistance, Workout } from '@/schemas';
import { RACE_DISTANCES_M } from '@/schemas';

/**
 * Références physiologiques (E2-1 → E2-3, spec §7.5) — fonctions pures.
 * Chaque valeur porte un indice de confiance `mesure | estime | defaut`.
 */

// ---------------------------------------------------------------------------
// VMA — estimation depuis l'historique (E2-1)
// ---------------------------------------------------------------------------

/** Fenêtre des « meilleurs efforts » retenus pour estimer la VMA (spec §7.5). */
export const VMA_EFFORT_WINDOW_S = { min: 5 * 60, max: 12 * 60 } as const;

/**
 * Fraction de VMA soutenable selon la durée d'effort — modèle de puissance
 * critique simplifié pour agrégats de séance : un effort maximal de ~6 min
 * ≈ 100 % VMA (protocole demi-Cooper), ~12 min ≈ 92 % VMA (Cooper),
 * interpolation linéaire entre les points d'ancrage.
 * Réglage produit à confronter à la validation coach (G3).
 */
export function sustainableVmaFraction(durationS: number): number {
  const { min, max } = VMA_EFFORT_WINDOW_S;
  if (durationS < min || durationS > max) {
    throw new RangeError(`durée hors fenêtre d'estimation VMA : ${durationS} s`);
  }
  const sixMinutes = 6 * 60;
  if (durationS <= sixMinutes) {
    // 5 min → 1,02 ; 6 min → 1,00
    return 1.02 + ((durationS - min) / (sixMinutes - min)) * (1.0 - 1.02);
  }
  // 6 min → 1,00 ; 12 min → 0,92
  return 1.0 + ((durationS - sixMinutes) / (max - sixMinutes)) * (0.92 - 1.0);
}

/**
 * Estime la VMA depuis l'historique : meilleurs efforts agrégés de 5–12 min
 * (E2-1). Retourne `undefined` si aucun effort exploitable (données creuses) —
 * fallbacks : test demi-Cooper guidé (P1) ou saisie manuelle.
 */
export function estimateVmaFromHistory(workouts: Workout[]): PhysioValue | undefined {
  let best: number | undefined;
  for (const workout of workouts) {
    const { durationS, distanceM } = workout;
    if (
      distanceM === undefined ||
      distanceM <= 0 ||
      durationS < VMA_EFFORT_WINDOW_S.min ||
      durationS > VMA_EFFORT_WINDOW_S.max
    ) {
      continue;
    }
    const speedKmh = distanceM / 1000 / (durationS / 3600);
    const vma = speedKmh / sustainableVmaFraction(durationS);
    if (best === undefined || vma > best) {
      best = vma;
    }
  }
  if (best === undefined) {
    return undefined;
  }
  return { value: Math.round(best * 10) / 10, confidence: 'estime' };
}

// ---------------------------------------------------------------------------
// FCmax — max observé sinon Tanaka (E2-2)
// ---------------------------------------------------------------------------

/**
 * FCmax : max observé dans l'historique (`mesure`), sinon Tanaka
 * 208 − 0,7 × âge (`defaut`), sinon `undefined` (saisie manuelle).
 */
export function estimateFcmax(params: {
  workouts: Workout[];
  ageYears?: number;
}): PhysioValue | undefined {
  const observed = params.workouts
    .map((w) => w.maxHrBpm)
    .filter((hr): hr is number => hr !== undefined);
  if (observed.length > 0) {
    return { value: Math.max(...observed), confidence: 'mesure' };
  }
  if (params.ageYears !== undefined && params.ageYears > 0) {
    return { value: Math.round(208 - 0.7 * params.ageYears), confidence: 'defaut' };
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// SV1 / SV2 — % VMA (E2-2)
// ---------------------------------------------------------------------------

/**
 * Seuils ventilatoires en % VMA (spec §7.5 : SV1 ≈ 70–80 %, SV2 ≈ 85–90 %).
 * Points médians retenus comme estimation par défaut — toujours éditables.
 */
export const THRESHOLD_DEFAULTS_PCT_VMA = { sv1: 75, sv2: 88 } as const;

export function estimateThresholds(): { sv1PctVma: PhysioValue; sv2PctVma: PhysioValue } {
  return {
    sv1PctVma: { value: THRESHOLD_DEFAULTS_PCT_VMA.sv1, confidence: 'estime' },
    sv2PctVma: { value: THRESHOLD_DEFAULTS_PCT_VMA.sv2, confidence: 'estime' },
  };
}

// ---------------------------------------------------------------------------
// Zones FC — 5 zones en % FCmax (E2-3)
// ---------------------------------------------------------------------------

/** Les 5 zones d'entraînement en % FCmax (spec §7.5). */
export const HR_ZONES_PCT: readonly HrZone[] = [
  { zone: 1, minPctFcmax: 50, maxPctFcmax: 60 },
  { zone: 2, minPctFcmax: 60, maxPctFcmax: 70 },
  { zone: 3, minPctFcmax: 70, maxPctFcmax: 80 },
  { zone: 4, minPctFcmax: 80, maxPctFcmax: 90 },
  { zone: 5, minPctFcmax: 90, maxPctFcmax: 100 },
] as const;

/** Bornes bpm d'une zone pour une FCmax donnée. */
export function hrZoneBpm(fcmaxBpm: number, zone: HrZone): { minBpm: number; maxBpm: number } {
  return {
    minBpm: Math.round((zone.minPctFcmax / 100) * fcmaxBpm),
    maxBpm: Math.round((zone.maxPctFcmax / 100) * fcmaxBpm),
  };
}

// ---------------------------------------------------------------------------
// Allures de course — tables croisées avec l'ambition (E2-3)
// ---------------------------------------------------------------------------

/**
 * Intensités de course par distance : % VMA et % FCmax (spec §7.5, §7.3 —
 * la bande FC du semi 88–92 % FCmax est le cas canonique de la spec).
 * Réglages produit à valider par le coach (G3).
 */
export const RACE_INTENSITY: Record<
  RaceDistance,
  { pctVma: readonly [number, number]; pctFcmax: readonly [number, number] }
> = {
  '5k': { pctVma: [90, 95], pctFcmax: [92, 96] },
  '10k': { pctVma: [85, 90], pctFcmax: [90, 94] },
  semi: { pctVma: [80, 85], pctFcmax: [88, 92] },
  marathon: { pctVma: [73, 78], pctFcmax: [80, 87] },
};

/** Allure (s/km) correspondant à un % de VMA. */
export function paceFromVma(vmaKmh: number, pctVma: number): number {
  if (vmaKmh <= 0 || pctVma <= 0) {
    throw new RangeError(`VMA ou pourcentage invalide : ${vmaKmh} km/h @ ${pctVma} %`);
  }
  return 3600 / (vmaKmh * (pctVma / 100));
}

/**
 * Allure cible de course (s/km) :
 * - ambition `chrono` : temps cible / distance (ex. semi 1h45 → ≈ 299 s/km) ;
 * - ambition `finir` : bas de la fourchette % VMA de la distance (prudent),
 *   nécessite une VMA connue.
 */
export function raceTargetPace(params: {
  raceDistance: RaceDistance;
  ambition: 'finir' | 'chrono';
  targetTimeS?: number;
  vmaKmh?: number;
}): number | undefined {
  const distanceKm = RACE_DISTANCES_M[params.raceDistance] / 1000;
  if (params.ambition === 'chrono') {
    if (params.targetTimeS === undefined) {
      return undefined;
    }
    return params.targetTimeS / distanceKm;
  }
  if (params.vmaKmh === undefined) {
    return undefined;
  }
  return paceFromVma(params.vmaKmh, RACE_INTENSITY[params.raceDistance].pctVma[0]);
}

// ---------------------------------------------------------------------------
// Proposition de recalcul (E2-5) — jamais imposée
// ---------------------------------------------------------------------------

/** Écart relatif au-delà duquel une perf récente « contredit » l'estimation. */
export const RECALC_THRESHOLD_PCT = 3;

/**
 * Détecte qu'une performance récente contredit la VMA courante et propose un
 * recalcul (E2-5). Retourne la valeur proposée, ou `undefined` si rien à
 * proposer. La décision (accepter / garder ses valeurs) reste à l'utilisateur.
 */
export function proposeVmaRecalc(
  currentVmaKmh: number | undefined,
  workouts: Workout[],
): { proposedVmaKmh: number } | undefined {
  const estimate = estimateVmaFromHistory(workouts);
  if (estimate === undefined) {
    return undefined;
  }
  if (currentVmaKmh === undefined) {
    return { proposedVmaKmh: estimate.value };
  }
  const deltaPct = ((estimate.value - currentVmaKmh) / currentVmaKmh) * 100;
  if (deltaPct >= RECALC_THRESHOLD_PCT) {
    return { proposedVmaKmh: estimate.value };
  }
  return undefined;
}
