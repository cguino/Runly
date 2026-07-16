/**
 * Helpers de format français centralisés (D7, charte §5) :
 * allure « 4:59 /km », virgule décimale, « ≈ » pour les estimations.
 * Fonctions pures, sans dépendance React/Expo.
 */

/** Espace fine insécable, entre valeur et unité. */
const NNBSP = ' ';

/**
 * Formate une allure en secondes par kilomètre : 299 → « 4:59 /km ».
 * Les secondes sont arrondies à l'entier le plus proche.
 */
export function formatPace(secondsPerKm: number): string {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0) {
    throw new RangeError(`allure invalide : ${secondsPerKm}`);
  }
  const total = Math.round(secondsPerKm);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}${NNBSP}/km`;
}

/** Nombre en notation française (virgule décimale) : 1.12 → « 1,12 ». */
export function formatDecimal(value: number, fractionDigits = 2): string {
  return value.toFixed(fractionDigits).replace('.', ',');
}

/** Distance en kilomètres depuis des mètres : 9000 → « 9 km », 9500 → « 9,5 km ». */
export function formatDistanceKm(meters: number): string {
  const km = meters / 1000;
  const rounded = Math.round(km * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : formatDecimal(rounded, 1);
  return `${text}${NNBSP}km`;
}

/** Durée en secondes : 2820 → « 47 min », 3900 → « 1 h 05 ». */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) {
    return `${minutes}${NNBSP}min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0
    ? `${hours}${NNBSP}h`
    : `${hours}${NNBSP}h${NNBSP}${String(rest).padStart(2, '0')}`;
}

/** Préfixe une valeur estimée : « ≈ 47 min » (charte §5 : « ≈ » pour les estimations). */
export function formatApprox(formattedValue: string): string {
  return `≈${NNBSP}${formattedValue}`;
}

/** Date ISO (`YYYY-MM-DD` ou datetime) au format français : « 16/07/2026 ». */
export function formatDateFr(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) {
    throw new RangeError(`date ISO invalide : ${isoDate}`);
  }
  return `${match[3]}/${match[2]}/${match[1]}`;
}
