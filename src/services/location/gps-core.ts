/**
 * Cœur GPS pur (E5-2) — aucune dépendance Expo : filtrage des fixes,
 * distance cumulée (haversine), allure lissée par **fenêtre glissante**
 * (algo du spike E0-4, `stack-technique.md`) et état de signal.
 *
 * Dégradation gracieuse (D13) : en perte de signal l'allure lissée est
 * **figée** (badge « signal faible » côté UI), la distance cesse de
 * s'accumuler puis **reprend au retour du signal** — le segment couvrant le
 * trou n'est pas compté (pas de téléportation dans la distance).
 */

export type GpsSample = {
  latitudeDeg: number;
  longitudeDeg: number;
  /** Epoch ms du fix. */
  timestampMs: number;
  /** Précision horizontale (m) — undefined = inconnue (acceptée). */
  accuracyM?: number;
};

export type GpsSignal = 'acquiring' | 'ok' | 'weak' | 'lost';

/** Précision au-delà de laquelle un fix est rejeté (dérive urbaine). */
export const MAX_ACCEPTED_ACCURACY_M = 35;
/** Précision au-delà de laquelle le signal est marqué « faible ». */
export const WEAK_ACCURACY_M = 20;
/** Sans fix accepté depuis ce délai, le signal est perdu (allure figée). */
export const SIGNAL_LOST_AFTER_MS = 10_000;
/** Fenêtre glissante de lissage de l'allure. */
export const PACE_WINDOW_MS = 30_000;
/** Vitesse humaine plausible max (m/s) — au-delà, fix rejeté (saut GPS). */
export const MAX_PLAUSIBLE_SPEED_MPS = 12.5;
/** Sous cette vitesse (m/s), on considère l'allure non significative (marche/arrêt). */
export const MIN_PACE_SPEED_MPS = 0.5;

type WindowPoint = { startMs: number; endMs: number; distanceM: number };

export type GpsTrackState = {
  signal: GpsSignal;
  /** Distance cumulée acceptée (m). */
  totalDistanceM: number;
  /** Allure lissée (s/km) — figée sur la dernière valeur en perte de signal. */
  smoothedPaceSecPerKm?: number;
  /** Dernier fix accepté (référence du prochain segment). */
  lastAccepted?: GpsSample;
  /** Segments datés de la fenêtre de lissage. */
  window: WindowPoint[];
};

export function createGpsTrackState(): GpsTrackState {
  return { signal: 'acquiring', totalDistanceM: 0, window: [] };
}

const EARTH_RADIUS_M = 6_371_000;

/** Distance haversine entre deux fixes (m). */
export function haversineM(a: GpsSample, b: GpsSample): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitudeDeg - a.latitudeDeg);
  const dLon = toRad(b.longitudeDeg - a.longitudeDeg);
  const lat1 = toRad(a.latitudeDeg);
  const lat2 = toRad(b.latitudeDeg);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function windowPace(window: WindowPoint[], nowMs: number): number | undefined {
  const pruned = window.filter((p) => nowMs - p.endMs <= PACE_WINDOW_MS);
  if (pruned.length === 0) {
    return undefined;
  }
  const distance = pruned.reduce((sum, p) => sum + p.distanceM, 0);
  // Étendue réelle couverte : du début du plus ancien segment à maintenant.
  const spanMs = nowMs - Math.min(...pruned.map((p) => p.startMs));
  if (spanMs <= 0) {
    return undefined;
  }
  const speedMps = distance / (spanMs / 1000);
  if (speedMps < MIN_PACE_SPEED_MPS) {
    return undefined;
  }
  return 1000 / speedMps;
}

export type GpsIngestResult = {
  state: GpsTrackState;
  /** Distance validée par ce fix (m) — à transmettre à la machine à états. */
  deltaDistanceM: number;
};

/** Intègre un fix GPS : filtre, distance, lissage, état de signal. */
export function ingestGpsSample(state: GpsTrackState, sample: GpsSample): GpsIngestResult {
  // Fix trop imprécis : rejeté. Le signal se dégradera via `markGpsStale`.
  if (sample.accuracyM !== undefined && sample.accuracyM > MAX_ACCEPTED_ACCURACY_M) {
    return { state, deltaDistanceM: 0 };
  }

  const wasLost = state.signal === 'lost' || state.signal === 'acquiring';
  const quality: GpsSignal =
    sample.accuracyM !== undefined && sample.accuracyM > WEAK_ACCURACY_M ? 'weak' : 'ok';

  // Premier fix, ou retour de signal : on ré-ancre sans compter le segment
  // couvrant le trou (la distance « reprend », D13).
  const last = state.lastAccepted;
  const gapMs = last === undefined ? Infinity : sample.timestampMs - last.timestampMs;
  if (last === undefined || wasLost || gapMs > SIGNAL_LOST_AFTER_MS || gapMs <= 0) {
    return {
      state: {
        ...state,
        signal: quality,
        lastAccepted: sample,
        window: [],
        // L'allure lissée précédente reste figée jusqu'à re-mesure.
      },
      deltaDistanceM: 0,
    };
  }

  const segmentM = haversineM(last, sample);
  const speedMps = segmentM / (gapMs / 1000);
  if (speedMps > MAX_PLAUSIBLE_SPEED_MPS) {
    // Saut GPS (dérive) : segment ignoré, on ré-ancre sur le nouveau fix.
    return {
      state: { ...state, signal: quality, lastAccepted: sample, window: [] },
      deltaDistanceM: 0,
    };
  }

  const window = [
    ...state.window.filter((p) => sample.timestampMs - p.endMs <= PACE_WINDOW_MS),
    { startMs: last.timestampMs, endMs: sample.timestampMs, distanceM: segmentM },
  ];
  const pace = windowPace(window, sample.timestampMs);
  return {
    state: {
      ...state,
      signal: quality,
      lastAccepted: sample,
      totalDistanceM: state.totalDistanceM + segmentM,
      window,
      smoothedPaceSecPerKm: pace ?? state.smoothedPaceSecPerKm,
    },
    deltaDistanceM: segmentM,
  };
}

/**
 * À appeler périodiquement : sans fix accepté depuis
 * `SIGNAL_LOST_AFTER_MS`, le signal passe `lost` (allure figée, badge UI).
 */
export function markGpsStale(state: GpsTrackState, nowMs: number): GpsTrackState {
  if (state.lastAccepted === undefined) {
    return state.signal === 'acquiring' ? state : { ...state, signal: 'acquiring' };
  }
  if (nowMs - state.lastAccepted.timestampMs > SIGNAL_LOST_AFTER_MS && state.signal !== 'lost') {
    return { ...state, signal: 'lost' };
  }
  return state;
}
