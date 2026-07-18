import { addDays, dayOfWeek } from '@/lib/dates';
import type { SessionType } from '@/schemas';
import type { GaugeStatus, WeeklyRecap } from '@/training-engine';

import {
  rpeRequestContent,
  sessionReminderContent,
  weeklyKickoffContent,
  weeklyRecapContent,
} from './content';
import type { LocalDateTime, NotificationPrefs, PlannedNotification } from './types';

/**
 * Planification des notifications (Lot 9, E9-1) — fonctions pures,
 * indépendantes d'expo-notifications : « maintenant » est un paramètre,
 * les instants sont en heure locale « mur » (voir `LocalDateTime`).
 * Règles :
 * - préférence off → aucune notification du type (E9-1) ;
 * - ids stables `type:date` → pas de doublon à la replanification ;
 * - rien à dire → rien d'envoyé (D15 : pas de relance culpabilisante).
 */

/** Horaires locaux des notifications récurrentes (spec §6.2). */
export const NOTIFICATION_SCHEDULE = {
  /** « Ta semaine » : lundi matin. */
  ta_semaine: { weekday: 0, hour: 8, minute: 0 },
  /** Rappel de la séance du jour : le matin même. */
  rappel_seance: { hour: 8, minute: 0 },
  /** Récap hebdo : dimanche soir. */
  recap_hebdo: { weekday: 6, hour: 18, minute: 30 },
} as const;

/** Demande de RPE : 30 min après détection de la séance (spec §7.4). */
export const RPE_REQUEST_DELAY_MIN = 30;

/** Horizon de planification des rappels de séance (jours). */
export const REMINDER_HORIZON_DAYS = 7;

/** Séance planifiée minimale pour la planification des notifications. */
export type PlannedSessionLite = {
  /** Date planifiée, ISO `YYYY-MM-DD`. */
  scheduledDate: string;
  sessionType?: SessionType;
  /** Statut (`planned` par défaut) — seules les `planned` déclenchent. */
  status?: string;
};

/** `Date` du device → instant local « mur » (seul pont horloge → planification). */
export function dateToLocalDateTime(date: Date): LocalDateTime {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return {
    date: `${date.getFullYear()}-${month}-${day}`,
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

function minutesOf(time: { hour: number; minute: number }): number {
  return time.hour * 60 + time.minute;
}

/** Ajoute des minutes à un instant local (report de jour géré). */
export function addMinutesLocal(at: LocalDateTime, minutes: number): LocalDateTime {
  const total = minutesOf(at) + minutes;
  const dayShift = Math.floor(total / (24 * 60));
  const inDay = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return {
    date: addDays(at.date, dayShift),
    hour: Math.floor(inDay / 60),
    minute: inDay % 60,
  };
}

/**
 * Prochaine occurrence locale du jour de semaine `weekday` (0 = lundi …
 * 6 = dimanche) à l'heure donnée, strictement dans le futur de `now`
 * (si on est ce jour-là avant l'heure → aujourd'hui, sinon semaine suivante).
 */
export function nextWeekdayAt(
  now: LocalDateTime,
  weekday: number,
  at: { hour: number; minute: number },
): LocalDateTime {
  let offset = (weekday - dayOfWeek(now.date) + 7) % 7;
  if (offset === 0 && minutesOf(now) >= minutesOf(at)) {
    offset = 7;
  }
  return { date: addDays(now.date, offset), hour: at.hour, minute: at.minute };
}

function isPlanned(session: PlannedSessionLite): boolean {
  return session.status === undefined || session.status === 'planned';
}

/**
 * « Ta semaine » (lundi matin, spec §6.2) : planifiée pour le prochain lundi
 * 8 h, avec le nombre de séances de la semaine annoncée et la charge
 * prévisionnelle. Aucune séance planifiée cette semaine-là → rien (D15).
 */
export function planWeeklyKickoff(params: {
  now: LocalDateTime;
  prefs: NotificationPrefs;
  plannedSessions: PlannedSessionLite[];
  forecastStatus?: GaugeStatus;
}): PlannedNotification | undefined {
  const { now, prefs, plannedSessions, forecastStatus } = params;
  if (!prefs.ta_semaine) {
    return undefined;
  }
  const { weekday, hour, minute } = NOTIFICATION_SCHEDULE.ta_semaine;
  const fireAt = nextWeekdayAt(now, weekday, { hour, minute });
  const weekEnd = addDays(fireAt.date, 6);
  const sessionsCount = plannedSessions.filter(
    (session) =>
      isPlanned(session) &&
      session.scheduledDate >= fireAt.date &&
      session.scheduledDate <= weekEnd,
  ).length;
  if (sessionsCount === 0) {
    return undefined;
  }
  return {
    id: `ta_semaine:${fireAt.date}`,
    type: 'ta_semaine',
    fireAt,
    content: weeklyKickoffContent({ sessionsCount, forecastStatus }),
  };
}

/**
 * Rappels de la séance du jour : un par jour de séance à venir (horizon
 * 7 jours), à 8 h locale. Deux séances le même jour → un seul rappel
 * (pas de doublon). Le rappel du jour même est ignoré si 8 h est passé.
 */
export function planSessionReminders(params: {
  now: LocalDateTime;
  prefs: NotificationPrefs;
  plannedSessions: PlannedSessionLite[];
  horizonDays?: number;
}): PlannedNotification[] {
  const { now, prefs, plannedSessions, horizonDays = REMINDER_HORIZON_DAYS } = params;
  if (!prefs.rappel_seance) {
    return [];
  }
  const { hour, minute } = NOTIFICATION_SCHEDULE.rappel_seance;
  const lastDate = addDays(now.date, horizonDays);

  const byDate = new Map<string, PlannedSessionLite[]>();
  for (const session of plannedSessions) {
    if (!isPlanned(session)) {
      continue;
    }
    const { scheduledDate } = session;
    if (scheduledDate < now.date || scheduledDate > lastDate) {
      continue;
    }
    if (scheduledDate === now.date && minutesOf(now) >= hour * 60 + minute) {
      continue;
    }
    byDate.set(scheduledDate, [...(byDate.get(scheduledDate) ?? []), session]);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, sessions]) => ({
      id: `rappel_seance:${date}`,
      type: 'rappel_seance' as const,
      fireAt: { date, hour, minute },
      content: sessionReminderContent({
        sessionType: sessions.length === 1 ? sessions[0]?.sessionType : undefined,
      }),
    }));
}

/**
 * Récap hebdo (dimanche soir, E9-2) : planifié pour le prochain dimanche
 * 18 h 30, contenu construit par `buildRecap` pour la semaine se terminant
 * ce dimanche. Le contenu est recalculé à chaque resynchronisation (app au
 * premier plan) : au fil de la semaine il converge vers l'état réel.
 * Semaine sans prévu ni réalisé → rien (D15 : pas de bruit).
 */
export function planWeeklyRecapNotification(params: {
  now: LocalDateTime;
  prefs: NotificationPrefs;
  /** Construit le récap de la semaine commençant au lundi donné. */
  buildRecap: (weekStart: string) => WeeklyRecap | undefined;
}): PlannedNotification | undefined {
  const { now, prefs, buildRecap } = params;
  if (!prefs.recap_hebdo) {
    return undefined;
  }
  const { weekday, hour, minute } = NOTIFICATION_SCHEDULE.recap_hebdo;
  const fireAt = nextWeekdayAt(now, weekday, { hour, minute });
  const recap = buildRecap(addDays(fireAt.date, -6));
  if (recap === undefined || (recap.doneCount === 0 && recap.plannedCount === 0)) {
    return undefined;
  }
  return {
    id: `recap_hebdo:${fireAt.date}`,
    type: 'recap_hebdo',
    fireAt,
    content: weeklyRecapContent(recap),
  };
}

/**
 * Demande de RPE 30 min après détection/import d'une séance (E9-1, spec
 * §7.4). Id dérivé de l'instant de détection (ou du workout) → une seule
 * demande par séance détectée.
 */
export function planRpeRequest(params: {
  /** Instant local de détection de la séance. */
  detectedAt: LocalDateTime;
  prefs: NotificationPrefs;
  /** Référence de la séance (id workout) pour un id stable, si connue. */
  workoutRef?: string;
}): PlannedNotification | undefined {
  const { detectedAt, prefs, workoutRef } = params;
  if (!prefs.demande_rpe) {
    return undefined;
  }
  const fireAt = addMinutesLocal(detectedAt, RPE_REQUEST_DELAY_MIN);
  const key =
    workoutRef ??
    `${detectedAt.date}T${String(detectedAt.hour).padStart(2, '0')}${String(
      detectedAt.minute,
    ).padStart(2, '0')}`;
  return {
    id: `demande_rpe:${key}`,
    type: 'demande_rpe',
    fireAt,
    content: rpeRequestContent(),
    url: '/rpe-entry',
  };
}

/**
 * Plan complet des notifications récurrentes (« ta semaine », rappels,
 * récap). Les demandes de RPE, événementielles, sont planifiées à part
 * (`planRpeRequest`) au moment de la détection d'une séance.
 */
export function buildNotificationPlan(params: {
  now: LocalDateTime;
  prefs: NotificationPrefs;
  plannedSessions: PlannedSessionLite[];
  forecastStatus?: GaugeStatus;
  buildRecap: (weekStart: string) => WeeklyRecap | undefined;
}): PlannedNotification[] {
  const kickoff = planWeeklyKickoff(params);
  const reminders = planSessionReminders(params);
  const recap = planWeeklyRecapNotification(params);
  return [
    ...(kickoff === undefined ? [] : [kickoff]),
    ...reminders,
    ...(recap === undefined ? [] : [recap]),
  ];
}
