import {
  createGpsTrackState,
  haversineM,
  ingestGpsSample,
  markGpsStale,
  MAX_ACCEPTED_ACCURACY_M,
  SIGNAL_LOST_AFTER_MS,
} from '../gps-core';
import type { GpsSample, GpsTrackState } from '../gps-core';

/**
 * Traces GPX rejouées (plan §Lot 6) : points synthétiques le long d'un
 * méridien (1° de latitude ≈ 111,32 km) — nominal, perte de signal, dérive.
 */

const LAT0 = 45.0;
const LON0 = 5.0;
const M_PER_DEG_LAT = 111_320;
const T0 = 1_752_700_000_000;

/** Point de trace à `distanceM` du départ, à l'instant `tMs`. */
function point(distanceM: number, tMs: number, accuracyM = 8): GpsSample {
  return {
    latitudeDeg: LAT0 + distanceM / M_PER_DEG_LAT,
    longitudeDeg: LON0,
    timestampMs: T0 + tMs,
    accuracyM,
  };
}

/** Rejoue une trace complète et retourne l'état final. */
function replay(state: GpsTrackState, samples: GpsSample[]): GpsTrackState {
  return samples.reduce((acc, sample) => ingestGpsSample(acc, sample).state, state);
}

/** Trace nominale : un fix toutes les 3 s à 5:00 /km (10 m / 3 s). */
function nominalTrace(fixes: number): GpsSample[] {
  return Array.from({ length: fixes }, (_, i) => point(i * 10, i * 3000));
}

describe('haversineM', () => {
  it('mesure ~111,32 km par degré de latitude', () => {
    const d = haversineM(point(0, 0), {
      latitudeDeg: LAT0 + 1,
      longitudeDeg: LON0,
      timestampMs: T0,
    });
    expect(d).toBeGreaterThan(110_500);
    expect(d).toBeLessThan(111_500);
  });
});

describe('trace nominale (E5-2) — allure lissée et distance', () => {
  it('cumule la distance et lisse l’allure à ~5:00 /km', () => {
    const state = replay(createGpsTrackState(), nominalTrace(21)); // 60 s, 200 m
    expect(state.signal).toBe('ok');
    expect(state.totalDistanceM).toBeCloseTo(200, 0);
    // 5:00 /km = 300 s/km, lissage sur fenêtre glissante 30 s.
    expect(state.smoothedPaceSecPerKm).toBeDefined();
    expect(state.smoothedPaceSecPerKm ?? 0).toBeGreaterThan(290);
    expect(state.smoothedPaceSecPerKm ?? 0).toBeLessThan(310);
  });

  it('le lissage amortit un fix bruité isolé', () => {
    const noisy = nominalTrace(21).map((sample, i) =>
      i === 10 ? { ...sample, latitudeDeg: sample.latitudeDeg + 15 / M_PER_DEG_LAT } : sample,
    );
    const state = replay(createGpsTrackState(), noisy);
    // L'allure lissée reste proche de 5:00 /km malgré le point bruité.
    expect(state.smoothedPaceSecPerKm ?? 0).toBeGreaterThan(250);
    expect(state.smoothedPaceSecPerKm ?? 0).toBeLessThan(320);
  });

  it('premier fix : ancre sans distance ni allure', () => {
    const { state, deltaDistanceM } = ingestGpsSample(createGpsTrackState(), point(0, 0));
    expect(deltaDistanceM).toBe(0);
    expect(state.totalDistanceM).toBe(0);
    expect(state.smoothedPaceSecPerKm).toBeUndefined();
  });
});

describe('perte de signal (D13) — dégradation gracieuse', () => {
  it('sans fix récent, le signal passe lost et l’allure reste figée', () => {
    const state = replay(createGpsTrackState(), nominalTrace(11));
    const paceBefore = state.smoothedPaceSecPerKm;
    const stale = markGpsStale(state, T0 + 30_000 + SIGNAL_LOST_AFTER_MS + 1);
    expect(stale.signal).toBe('lost');
    expect(stale.smoothedPaceSecPerKm).toBe(paceBefore);
  });

  it('au retour du signal : ré-ancrage — le trou n’est pas compté, puis la distance reprend', () => {
    let state = replay(createGpsTrackState(), nominalTrace(11)); // 100 m en 30 s
    const distanceBefore = state.totalDistanceM;
    state = markGpsStale(state, T0 + 30_000 + SIGNAL_LOST_AFTER_MS + 1);

    // Retour 60 s plus tard, 150 m plus loin : le segment du trou est ignoré.
    const back = ingestGpsSample(state, point(250, 90_000));
    expect(back.deltaDistanceM).toBe(0);
    expect(back.state.totalDistanceM).toBe(distanceBefore);
    expect(back.state.signal).toBe('ok');

    // Les fixes suivants comptent à nouveau.
    const next = ingestGpsSample(back.state, point(260, 93_000));
    expect(next.deltaDistanceM).toBeCloseTo(10, 0);
    expect(next.state.totalDistanceM).toBeCloseTo(distanceBefore + 10, 0);
  });
});

describe('dérive GPS (E5-2) — filtrage', () => {
  it('rejette les fixes trop imprécis', () => {
    const state = replay(createGpsTrackState(), nominalTrace(5));
    const bad = ingestGpsSample(state, point(500, 15_000, MAX_ACCEPTED_ACCURACY_M + 20));
    expect(bad.deltaDistanceM).toBe(0);
    expect(bad.state.totalDistanceM).toBe(state.totalDistanceM);
  });

  it('marque le signal faible sur un fix imprécis mais accepté', () => {
    const state = replay(createGpsTrackState(), nominalTrace(5));
    const weak = ingestGpsSample(state, point(45, 15_000, 30));
    expect(weak.state.signal).toBe('weak');
  });

  it('rejette un saut implausible (téléportation) et ré-ancre', () => {
    const state = replay(createGpsTrackState(), nominalTrace(5)); // 40 m en 12 s
    const jump = ingestGpsSample(state, point(600, 15_000)); // 560 m en 3 s
    expect(jump.deltaDistanceM).toBe(0);
    expect(jump.state.totalDistanceM).toBe(state.totalDistanceM);
    // La suite de la trace repart du nouveau point.
    const next = ingestGpsSample(jump.state, point(610, 18_000));
    expect(next.deltaDistanceM).toBeCloseTo(10, 0);
  });
});
