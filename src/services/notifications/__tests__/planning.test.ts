import type { WeeklyRecap } from '@/training-engine';

import { localDateTimeToDate } from '../expo-scheduler';
import {
  addMinutesLocal,
  buildNotificationPlan,
  dateToLocalDateTime,
  nextWeekdayAt,
  planRpeRequest,
  planSessionReminders,
  planWeeklyKickoff,
  planWeeklyRecapNotification,
} from '../planning';
import { DEFAULT_NOTIFICATION_PREFS } from '../types';
import type { LocalDateTime, NotificationPrefs } from '../types';

/**
 * Planification (E9-1) : dates locales « mur », préférences off, pas de
 * doublon. Repères : 2026-07-13 = lundi, 2026-07-17 = vendredi,
 * 2026-07-19 = dimanche, 2026-07-20 = lundi.
 */

const PREFS = DEFAULT_NOTIFICATION_PREFS;
const FRIDAY_10H: LocalDateTime = { date: '2026-07-17', hour: 10, minute: 0 };

function prefsWithout(...disabled: (keyof NotificationPrefs)[]): NotificationPrefs {
  const prefs = { ...DEFAULT_NOTIFICATION_PREFS };
  for (const type of disabled) {
    prefs[type] = false;
  }
  return prefs;
}

describe('heure locale « mur » (fuseaux)', () => {
  it('nextWeekdayAt : prochain lundi 8 h depuis un vendredi', () => {
    expect(nextWeekdayAt(FRIDAY_10H, 0, { hour: 8, minute: 0 })).toEqual({
      date: '2026-07-20',
      hour: 8,
      minute: 0,
    });
  });

  it('nextWeekdayAt : un lundi avant 8 h → le jour même ; à 8 h passées → lundi suivant', () => {
    const mondayEarly: LocalDateTime = { date: '2026-07-13', hour: 7, minute: 59 };
    const mondayLate: LocalDateTime = { date: '2026-07-13', hour: 8, minute: 0 };
    expect(nextWeekdayAt(mondayEarly, 0, { hour: 8, minute: 0 }).date).toBe('2026-07-13');
    expect(nextWeekdayAt(mondayLate, 0, { hour: 8, minute: 0 }).date).toBe('2026-07-20');
  });

  it('addMinutesLocal : report de jour à minuit', () => {
    expect(addMinutesLocal({ date: '2026-07-17', hour: 23, minute: 45 }, 30)).toEqual({
      date: '2026-07-18',
      hour: 0,
      minute: 15,
    });
  });

  it('aller-retour Date ↔ LocalDateTime : l’heure « mur » est préservée quel que soit le fuseau du process', () => {
    const fireAt: LocalDateTime = { date: '2026-07-20', hour: 8, minute: 0 };
    expect(dateToLocalDateTime(localDateTimeToDate(fireAt))).toEqual(fireAt);
  });
});

describe('planWeeklyKickoff — « ta semaine », lundi matin', () => {
  const sessions = [
    { scheduledDate: '2026-07-20' },
    { scheduledDate: '2026-07-22' },
    { scheduledDate: '2026-07-25' },
    { scheduledDate: '2026-07-18' }, // semaine courante : ignorée
    { scheduledDate: '2026-07-28' }, // semaine d'après : ignorée
  ];

  it('planifie le prochain lundi 8 h avec les séances de la semaine annoncée', () => {
    const notification = planWeeklyKickoff({
      now: FRIDAY_10H,
      prefs: PREFS,
      plannedSessions: sessions,
      forecastStatus: 'favorable',
    });
    expect(notification?.id).toBe('ta_semaine:2026-07-20');
    expect(notification?.fireAt).toEqual({ date: '2026-07-20', hour: 8, minute: 0 });
    expect(notification?.content.body).toContain('3 séance(s)');
  });

  it('préférence off → rien', () => {
    expect(
      planWeeklyKickoff({
        now: FRIDAY_10H,
        prefs: prefsWithout('ta_semaine'),
        plannedSessions: sessions,
      }),
    ).toBeUndefined();
  });

  it('aucune séance planifiée cette semaine-là → rien (D15 : pas de bruit)', () => {
    expect(
      planWeeklyKickoff({ now: FRIDAY_10H, prefs: PREFS, plannedSessions: [] }),
    ).toBeUndefined();
  });
});

describe('planSessionReminders — rappel de la séance du jour', () => {
  it('un rappel à 8 h par jour de séance dans l’horizon, jamais deux le même jour', () => {
    const reminders = planSessionReminders({
      now: FRIDAY_10H,
      prefs: PREFS,
      plannedSessions: [
        { scheduledDate: '2026-07-18', sessionType: 'seuil' },
        { scheduledDate: '2026-07-20', sessionType: 'ef' },
        { scheduledDate: '2026-07-20', sessionType: 'sortie_longue' }, // même jour → fusion
        { scheduledDate: '2026-07-26' }, // au-delà de l'horizon 7 j : exclue
        { scheduledDate: '2026-07-19', status: 'done' }, // déjà faite : exclue
      ],
    });
    expect(reminders.map((reminder) => reminder.id)).toEqual([
      'rappel_seance:2026-07-18',
      'rappel_seance:2026-07-20',
    ]);
    expect(reminders[0]?.fireAt).toEqual({ date: '2026-07-18', hour: 8, minute: 0 });
    // Séance unique → rappel typé ; deux séances le même jour → générique.
    expect(reminders[0]?.content.body).toContain('seuil');
    expect(reminders[1]?.content.body).toBe(
      'Une séance est prévue aujourd’hui — ton brief t’attend dans l’app.',
    );
  });

  it('le rappel du jour même est ignoré une fois 8 h passées', () => {
    const todaySession = [{ scheduledDate: '2026-07-17' }];
    expect(
      planSessionReminders({ now: FRIDAY_10H, prefs: PREFS, plannedSessions: todaySession }),
    ).toEqual([]);
    expect(
      planSessionReminders({
        now: { date: '2026-07-17', hour: 6, minute: 30 },
        prefs: PREFS,
        plannedSessions: todaySession,
      }),
    ).toHaveLength(1);
  });

  it('préférence off → aucun rappel', () => {
    expect(
      planSessionReminders({
        now: FRIDAY_10H,
        prefs: prefsWithout('rappel_seance'),
        plannedSessions: [{ scheduledDate: '2026-07-18' }],
      }),
    ).toEqual([]);
  });
});

describe('planRpeRequest — demande de RPE 30 min après détection', () => {
  it('se déclenche 30 minutes après la détection', () => {
    const notification = planRpeRequest({
      detectedAt: { date: '2026-07-17', hour: 18, minute: 40 },
      prefs: PREFS,
      workoutRef: 'w-1',
    });
    expect(notification?.id).toBe('demande_rpe:w-1');
    expect(notification?.fireAt).toEqual({ date: '2026-07-17', hour: 19, minute: 10 });
    expect(notification?.url).toBe('/rpe-entry');
  });

  it('id stable sans référence de séance (dérivé de l’instant de détection)', () => {
    const notification = planRpeRequest({
      detectedAt: { date: '2026-07-17', hour: 23, minute: 50 },
      prefs: PREFS,
    });
    expect(notification?.id).toBe('demande_rpe:2026-07-17T2350');
    expect(notification?.fireAt).toEqual({ date: '2026-07-18', hour: 0, minute: 20 });
  });

  it('préférence off → rien', () => {
    expect(
      planRpeRequest({
        detectedAt: { date: '2026-07-17', hour: 18, minute: 40 },
        prefs: prefsWithout('demande_rpe'),
      }),
    ).toBeUndefined();
  });
});

describe('planWeeklyRecapNotification — récap du dimanche soir', () => {
  const recap: WeeklyRecap = {
    weekStart: '2026-07-13',
    weekEnd: '2026-07-19',
    plannedCount: 3,
    doneCount: 2,
    distanceM: 21_000,
    durationS: 7200,
    acwrStart: 0.95,
    acwrEnd: 1.12,
    endStatus: 'favorable',
    trend: 'hausse',
    adaptation: 'continuite',
  };

  it('planifie le prochain dimanche 18 h 30 pour la semaine qui s’y termine', () => {
    const receivedWeekStarts: string[] = [];
    const notification = planWeeklyRecapNotification({
      now: FRIDAY_10H,
      prefs: PREFS,
      buildRecap: (weekStart) => {
        receivedWeekStarts.push(weekStart);
        return recap;
      },
    });
    expect(receivedWeekStarts).toEqual(['2026-07-13']);
    expect(notification?.id).toBe('recap_hebdo:2026-07-19');
    expect(notification?.fireAt).toEqual({ date: '2026-07-19', hour: 18, minute: 30 });
  });

  it('semaine sans prévu ni réalisé → rien (D15 : pas de bruit)', () => {
    expect(
      planWeeklyRecapNotification({
        now: FRIDAY_10H,
        prefs: PREFS,
        buildRecap: () => ({ ...recap, plannedCount: 0, doneCount: 0 }),
      }),
    ).toBeUndefined();
  });

  it('préférence off → rien (le récap n’est même pas construit)', () => {
    const buildRecap = jest.fn(() => recap);
    expect(
      planWeeklyRecapNotification({
        now: FRIDAY_10H,
        prefs: prefsWithout('recap_hebdo'),
        buildRecap,
      }),
    ).toBeUndefined();
    expect(buildRecap).not.toHaveBeenCalled();
  });
});

describe('buildNotificationPlan — plan récurrent complet', () => {
  it('agrège kickoff + rappels + récap avec des ids tous distincts', () => {
    const plan = buildNotificationPlan({
      now: FRIDAY_10H,
      prefs: PREFS,
      plannedSessions: [
        { scheduledDate: '2026-07-18', sessionType: 'sortie_longue' },
        { scheduledDate: '2026-07-20', sessionType: 'ef' },
        { scheduledDate: '2026-07-22', sessionType: 'seuil' },
      ],
      forecastStatus: 'favorable',
      buildRecap: () => ({
        weekStart: '2026-07-13',
        weekEnd: '2026-07-19',
        plannedCount: 2,
        doneCount: 2,
        distanceM: 18_000,
        durationS: 7200,
        acwrStart: 1.0,
        acwrEnd: 1.02,
        endStatus: 'favorable',
        trend: 'stable',
        adaptation: 'continuite',
      }),
    });
    const ids = plan.map((notification) => notification.id);
    expect(ids).toEqual([
      'ta_semaine:2026-07-20',
      'rappel_seance:2026-07-18',
      'rappel_seance:2026-07-20',
      'rappel_seance:2026-07-22',
      'recap_hebdo:2026-07-19',
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
