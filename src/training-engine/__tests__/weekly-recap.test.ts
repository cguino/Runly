import { addDays } from '@/lib/dates';

import { buildWeeklyRecap } from '../weekly-recap';
import type { RecapWorkout } from '../weekly-recap';

/**
 * Récap hebdo (E9-2) : réalisé vs prévu, évolution ACWR, code d'adaptation.
 * Semaine récapitulée : lundi 2026-07-13 → dimanche 2026-07-19.
 */

const WEEK_START = '2026-07-13';
const WEEK_END = '2026-07-19';

/** 3 séances/sem (lun, mer, sam) sur `weeks` semaines se terminant à WEEK_END. */
function steadyHistory(weeks: number, load = 300): RecapWorkout[] {
  const workouts: RecapWorkout[] = [];
  for (let week = 0; week < weeks; week += 1) {
    const monday = addDays(WEEK_START, -7 * week);
    for (const offset of [0, 2, 5]) {
      workouts.push({
        startedAt: `${addDays(monday, offset)}T18:00:00+02:00`,
        durationS: 3600,
        distanceM: 10_000,
        load,
      });
    }
  }
  return workouts;
}

describe('buildWeeklyRecap (E9-2)', () => {
  it('refuse un weekStart qui n’est pas un lundi', () => {
    expect(() =>
      buildWeeklyRecap({ weekStart: '2026-07-14', workouts: [], plannedSessions: [] }),
    ).toThrow(RangeError);
  });

  it('compte le réalisé et le prévu de la semaine seulement (annulées exclues)', () => {
    const recap = buildWeeklyRecap({
      weekStart: WEEK_START,
      workouts: steadyHistory(8),
      plannedSessions: [
        { scheduledDate: '2026-07-13' },
        { scheduledDate: '2026-07-15', status: 'planned' },
        { scheduledDate: '2026-07-18', status: 'done' },
        { scheduledDate: '2026-07-16', status: 'cancelled' }, // exclue
        { scheduledDate: '2026-07-21' }, // semaine suivante : exclue
      ],
    });
    expect(recap.weekStart).toBe(WEEK_START);
    expect(recap.weekEnd).toBe(WEEK_END);
    expect(recap.plannedCount).toBe(3);
    expect(recap.doneCount).toBe(3);
    expect(recap.distanceM).toBe(30_000);
    expect(recap.durationS).toBe(3 * 3600);
  });

  it('semaine régulière → zone favorable, tendance stable, continuité', () => {
    const recap = buildWeeklyRecap({
      weekStart: WEEK_START,
      workouts: steadyHistory(8),
      plannedSessions: [],
    });
    expect(recap.endStatus).toBe('favorable');
    expect(recap.acwrEnd).toBeCloseTo(1, 5);
    expect(recap.trend).toBe('stable');
    expect(recap.adaptation).toBe('continuite');
  });

  it('grosse semaine → pic, tendance hausse, proposition de semaine plus légère', () => {
    // Historique régulier + semaine récapitulée très chargée (5 × 500 UA).
    const heavyWeek: RecapWorkout[] = [0, 1, 2, 3, 4].map((offset) => ({
      startedAt: `${addDays(WEEK_START, offset)}T18:00:00+02:00`,
      durationS: 3600,
      distanceM: 12_000,
      load: 500,
    }));
    const history = steadyHistory(8).filter(
      (workout) => workout.startedAt.slice(0, 10) < WEEK_START,
    );
    const recap = buildWeeklyRecap({
      weekStart: WEEK_START,
      workouts: [...history, ...heavyWeek],
      plannedSessions: [],
    });
    expect(recap.endStatus).toBe('pic');
    expect(recap.trend).toBe('hausse');
    expect(recap.adaptation).toBe('semaine_legere');
  });

  it('semaine vide après un historique régulier → sous-charge, relance douce', () => {
    const history = steadyHistory(8).filter(
      (workout) => workout.startedAt.slice(0, 10) < WEEK_START,
    );
    const recap = buildWeeklyRecap({
      weekStart: WEEK_START,
      workouts: history,
      plannedSessions: [{ scheduledDate: '2026-07-15' }],
    });
    expect(recap.doneCount).toBe(0);
    expect(recap.plannedCount).toBe(1);
    expect(recap.endStatus).toBe('sous_charge');
    expect(recap.trend).toBe('baisse');
    expect(recap.adaptation).toBe('relance_douce');
  });

  it('moins de 4 semaines d’historique → jauge en calibration', () => {
    const recap = buildWeeklyRecap({
      weekStart: WEEK_START,
      workouts: steadyHistory(2),
      plannedSessions: [],
    });
    expect(recap.endStatus).toBe('calibration');
    expect(recap.adaptation).toBe('calibration');
  });
});
