import { addDays } from '@/lib/dates';

import {
  ACWR_ZONES,
  buildDailyLoads,
  CALIBRATION_MIN_DAYS,
  computeLoadState,
  consecutiveUnderloadDays,
  DEFAULT_EFFORT_FACTOR,
  forecastLoadState,
  LOAD_WINDOWS,
  sessionLoadAmorcage,
  sessionLoadSrpe,
  workoutLoad,
  ZONE_EFFORT_FACTORS,
  zoneFromPctFcmax,
} from '../load';
import type { DailyLoad } from '../load';

const TODAY = '2026-07-16';

/** Chronique régulière : `loadPerDay` UA/j sur `days` jours, finissant à `end`. */
function steadyLoads(days: number, loadPerDay: number, end = TODAY): DailyLoad[] {
  const loads: DailyLoad[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    loads.push({ date: addDays(end, -i), load: loadPerDay });
  }
  return loads;
}

describe('charge de séance — sRPE (spec §7.6)', () => {
  it('calcule RPE × durée en minutes', () => {
    expect(sessionLoadSrpe(7, 60)).toBe(420);
    expect(sessionLoadSrpe(0, 45)).toBe(0);
    expect(sessionLoadSrpe(10, 30)).toBe(300);
  });

  it('rejette un RPE hors 0–10 ou une durée non positive', () => {
    expect(() => sessionLoadSrpe(11, 60)).toThrow(RangeError);
    expect(() => sessionLoadSrpe(-1, 60)).toThrow(RangeError);
    expect(() => sessionLoadSrpe(5, 0)).toThrow(RangeError);
    expect(() => sessionLoadSrpe(5, Number.NaN)).toThrow(RangeError);
  });
});

describe("charge d'amorçage — durée × facteur de zone (D4)", () => {
  it('dérive la zone du % FCmax quand FC moyenne et FCmax sont connues', () => {
    // 130 bpm / 185 bpm ≈ 70,3 % FCmax → zone 3 → facteur 4,5.
    expect(sessionLoadAmorcage(60, { avgHrBpm: 130, fcmaxBpm: 185 })).toBe(60 * 4.5);
    // 120 / 185 ≈ 64,9 % → zone 2.
    expect(sessionLoadAmorcage(60, { avgHrBpm: 120, fcmaxBpm: 185 })).toBe(
      60 * ZONE_EFFORT_FACTORS[2],
    );
  });

  it('retombe sur le facteur endurance fondamentale sans donnée FC', () => {
    expect(sessionLoadAmorcage(45)).toBe(45 * DEFAULT_EFFORT_FACTOR);
    expect(sessionLoadAmorcage(45, { avgHrBpm: 140 })).toBe(45 * DEFAULT_EFFORT_FACTOR);
    expect(sessionLoadAmorcage(45, { fcmaxBpm: 185 })).toBe(45 * DEFAULT_EFFORT_FACTOR);
  });

  it('mappe les % FCmax sur les 5 zones (bornes spec §7.5)', () => {
    expect(zoneFromPctFcmax(50)).toBe(1);
    expect(zoneFromPctFcmax(59.9)).toBe(1);
    expect(zoneFromPctFcmax(60)).toBe(2);
    expect(zoneFromPctFcmax(70)).toBe(3);
    expect(zoneFromPctFcmax(80)).toBe(4);
    expect(zoneFromPctFcmax(90)).toBe(5);
    expect(zoneFromPctFcmax(105)).toBe(5); // FC max de séance > FCmax profil : clampé
    expect(() => zoneFromPctFcmax(-1)).toThrow(RangeError);
  });

  it('workoutLoad choisit sRPE si le RPE est saisi, sinon amorçage', () => {
    const workout = { durationS: 3600, avgHrBpm: 130 };
    expect(workoutLoad(workout, { rpe: 6, fcmaxBpm: 185 })).toEqual({
      load: 360,
      method: 'srpe',
    });
    expect(workoutLoad(workout, { fcmaxBpm: 185 })).toEqual({
      load: 270,
      method: 'amorcage',
    });
    expect(workoutLoad({ durationS: 2700 })).toEqual({
      load: 45 * DEFAULT_EFFORT_FACTOR,
      method: 'amorcage',
    });
  });
});

describe('normalisation des UA entre méthodes (D4) — pas de « marche » à la bascule', () => {
  it('même séance ≈ même UA par les deux méthodes (tolérance ≤ 15 %)', () => {
    // Séance EF typique : 60 min à ~65 % FCmax, ressentie RPE 3.
    const efSrpe = sessionLoadSrpe(3, 60);
    const efAmorcage = sessionLoadAmorcage(60, { avgHrBpm: 120, fcmaxBpm: 185 });
    expect(Math.abs(efAmorcage - efSrpe) / efSrpe).toBeLessThanOrEqual(0.15);

    // Séance qualité : 50 min à ~85 % FCmax, ressentie RPE 6–7.
    const qualitySrpe = sessionLoadSrpe(6.5, 50);
    const qualityAmorcage = sessionLoadAmorcage(50, { avgHrBpm: 157, fcmaxBpm: 185 });
    expect(Math.abs(qualityAmorcage - qualitySrpe) / qualitySrpe).toBeLessThanOrEqual(0.15);
  });

  it("chronique continue à la bascule amorçage → sRPE : l'ACWR reste ≈ 1", () => {
    // 28 j d'historique importé (amorçage) puis 7 j de séances saisies (sRPE),
    // toutes identiques : 50 min EF à ~65 % FCmax, ressenties RPE 3.
    const sessions: { startedAt: string; load: number }[] = [];
    for (let i = 34; i >= 7; i -= 1) {
      sessions.push({
        startedAt: addDays(TODAY, -i),
        load: sessionLoadAmorcage(50, { avgHrBpm: 120, fcmaxBpm: 185 }),
      });
    }
    for (let i = 6; i >= 0; i -= 1) {
      sessions.push({ startedAt: addDays(TODAY, -i), load: sessionLoadSrpe(3, 50) });
    }
    const state = computeLoadState({ dailyLoads: buildDailyLoads(sessions), today: TODAY });
    // Entraînement inchangé → pas de marche : ACWR proche de 1 (± 10 %).
    expect(state.acwr).toBeDefined();
    expect(state.acwr).toBeGreaterThanOrEqual(0.9);
    expect(state.acwr).toBeLessThanOrEqual(1.1);
    expect(state.status).toBe('favorable');
  });
});

describe('chronique quotidienne — buildDailyLoads', () => {
  it('agrège les charges par jour civil et trie par date', () => {
    const loads = buildDailyLoads([
      { startedAt: '2026-07-15T18:30:00+02:00', load: 200 },
      { startedAt: '2026-07-14T07:00:00+02:00', load: 150 },
      { startedAt: '2026-07-15T07:00:00+02:00', load: 100 },
    ]);
    expect(loads).toEqual([
      { date: '2026-07-14', load: 150 },
      { date: '2026-07-15', load: 300 },
    ]);
  });

  it('retourne un tableau vide sans séance', () => {
    expect(buildDailyLoads([])).toEqual([]);
  });
});

describe('ACWR rolling 7 j / 28 j (D16)', () => {
  it('vaut 1 sur une chronique parfaitement régulière', () => {
    const state = computeLoadState({ dailyLoads: steadyLoads(56, 100), today: TODAY });
    expect(state.acuteLoad7d).toBe(700);
    expect(state.chronicWeeklyLoad28d).toBe(700);
    expect(state.acwr).toBeCloseTo(1, 5);
    expect(state.status).toBe('favorable');
  });

  it('détecte un pic (> 1,3) quand la semaine courante double', () => {
    const dailyLoads = [
      ...steadyLoads(28, 100, addDays(TODAY, -7)),
      ...steadyLoads(7, 250, TODAY),
    ];
    const state = computeLoadState({ dailyLoads, today: TODAY, historyStart: addDays(TODAY, -34) });
    expect(state.acwr).toBeGreaterThan(ACWR_ZONES.peakMin);
    expect(state.status).toBe('pic');
  });

  it('détecte la sous-charge (< 0,8) quand la semaine courante s’allège', () => {
    const dailyLoads = [
      ...steadyLoads(21, 100, addDays(TODAY, -7)),
      ...steadyLoads(7, 40, TODAY),
    ];
    const state = computeLoadState({ dailyLoads, today: TODAY, historyStart: addDays(TODAY, -27) });
    expect(state.acwr).toBeLessThan(ACWR_ZONES.optimalMin);
    expect(state.status).toBe('sous_charge');
  });

  it('tolère les trous de données : les jours sans séance comptent 0', () => {
    // 3 séances/sem seulement — motif hebdo régulier → ACWR = 1.
    const sessions: { startedAt: string; load: number }[] = [];
    for (let week = 0; week < 8; week += 1) {
      for (const offset of [0, 2, 5]) {
        sessions.push({ startedAt: addDays(TODAY, -(week * 7 + offset)), load: 250 });
      }
    }
    const state = computeLoadState({ dailyLoads: buildDailyLoads(sessions), today: TODAY });
    expect(state.acuteLoad7d).toBe(750);
    expect(state.acwr).toBeCloseTo(1, 5);
    expect(state.status).toBe('favorable');
  });

  it('arrêt ≥ 2 semaines : la chronique décroît, la reprise ressort en pic', () => {
    // 8 semaines régulières, puis 3 semaines d'arrêt total.
    const dailyLoads = steadyLoads(56, 100, addDays(TODAY, -21));
    const pause = computeLoadState({ dailyLoads, today: TODAY, historyStart: addDays(TODAY, -76) });
    expect(pause.acuteLoad7d).toBe(0);
    expect(pause.chronicWeeklyLoad28d).toBe(175); // 7 j de charge résiduelle / 4 sem
    expect(pause.status).toBe('sous_charge');

    // Reprise « comme avant » après l'arrêt → l'ACWR signale le pic.
    const resumed = [...dailyLoads, ...steadyLoads(7, 100, TODAY)];
    const resume = computeLoadState({
      dailyLoads: resumed,
      today: TODAY,
      historyStart: addDays(TODAY, -76),
    });
    expect(resume.acwr).toBeGreaterThan(ACWR_ZONES.peakMin);
    expect(resume.status).toBe('pic');
  });

  it('arrêt complet > 28 j : chronique nulle → ACWR indéfini, sous-charge', () => {
    const dailyLoads = steadyLoads(28, 100, addDays(TODAY, -30));
    const state = computeLoadState({ dailyLoads, today: TODAY });
    expect(state.acuteLoad7d).toBe(0);
    expect(state.chronicWeeklyLoad28d).toBe(0);
    expect(state.acwr).toBeUndefined();
    expect(state.status).toBe('sous_charge');
  });

  it('fenêtre partielle : la moyenne hebdo est rapportée aux jours couverts', () => {
    // 14 jours d'historique à 100 UA/j : chronique hebdo = 700, pas 350.
    const state = computeLoadState({ dailyLoads: steadyLoads(14, 100), today: TODAY });
    expect(state.historyDays).toBe(14);
    expect(state.chronicWeeklyLoad28d).toBeCloseTo(700, 5);
    expect(state.acwr).toBeCloseTo(1, 5);
    expect(state.status).toBe('calibration'); // < 4 semaines de données
  });

  it('sans aucune donnée : état vide en calibration', () => {
    const state = computeLoadState({ dailyLoads: [], today: TODAY });
    expect(state).toMatchObject({
      acuteLoad7d: 0,
      chronicWeeklyLoad28d: 0,
      acwr: undefined,
      historyDays: 0,
      status: 'calibration',
    });
  });
});

describe('état calibration (< 4 semaines de données, spec §7.6)', () => {
  it('reste en calibration à 27 jours et en sort à 28', () => {
    const day27 = computeLoadState({
      dailyLoads: steadyLoads(CALIBRATION_MIN_DAYS - 1, 100),
      today: TODAY,
    });
    expect(day27.historyDays).toBe(27);
    expect(day27.status).toBe('calibration');

    const day28 = computeLoadState({
      dailyLoads: steadyLoads(CALIBRATION_MIN_DAYS, 100),
      today: TODAY,
    });
    expect(day28.historyDays).toBe(28);
    expect(day28.status).toBe('favorable');
  });

  it("respecte un historyStart explicite antérieur à la première charge", () => {
    // Import santé couvrant 40 j mais premières courses il y a 10 j :
    // l'historique couvert fait foi, pas la première charge.
    const state = computeLoadState({
      dailyLoads: steadyLoads(10, 100),
      today: TODAY,
      historyStart: addDays(TODAY, -39),
    });
    expect(state.historyDays).toBe(40);
    expect(state.status).not.toBe('calibration');
  });
});

describe('ACWR prévisionnel à J+7 (E7-3)', () => {
  const history = steadyLoads(56, 100);

  it('projette la chronique passée + les séances planifiées', () => {
    const planned = [1, 3, 5, 7].map((offset) => ({
      scheduledDate: addDays(TODAY, offset),
      estimatedLoad: 175,
    }));
    const forecast = forecastLoadState({ dailyLoads: history, today: TODAY, plannedSessions: planned });
    expect(forecast.date).toBe(addDays(TODAY, 7));
    expect(forecast.acuteLoad7d).toBe(700); // 4 × 175 : même charge hebdo
    expect(forecast.acwr).toBeCloseTo(1, 1);
  });

  it('signale un pic à venir si la semaine planifiée est trop chargée', () => {
    const planned = [1, 2, 3, 4, 5, 6, 7].map((offset) => ({
      scheduledDate: addDays(TODAY, offset),
      estimatedLoad: 220,
    }));
    const forecast = forecastLoadState({ dailyLoads: history, today: TODAY, plannedSessions: planned });
    expect(forecast.acwr).toBeGreaterThan(ACWR_ZONES.peakMin);
    expect(forecast.status).toBe('pic');
  });

  it('ignore les séances passées ou au-delà de J+7', () => {
    const forecast = forecastLoadState({
      dailyLoads: history,
      today: TODAY,
      plannedSessions: [
        { scheduledDate: TODAY, estimatedLoad: 999 }, // aujourd'hui : déjà dans la chronique
        { scheduledDate: addDays(TODAY, 8), estimatedLoad: 999 },
      ],
    });
    expect(forecast.acuteLoad7d).toBe(0); // aucune séance planifiée dans (J, J+7]
  });

  it('sans plan : la projection montre la décrue naturelle', () => {
    const forecast = forecastLoadState({ dailyLoads: history, today: TODAY, plannedSessions: [] });
    expect(forecast.acwr).toBeLessThan(ACWR_ZONES.optimalMin);
  });
});

describe('consecutiveUnderloadDays (déclencheur sous-charge, E7-4)', () => {
  it('compte les jours consécutifs en sous-charge en remontant', () => {
    // 8 semaines régulières puis 16 jours presque à l'arrêt.
    const dailyLoads = [
      ...steadyLoads(56, 100, addDays(TODAY, -16)),
      { date: addDays(TODAY, -8), load: 30 },
    ];
    const days = consecutiveUnderloadDays({
      dailyLoads,
      today: TODAY,
      historyStart: addDays(TODAY, -71),
    });
    expect(days).toBeGreaterThanOrEqual(15);
  });

  it('vaut 0 quand la charge est dans la zone favorable', () => {
    expect(consecutiveUnderloadDays({ dailyLoads: steadyLoads(56, 100), today: TODAY })).toBe(0);
  });

  it('vaut 0 sans historique', () => {
    expect(consecutiveUnderloadDays({ dailyLoads: [], today: TODAY })).toBe(0);
  });

  it('LOAD_WINDOWS reste alignée sur D16', () => {
    expect(LOAD_WINDOWS).toEqual({ acuteDays: 7, chronicDays: 28 });
    expect(ACWR_ZONES.optimalMin).toBe(0.8);
    expect(ACWR_ZONES.peakMin).toBe(1.3);
  });
});
