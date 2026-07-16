import { formatPace } from '@/i18n/format';

import { beginnerHistory, regularHistory, sparseHistory } from '../__fixtures__/workouts';
import {
  estimateFcmax,
  estimateThresholds,
  estimateVmaFromHistory,
  HR_ZONES_PCT,
  hrZoneBpm,
  paceFromVma,
  proposeVmaRecalc,
  RACE_INTENSITY,
  raceTargetPace,
  sustainableVmaFraction,
} from '../physio';

describe('estimateVmaFromHistory (E2-1)', () => {
  it('estime la VMA du coureur régulier depuis son effort de 10 min', () => {
    const vma = estimateVmaFromHistory(regularHistory);
    // 2 750 m en 600 s = 16,5 km/h ; fraction soutenable à 10 min ≈ 0,947
    expect(vma).toBeDefined();
    expect(vma?.value).toBeCloseTo(17.4, 1);
    expect(vma?.confidence).toBe('estime');
  });

  it('ne retourne rien pour le débutant sans effort 5–12 min', () => {
    expect(estimateVmaFromHistory(beginnerHistory)).toBeUndefined();
  });

  it('ne retourne rien sur données creuses (sans distance)', () => {
    expect(estimateVmaFromHistory(sparseHistory)).toBeUndefined();
  });

  it('la fraction soutenable décroît avec la durée (modèle CP simplifié)', () => {
    expect(sustainableVmaFraction(6 * 60)).toBeCloseTo(1.0);
    expect(sustainableVmaFraction(12 * 60)).toBeCloseTo(0.92);
    expect(sustainableVmaFraction(5 * 60)).toBeGreaterThan(1.0);
    expect(() => sustainableVmaFraction(60)).toThrow(RangeError);
  });
});

describe('estimateFcmax (E2-2)', () => {
  it('prend le max observé de l’historique (mesuré)', () => {
    const fcmax = estimateFcmax({ workouts: regularHistory, ageYears: 34 });
    expect(fcmax).toEqual({ value: 191, confidence: 'mesure' });
  });

  it('retombe sur Tanaka 208 − 0,7 × âge sans FC observée (défaut)', () => {
    const fcmax = estimateFcmax({ workouts: sparseHistory, ageYears: 30 });
    expect(fcmax).toEqual({ value: 187, confidence: 'defaut' });
  });

  it('ne retourne rien sans FC ni âge', () => {
    expect(estimateFcmax({ workouts: sparseHistory })).toBeUndefined();
  });
});

describe('estimateThresholds (E2-2)', () => {
  it('propose SV1/SV2 en % VMA, marqués estimés (spec §7.5 : 70–80 / 85–90)', () => {
    const { sv1PctVma, sv2PctVma } = estimateThresholds();
    expect(sv1PctVma.value).toBeGreaterThanOrEqual(70);
    expect(sv1PctVma.value).toBeLessThanOrEqual(80);
    expect(sv2PctVma.value).toBeGreaterThanOrEqual(85);
    expect(sv2PctVma.value).toBeLessThanOrEqual(90);
    expect(sv1PctVma.confidence).toBe('estime');
  });
});

describe('zones FC (E2-3)', () => {
  it('couvre 50–100 % FCmax en 5 zones contiguës', () => {
    expect(HR_ZONES_PCT).toHaveLength(5);
    expect(HR_ZONES_PCT[0]?.minPctFcmax).toBe(50);
    expect(HR_ZONES_PCT[4]?.maxPctFcmax).toBe(100);
    for (let i = 1; i < HR_ZONES_PCT.length; i += 1) {
      expect(HR_ZONES_PCT[i]?.minPctFcmax).toBe(HR_ZONES_PCT[i - 1]?.maxPctFcmax);
    }
  });

  it('matérialise les bornes bpm pour une FCmax donnée', () => {
    const zone4 = HR_ZONES_PCT[3];
    expect(zone4).toBeDefined();
    expect(hrZoneBpm(190, zone4!)).toEqual({ minBpm: 152, maxBpm: 171 });
  });
});

describe('allures de course (E2-3) — cas canonique spec §7.3', () => {
  it('objectif semi 1h45 → allure ≈ 4:59 /km', () => {
    const pace = raceTargetPace({
      raceDistance: 'semi',
      ambition: 'chrono',
      targetTimeS: 105 * 60,
    });
    expect(pace).toBeDefined();
    // 6 300 s / 21,0975 km = 298,6 s/km → « 4:59 /km »
    expect(Math.round(pace!)).toBe(299);
    expect(formatPace(pace!)).toContain('4:59');
  });

  it('la bande FC du semi est 88–92 % FCmax', () => {
    expect(RACE_INTENSITY.semi.pctFcmax).toEqual([88, 92]);
  });

  it('ambition « finir » : allure prudente depuis la VMA', () => {
    // VMA 16 km/h, marathon à 73 % VMA → 11,68 km/h ≈ 308 s/km
    const pace = raceTargetPace({ raceDistance: 'marathon', ambition: 'finir', vmaKmh: 16 });
    expect(pace).toBeCloseTo(3600 / (16 * 0.73), 0);
  });

  it('retourne undefined si les entrées manquent', () => {
    expect(raceTargetPace({ raceDistance: '5k', ambition: 'chrono' })).toBeUndefined();
    expect(raceTargetPace({ raceDistance: '5k', ambition: 'finir' })).toBeUndefined();
  });

  it('paceFromVma rejette les entrées invalides', () => {
    expect(() => paceFromVma(0, 80)).toThrow(RangeError);
  });
});

describe('proposeVmaRecalc (E2-5) — jamais imposé', () => {
  it('propose un recalcul quand une perf récente dépasse la VMA courante de ≥ 3 %', () => {
    const proposal = proposeVmaRecalc(16, regularHistory);
    expect(proposal).toEqual({ proposedVmaKmh: 17.4 });
  });

  it('ne propose rien quand l’estimation est cohérente avec la valeur courante', () => {
    expect(proposeVmaRecalc(17.3, regularHistory)).toBeUndefined();
  });

  it('ne propose rien sans effort exploitable', () => {
    expect(proposeVmaRecalc(15, beginnerHistory)).toBeUndefined();
  });

  it('propose la première estimation quand aucune VMA n’est encore connue', () => {
    expect(proposeVmaRecalc(undefined, regularHistory)).toEqual({ proposedVmaKmh: 17.4 });
  });
});
