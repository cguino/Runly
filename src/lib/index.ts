/**
 * `src/lib` — utilitaires purs, sans dépendance React/Expo ni métier.
 */

/** Borne une valeur dans [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new RangeError(`bornes inversées : [${min}, ${max}]`);
  }
  return Math.min(max, Math.max(min, value));
}

/** Arrondit à `digits` décimales (arrondi arithmétique). */
export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
