import type { AlertProposedAction, AlertTriggerContext, AlertType } from '@/schemas';

import { ACWR_ZONES } from './load';
import type { LoadState } from './load';

/**
 * Moteur d'alertes de charge (E7-4, spec §7.6) — fonctions pures.
 * Sortie = codes typés + contexte chiffré, JAMAIS de texte : l'UI traduit
 * via `src/i18n` (filtre wording `note-reglementaire-dm.md`).
 * Posture : aide à la décision — l'app avertit, n'interdit jamais ; chaque
 * alerte propose une action 1 tap + « Garder mon plan » (UI).
 * Le moteur ne lit jamais l'horloge : `now` est un paramètre.
 */

/** Throttling : jamais plus d'1 alerte charge par 48 h (spec §7.6). */
export const ALERT_THROTTLE_HOURS = 48;

/** Sous-charge prolongée : déclenche au-delà de 2 semaines (spec §7.6). */
export const UNDERLOAD_MIN_DAYS = 14;

/** RPE « élevé » : ≥ 8, sur 2 séances consécutives (spec §7.6). */
export const HIGH_RPE_MIN = 8;
export const HIGH_RPE_STREAK = 2;

/** Candidat d'alerte : codes + valeurs — l'UI traduit et trace la décision. */
export type LoadAlertCandidate = {
  alertType: AlertType;
  triggerContext: AlertTriggerContext;
  proposedAction: AlertProposedAction;
};

/** Heures écoulées entre deux instants ISO 8601 (datetime avec offset). */
function hoursBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (Number.isNaN(from) || Number.isNaN(to)) {
    throw new RangeError(`datetime ISO invalide : ${fromIso} → ${toIso}`);
  }
  return (to - from) / 3_600_000;
}

/**
 * Détecte 2 séances consécutives ressenties à RPE ≥ 8 (ordre chronologique,
 * les plus récentes en fin de tableau). Séances sans RPE : ignorées — seules
 * les dernières séances *notées* comptent comme « consécutives ».
 */
export function hasConsecutiveHighRpe(recentRpes: number[]): boolean {
  if (recentRpes.length < HIGH_RPE_STREAK) {
    return false;
  }
  return recentRpes.slice(-HIGH_RPE_STREAK).every((rpe) => rpe >= HIGH_RPE_MIN);
}

/**
 * Évalue les déclencheurs d'alerte de charge et retourne au plus UN candidat
 * (priorité : pic > RPE élevés > sous-charge), ou `undefined` si :
 * - la jauge est en calibration (alertes désactivées, spec §7.6) ;
 * - une alerte charge a déjà été émise il y a moins de 48 h (throttling) ;
 * - aucun déclencheur n'est actif.
 */
export function evaluateLoadAlerts(params: {
  /** État de charge du jour (calculé par `computeLoadState`). */
  state: LoadState;
  /** RPE des dernières séances notées, ordre chronologique. */
  recentRpes: number[];
  /** Jours consécutifs en sous-charge (`consecutiveUnderloadDays`). */
  underloadDays: number;
  /** Séance planifiée candidate à la substitution/allègement (id), si connue. */
  nextIntenseSessionRef?: string;
  /** Datetime ISO de la dernière alerte charge émise (throttling). */
  lastLoadAlertAt?: string;
  /** Instant courant, ISO datetime — le moteur ne lit jamais l'horloge. */
  now: string;
}): LoadAlertCandidate | undefined {
  const { state, recentRpes, underloadDays, nextIntenseSessionRef, lastLoadAlertAt, now } = params;

  // Alertes désactivées en calibration (spec §7.6).
  if (state.status === 'calibration') {
    return undefined;
  }

  // Throttling : max 1 alerte charge / 48 h.
  if (lastLoadAlertAt !== undefined && hoursBetween(lastLoadAlertAt, now) < ALERT_THROTTLE_HOURS) {
    return undefined;
  }

  // 1. Pic de charge (> 1,3) → substitution de séance (référence à alléger).
  if (state.status === 'pic' && state.acwr !== undefined) {
    return {
      alertType: 'pic_charge',
      triggerContext: {
        acwr: state.acwr,
        loadIncreasePct: Math.round((state.acwr - 1) * 100),
      },
      proposedAction: { kind: 'substitution_seance', sessionRef: nextIntenseSessionRef },
    };
  }

  // 2. RPE ≥ 8 sur 2 séances consécutives → proposition d'allègement.
  if (hasConsecutiveHighRpe(recentRpes)) {
    return {
      alertType: 'rpe_eleve',
      triggerContext: { lastRpes: recentRpes.slice(-HIGH_RPE_STREAK) },
      proposedAction: { kind: 'allegement_seance', sessionRef: nextIntenseSessionRef },
    };
  }

  // 3. Sous-charge prolongée (> 2 semaines) → encouragement à la régularité.
  if (state.status === 'sous_charge' && underloadDays > UNDERLOAD_MIN_DAYS) {
    return {
      alertType: 'sous_charge',
      triggerContext: { acwr: state.acwr, underloadDays },
      proposedAction: { kind: 'ajout_seance_facile' },
    };
  }

  return undefined;
}

/** Garde de cohérence : la borne de pic vient bien des zones de la jauge. */
export const PEAK_ALERT_THRESHOLD = ACWR_ZONES.peakMin;
