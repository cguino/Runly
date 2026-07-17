export {
  createGpsTrackState,
  haversineM,
  ingestGpsSample,
  markGpsStale,
  MAX_ACCEPTED_ACCURACY_M,
  MAX_PLAUSIBLE_SPEED_MPS,
  MIN_PACE_SPEED_MPS,
  PACE_WINDOW_MS,
  SIGNAL_LOST_AFTER_MS,
  WEAK_ACCURACY_M,
} from './gps-core';
export type { GpsIngestResult, GpsSample, GpsSignal, GpsTrackState } from './gps-core';
export { createLocationTracker, createNoopLocationTracker } from './location-tracker';
export type { LocationTracker, TrackerSnapshot } from './location-tracker';
