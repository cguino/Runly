/**
 * Helpers de dates purs sur chaînes ISO `YYYY-MM-DD` (UTC, déterministes).
 * Le moteur de plan ne lit jamais l'horloge : « aujourd'hui » est un
 * paramètre d'entrée.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toUtc(isoDate: string): Date {
  if (!ISO_DATE.test(isoDate)) {
    throw new RangeError(`date ISO attendue (YYYY-MM-DD) : ${isoDate}`);
  }
  return new Date(`${isoDate}T00:00:00Z`);
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const date = toUtc(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtc(date);
}

/** Différence b − a en jours entiers. */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

/** Jour de semaine : 0 = lundi … 6 = dimanche (convention spec : semaine lun→dim). */
export function dayOfWeek(isoDate: string): number {
  return (toUtc(isoDate).getUTCDay() + 6) % 7;
}

/** Lundi suivant strictement la date (si la date est un lundi → lundi d'après). */
export function nextMonday(isoDate: string): string {
  const offset = 7 - dayOfWeek(isoDate);
  return addDays(isoDate, offset);
}

/**
 * Âge en années révolues à une date donnée (contrôle 16+ à l'onboarding, D12).
 * Anniversaire non atteint dans l'année → année non comptée.
 */
export function yearsBetween(birthIsoDate: string, atIsoDate: string): number {
  const birth = toUtc(birthIsoDate);
  const at = toUtc(atIsoDate);
  let years = at.getUTCFullYear() - birth.getUTCFullYear();
  const birthdayReached =
    at.getUTCMonth() > birth.getUTCMonth() ||
    (at.getUTCMonth() === birth.getUTCMonth() && at.getUTCDate() >= birth.getUTCDate());
  if (!birthdayReached) {
    years -= 1;
  }
  return years;
}
