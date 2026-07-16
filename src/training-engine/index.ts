/**
 * `src/training-engine` — logique métier en fonctions pures
 * (règle transverse n°5) : plan, VMA, allures, ACWR, alertes.
 * Contrainte de frontière : zéro import React/Expo ici — uniquement
 * du TypeScript pur, testable unitairement (golden files au Lot 3).
 */

/** Bornes de la jauge ACWR (D16 : rolling 7 j / 28 j ; charte §4). */
export const ACWR_ZONES = {
  underloadMin: 0.6,
  optimalMin: 0.8,
  peakMin: 1.3,
  max: 1.6,
} as const;

/** Fenêtres de calcul de charge (D16). */
export const LOAD_WINDOWS = { acuteDays: 7, chronicDays: 28 } as const;

export {
  estimateFcmax,
  estimateThresholds,
  estimateVmaFromHistory,
  HR_ZONES_PCT,
  hrZoneBpm,
  paceFromVma,
  proposeVmaRecalc,
  RACE_INTENSITY,
  raceTargetPace,
  RECALC_THRESHOLD_PCT,
  sustainableVmaFraction,
  THRESHOLD_DEFAULTS_PCT_VMA,
  VMA_EFFORT_WINDOW_S,
} from './physio';
