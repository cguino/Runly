import { formatDecimal, formatDistanceKm, formatDuration } from '@/i18n/format';
import { fr } from '@/i18n/fr';
import type { SessionType } from '@/schemas';
import type { GaugeStatus, WeeklyRecap } from '@/training-engine';

import type { NotificationContent } from './types';

/**
 * Contenu des notifications (Lot 9) — fonctions pures, testées en snapshot.
 * Toutes les strings viennent de `src/i18n/fr.ts` (D7) et passent le filtre
 * wording de `note-reglementaire-dm.md` : aide à la décision, jamais de
 * prédiction ; ton coach bienveillant, tutoiement (charte §5).
 */

const strings = fr.notifications;

/** Interpolation minimale `{{var}}` (même syntaxe que i18next, sans runtime React). */
function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined ? match : String(value);
  });
}

/** « Ta semaine » (lundi matin, spec §6.2) : séances planifiées + charge prévisionnelle. */
export function weeklyKickoffContent(params: {
  sessionsCount: number;
  /** Statut de l'ACWR prévisionnel à J+7 (E7-3), si connu. */
  forecastStatus?: GaugeStatus;
}): NotificationContent {
  const { sessionsCount, forecastStatus } = params;
  const parts = [interpolate(strings.taSemaine.body, { count: sessionsCount })];
  if (forecastStatus !== undefined) {
    parts.push(strings.taSemaine.forecast[forecastStatus]);
  }
  return { title: strings.taSemaine.title, body: parts.join(' ') };
}

/** Rappel de la séance du jour ; générique si le type de séance est inconnu. */
export function sessionReminderContent(params: { sessionType?: SessionType }): NotificationContent {
  const { sessionType } = params;
  const body =
    sessionType === undefined
      ? strings.rappelSeance.bodyGeneric
      : interpolate(strings.rappelSeance.body, {
          session: strings.rappelSeance.sessionTypes[sessionType],
        });
  return { title: strings.rappelSeance.title, body };
}

/** Demande de RPE, 30 min après détection d'une séance (spec §7.4). */
export function rpeRequestContent(): NotificationContent {
  return { title: strings.demandeRpe.title, body: strings.demandeRpe.body };
}

/**
 * Récap hebdo (dimanche soir, E9-2) : réalisé vs prévu, volume, évolution
 * ACWR et message d'adaptation. D15 : constat factuel, jamais culpabilisant.
 */
export function weeklyRecapContent(recap: WeeklyRecap): NotificationContent {
  const parts: string[] = [];

  if (recap.plannedCount > 0 && recap.doneCount === 0) {
    parts.push(strings.recapHebdo.noneWithPlan);
  } else if (recap.plannedCount > 0) {
    parts.push(
      interpolate(strings.recapHebdo.donePlanned, {
        done: recap.doneCount,
        planned: recap.plannedCount,
      }),
    );
  } else {
    parts.push(interpolate(strings.recapHebdo.doneOnly, { done: recap.doneCount }));
  }

  if (recap.doneCount > 0 && recap.distanceM > 0) {
    parts.push(
      interpolate(strings.recapHebdo.volume, {
        distance: formatDistanceKm(recap.distanceM),
        duration: formatDuration(recap.durationS),
      }),
    );
  }

  if (recap.acwrStart !== undefined && recap.acwrEnd !== undefined) {
    parts.push(
      interpolate(strings.recapHebdo.acwrEvolution, {
        from: formatDecimal(recap.acwrStart, 2),
        to: formatDecimal(recap.acwrEnd, 2),
      }),
    );
  }

  parts.push(strings.recapHebdo.adaptation[recap.adaptation]);

  return { title: strings.recapHebdo.title, body: parts.join(' ') };
}
