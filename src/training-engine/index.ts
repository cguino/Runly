/**
 * `src/training-engine` — logique métier en fonctions pures
 * (règle transverse n°5) : plan, VMA, allures, ACWR, alertes.
 * Contrainte de frontière : zéro import React/Expo ici — uniquement
 * du TypeScript pur, testable unitairement (golden files au Lot 3).
 */

export {
  ACWR_ZONES,
  buildDailyLoads,
  CALIBRATION_MIN_DAYS,
  computeLoadState,
  consecutiveUnderloadDays,
  DEFAULT_EFFORT_FACTOR,
  FORECAST_HORIZON_DAYS,
  forecastLoadState,
  LOAD_WINDOWS,
  sessionLoadAmorcage,
  sessionLoadSrpe,
  workoutLoad,
  ZONE_EFFORT_FACTORS,
  zoneFromPctFcmax,
} from './load';
export type { DailyLoad, GaugeStatus, LoadMethod, LoadState } from './load';

export {
  ALERT_THROTTLE_HOURS,
  evaluateLoadAlerts,
  hasConsecutiveHighRpe,
  HIGH_RPE_MIN,
  HIGH_RPE_STREAK,
  PEAK_ALERT_THRESHOLD,
  UNDERLOAD_MIN_DAYS,
} from './alerts';
export type { LoadAlertCandidate } from './alerts';

export {
  averageWeeklyVolumeKm,
  CALIBRATION_MIN_WEEKS,
  isCalibrating,
  VOLUME_WINDOW_WEEKS,
  weeksOfHistory,
} from './history';
export {
  DEFAULT_START_VOLUME_KM,
  generatePlan,
  MIN_PLAN_WEEKS,
  PEAK_VOLUME_KM,
  placeWeekSessions,
  RECOVERY_EVERY,
  RECOVERY_FACTOR,
  TAPER_WEEKS,
  WEEKLY_GROWTH,
} from './plan';
export {
  handleMissedSession,
  isKeySession,
  regenerateRemainingPlan,
  REPERIODIZATION_GAP_DAYS,
  shouldProposeReperiodization,
} from './plan-adjust';
export {
  addSessionToPlan,
  buildWeekOverview,
  DEFAULT_SESSION_DURATION_MIN,
  estimateBlocksDurationS,
  estimatePlannedSessionLoad,
  EXPECTED_SESSION_RPE,
  forecastForSessions,
  instantiateWeekTemplate,
  isQualitySession,
  lighteningSuggested,
  mondayOf,
  movePlannedSession,
  moveSessionWarnings,
  sessionDisplayStatus,
  upcomingPlannedLoads,
  weekRealizedSummary,
} from './plan-flex';
export type {
  PlanSessionRef,
  SessionDisplayStatus,
  SessionMoveWarning,
  TemplateSessionType,
  WeekDayOverview,
  WeekRealizedSummary,
  WeekTemplateEntry,
} from './plan-flex';
export type {
  MissedSessionOutcome,
  PlanAlternative,
  PlanContext,
  PlanGenerationResult,
  PlanInput,
  PlanPhysio,
  PlanRecommendation,
  UnrealisticReason,
} from './plan-types';
export { buildSession, estimateBlocksKm, INTENSITY_PCT_VMA } from './session-templates';
export {
  estimateFcmax,
  estimateThresholds,
  estimateVmaFromHistory,
  HR_ZONES_PCT,
  hrZoneBpm,
  paceFromVma,
  proposeVmaRecalc,
  RACE_INTENSITY,
  raceTargetPace,
  RECALC_THRESHOLD_PCT,
  sustainableVmaFraction,
  THRESHOLD_DEFAULTS_PCT_VMA,
  VMA_EFFORT_WINDOW_S,
} from './physio';
