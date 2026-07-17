import type { Workout } from '@/schemas';

import {
  averageWeeklyVolumeKm,
  CALIBRATION_MIN_WEEKS,
  isCalibrating,
  weeksOfHistory,
} from '../history';

const TODAY = '2026-07-17';

function run(startedAt: string, distanceM?: number): Workout {
  return { source: 'healthkit', startedAt, durationS: 2400, distanceM };
}

describe('weeksOfHistory / isCalibrating (E1-2 : jauge en calibration si < 4 semaines)', () => {
  it('0 semaine sans séance → calibration', () => {
    expect(weeksOfHistory([], TODAY)).toBe(0);
    expect(isCalibrating([], TODAY)).toBe(true);
  });

  it('compte les semaines entières depuis la séance la plus ancienne', () => {
    const workouts = [
      run('2026-07-10T08:00:00Z', 5000), // 1 semaine
      run('2026-06-05T08:00:00Z', 5000), // 6 semaines
    ];
    expect(weeksOfHistory(workouts, TODAY)).toBe(6);
    expect(isCalibrating(workouts, TODAY)).toBe(false);
  });

  it('seuil exact : 3 semaines → calibration, 4 semaines → non', () => {
    expect(isCalibrating([run('2026-06-26T08:00:00Z', 5000)], TODAY)).toBe(true); // 3 sem
    expect(isCalibrating([run('2026-06-19T08:00:00Z', 5000)], TODAY)).toBe(false); // 4 sem
    expect(CALIBRATION_MIN_WEEKS).toBe(4);
  });
});

describe('averageWeeklyVolumeKm (E1-4 : volume pré-rempli depuis l’import)', () => {
  it('moyenne sur la fenêtre de 4 semaines, arrondie au 0,5 km', () => {
    const workouts = [
      run('2026-07-15T08:00:00Z', 10_000),
      run('2026-07-08T08:00:00Z', 12_000),
      run('2026-07-01T08:00:00Z', 8_000),
      run('2026-06-24T08:00:00Z', 10_000),
      // Hors fenêtre (> 28 jours) : ignorée.
      run('2026-05-01T08:00:00Z', 40_000),
    ];
    expect(averageWeeklyVolumeKm(workouts, TODAY)).toBe(10);
  });

  it('undefined sans distance exploitable (saisie manuelle du volume)', () => {
    expect(averageWeeklyVolumeKm([], TODAY)).toBeUndefined();
    expect(averageWeeklyVolumeKm([run('2026-07-15T08:00:00Z')], TODAY)).toBeUndefined();
  });
});
