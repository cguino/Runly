import type { BlockTarget } from '@/schemas';

/**
 * Aide au pacing du player (E5-3) — fonctions pures : position du curseur
 * sur la barre d'allure cible et état de coaching (« dans la cible »,
 * « un poil vite »…). Le wording affiché vit dans `src/i18n` ; ici on ne
 * produit que des états sémantiques.
 */

/** État de pacing vis-à-vis de la cible du bloc courant. */
export type PaceCue =
  | 'no_target'
  | 'no_signal'
  | 'in_target'
  | 'slightly_fast'
  | 'too_fast'
  | 'slightly_slow'
  | 'too_slow';

/** Marge (s/km) au-delà de la bande cible avant de passer de « un poil » à « trop ». */
export const PACE_CUE_SOFT_MARGIN_S = 15;

/**
 * État de coaching pour une allure lissée donnée. Les cibles zone FC / RPE /
 * libres ne produisent pas de guidance d'allure (D6 : pas de FC temps réel).
 */
export function paceCue(
  target: BlockTarget,
  smoothedPaceSecPerKm: number | undefined,
): PaceCue {
  if (target.type !== 'pace') {
    return 'no_target';
  }
  if (smoothedPaceSecPerKm === undefined) {
    return 'no_signal';
  }
  const pace = smoothedPaceSecPerKm;
  // Rappel : allure en s/km — plus petit = plus rapide.
  if (pace < target.minSecondsPerKm - PACE_CUE_SOFT_MARGIN_S) {
    return 'too_fast';
  }
  if (pace < target.minSecondsPerKm) {
    return 'slightly_fast';
  }
  if (pace > target.maxSecondsPerKm + PACE_CUE_SOFT_MARGIN_S) {
    return 'too_slow';
  }
  if (pace > target.maxSecondsPerKm) {
    return 'slightly_slow';
  }
  return 'in_target';
}

/** Bornes de la zone verte sur la barre d'allure (fractions 0–1, charte §4). */
export const PACE_BAR_TARGET_ZONE: readonly [number, number] = [1 / 3, 2 / 3];

/**
 * Position du curseur sur la barre d'allure cible, en fraction 0–1
 * (0 = trop lent, 1 = trop rapide). La bande cible occupe le tiers central ;
 * la marge de part et d'autre correspond à `PACE_CUE_SOFT_MARGIN_S` ×2.
 */
export function paceCursorFraction(
  target: BlockTarget,
  smoothedPaceSecPerKm: number | undefined,
): number | undefined {
  if (target.type !== 'pace' || smoothedPaceSecPerKm === undefined) {
    return undefined;
  }
  const [zoneStart, zoneEnd] = PACE_BAR_TARGET_ZONE;
  // Axe de la barre : lent (gauche) → rapide (droite), donc s/km décroissants ;
  // la marge de part et d'autre de la zone verte couvre ±2 crans de coaching.
  const margin = PACE_CUE_SOFT_MARGIN_S * 2;
  const pace = smoothedPaceSecPerKm;
  if (pace >= target.minSecondsPerKm && pace <= target.maxSecondsPerKm) {
    // Interpolation dans la zone verte centrale.
    const span = target.maxSecondsPerKm - target.minSecondsPerKm;
    const t = span === 0 ? 0.5 : (target.maxSecondsPerKm - pace) / span;
    return zoneStart + t * (zoneEnd - zoneStart);
  }
  if (pace > target.maxSecondsPerKm) {
    const t = Math.min(1, (pace - target.maxSecondsPerKm) / margin);
    return zoneStart * (1 - t);
  }
  const t = Math.min(1, (target.minSecondsPerKm - pace) / margin);
  return zoneEnd + t * (1 - zoneEnd);
}
