import * as Location from 'expo-location';

import type { GpsSample, GpsSignal, GpsTrackState } from './gps-core';
import { createGpsTrackState, ingestGpsSample, markGpsStale, SIGNAL_LOST_AFTER_MS } from './gps-core';

/**
 * Tracking GPS du player (E5-2) : expo-location **en foreground uniquement**
 * (pas de `ACCESS_BACKGROUND_LOCATION` — plan §Lot 6). L'app reste au
 * premier plan pendant la séance (écran actif, expo-keep-awake) ; l'audio
 * verrouillé passe par le canal audio, pas par la localisation.
 *
 * Toute la logique (filtrage, lissage, distance) vit dans `gps-core.ts`
 * (pur, testé sur traces rejouées) — ce fichier n'est que le branchement.
 */

export type TrackerSnapshot = {
  signal: GpsSignal;
  /** Allure lissée (s/km), figée en perte de signal. */
  smoothedPaceSecPerKm?: number;
  totalDistanceM: number;
  /** Distance validée depuis le dernier snapshot (m). */
  deltaDistanceM: number;
};

export type LocationTracker = {
  /** Permission « pendant l'utilisation » (l'écran d'explication vient avant, jamais de prompt à froid). */
  requestPermission: () => Promise<boolean>;
  /** Démarre le suivi ; les snapshots arrivent à chaque fix ou perte de signal. */
  start: (onSnapshot: (snapshot: TrackerSnapshot) => void) => Promise<boolean>;
  stop: () => void;
};

function toSnapshot(state: GpsTrackState, deltaDistanceM: number): TrackerSnapshot {
  return {
    signal: state.signal,
    smoothedPaceSecPerKm: state.smoothedPaceSecPerKm,
    totalDistanceM: state.totalDistanceM,
    deltaDistanceM,
  };
}

/** Implémentation expo-location (foreground). */
export function createLocationTracker(): LocationTracker {
  let subscription: Location.LocationSubscription | undefined;
  let staleTimer: ReturnType<typeof setInterval> | undefined;
  let state = createGpsTrackState();

  const stop = (): void => {
    subscription?.remove();
    subscription = undefined;
    if (staleTimer !== undefined) {
      clearInterval(staleTimer);
      staleTimer = undefined;
    }
  };

  return {
    requestPermission: async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    },

    start: async (onSnapshot) => {
      stop();
      state = createGpsTrackState();
      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 2,
          },
          (position) => {
            const sample: GpsSample = {
              latitudeDeg: position.coords.latitude,
              longitudeDeg: position.coords.longitude,
              timestampMs: position.timestamp,
              accuracyM: position.coords.accuracy ?? undefined,
            };
            const result = ingestGpsSample(state, sample);
            state = result.state;
            onSnapshot(toSnapshot(state, result.deltaDistanceM));
          },
        );
      } catch {
        return false;
      }
      // Détection de perte de signal (aucun fix accepté depuis 10 s).
      staleTimer = setInterval(() => {
        const next = markGpsStale(state, Date.now());
        if (next !== state) {
          state = next;
          onSnapshot(toSnapshot(state, 0));
        }
      }, SIGNAL_LOST_AFTER_MS / 2);
      return true;
    },

    stop,
  };
}

/** Tracker factice (tests, mode carte) : jamais de fix, signal en acquisition. */
export function createNoopLocationTracker(): LocationTracker {
  return {
    requestPermission: () => Promise.resolve(true),
    start: () => Promise.resolve(true),
    stop: () => undefined,
  };
}
