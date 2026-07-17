/**
 * Parsing des saisies des formulaires d'onboarding (présentation uniquement —
 * la validation de domaine reste dans les schémas zod du store).
 */

/** « JJ/MM/AAAA » → ISO `YYYY-MM-DD`, ou `undefined` si la date n'existe pas. */
export function parseFrDate(raw: string): string | undefined {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw.trim());
  if (!match) {
    return undefined;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!valid) {
    return undefined;
  }
  return `${match[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Temps cible → secondes : « 1:45 » ou « 1h45 » (h:mm) ; un nombre seul est
 * lu en minutes (« 45 » → 2700 s). `undefined` si illisible.
 */
export function parseTargetTimeS(raw: string): number | undefined {
  const trimmed = raw.trim().toLowerCase();
  const hourMinutes = /^(\d{1,2})[h:](\d{1,2})$/.exec(trimmed);
  if (hourMinutes) {
    const hours = Number(hourMinutes[1]);
    const minutes = Number(hourMinutes[2]);
    if (minutes >= 60) {
      return undefined;
    }
    return hours * 3600 + minutes * 60;
  }
  const minutesOnly = /^(\d{1,4})$/.exec(trimmed);
  if (minutesOnly) {
    return Number(minutesOnly[1]) * 60;
  }
  return undefined;
}
