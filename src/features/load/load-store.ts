import { create } from 'zustand';

import type { Alert, AlertDecision } from '@/schemas';
import { alertSchema } from '@/schemas';
import {
  buildDailyLoads,
  computeLoadState,
  consecutiveUnderloadDays,
  evaluateLoadAlerts,
  forecastLoadState,
  workoutLoad,
} from '@/training-engine';
import type { LoadState } from '@/training-engine';

import type { JournalEntry } from '../journal';
import { useJournalStore } from '../journal';
import { usePhysioStore } from '../profile';

/**
 * Store de charge (E7) : chronique, ACWR courant + prévisionnel, alerte
 * active et décisions tracées. Toute la logique métier vit dans
 * `src/training-engine` (fonctions pures) — ici : orchestration d'état,
 * branchée sur le journal (séances) et le profil physio (FCmax).
 * Persistance locale/Supabase (`load_metrics`, `alerts`) : Lots 6–7 sync —
 * état en mémoire pour l'instant, validé par zod aux frontières.
 */

/** Séance planifiée valorisée, fournie par le plan (Lot 8) pour l'ACWR prévisionnel. */
export type PlannedLoad = { scheduledDate: string; estimatedLoad: number };

type LoadStoreState = {
  /** État de charge du jour (undefined avant le premier refresh). */
  current?: LoadState;
  /** Projection à J+7 si plan suivi (E7-3) — dès que le Lot 8 fournit les séances. */
  forecast?: LoadState;
  /** Séances planifiées à venir avec charge estimée (renseigné par le Lot 8). */
  plannedLoads: PlannedLoad[];
  /** Prochaine séance intense du plan (id) — cible de substitution des alertes (Lot 8). */
  nextIntenseSessionRef?: string;
  /** Alerte en attente de décision (au plus une, spec §7.6). */
  activeAlert?: Alert;
  /** Décisions tracées (« l'utilisateur décide toujours »). */
  decidedAlerts: Alert[];
  /** Datetime ISO de la dernière alerte émise (throttling 48 h côté moteur). */
  lastLoadAlertAt?: string;
  /** Recalcule tout depuis le journal ; `at` injectable pour les tests. */
  refresh: (at?: { today?: string; now?: string }) => void;
  setPlannedLoads: (plannedLoads: PlannedLoad[], nextIntenseSessionRef?: string) => void;
  /** Trace la décision de l'utilisateur sur l'alerte active. */
  decideAlert: (decision: AlertDecision, decidedAt?: string) => void;
};

/** Date locale ISO `YYYY-MM-DD` (les stores peuvent lire l'horloge, pas le moteur). */
function localIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Valorise une séance du journal en UA : sRPE si noté, sinon amorçage (D4). */
export function entryLoad(entry: JournalEntry, fcmaxBpm: number | undefined): number {
  if (entry.feedback === undefined && entry.workout.load !== undefined) {
    // Charge déjà valorisée à l'ingestion (E6) : on la respecte.
    return entry.workout.load;
  }
  return workoutLoad(entry.workout, { rpe: entry.feedback?.rpe, fcmaxBpm }).load;
}

/** Chronique quotidienne du journal — partagée avec le plan (aperçu d'impact, Lot 8). */
export function journalDailyLoads(
  entries: JournalEntry[],
  fcmaxBpm: number | undefined,
): ReturnType<typeof buildDailyLoads> {
  return buildDailyLoads(
    entries.map((entry) => ({
      startedAt: entry.workout.startedAt,
      load: entryLoad(entry, fcmaxBpm),
    })),
  );
}

export const useLoadStore = create<LoadStoreState>()((set, get) => ({
  current: undefined,
  forecast: undefined,
  plannedLoads: [],
  activeAlert: undefined,
  decidedAlerts: [],
  lastLoadAlertAt: undefined,

  refresh: (at) => {
    const now = at?.now ?? new Date().toISOString();
    const today = at?.today ?? localIsoDate(new Date());

    const entries = useJournalStore.getState().entries;
    const fcmaxBpm = usePhysioStore.getState().profile.fcmaxBpm?.value;

    const dailyLoads = journalDailyLoads(entries, fcmaxBpm);

    const current = computeLoadState({ dailyLoads, today });
    const { plannedLoads } = get();
    const forecast =
      plannedLoads.length > 0
        ? forecastLoadState({ dailyLoads, today, plannedSessions: plannedLoads })
        : undefined;

    // Une alerte à la fois : on n'en évalue pas de nouvelle tant que
    // l'utilisateur n'a pas décidé (spec §7.6 — action 1 tap + garder mon plan).
    if (get().activeAlert !== undefined) {
      set({ current, forecast });
      return;
    }

    const recentRpes = [...entries]
      .sort((a, b) => (a.workout.startedAt < b.workout.startedAt ? -1 : 1))
      .flatMap((entry) => (entry.feedback === undefined ? [] : [entry.feedback.rpe]));

    const candidate = evaluateLoadAlerts({
      state: current,
      recentRpes,
      underloadDays: consecutiveUnderloadDays({ dailyLoads, today }),
      nextIntenseSessionRef: get().nextIntenseSessionRef,
      lastLoadAlertAt: get().lastLoadAlertAt,
      now,
    });

    if (candidate === undefined) {
      set({ current, forecast });
      return;
    }
    const alert = alertSchema.parse({ ...candidate, createdAt: now });
    set({ current, forecast, activeAlert: alert, lastLoadAlertAt: now });
  },

  setPlannedLoads: (plannedLoads, nextIntenseSessionRef) => {
    set({ plannedLoads, nextIntenseSessionRef });
    get().refresh();
  },

  decideAlert: (decision, decidedAt = new Date().toISOString()) => {
    const { activeAlert, decidedAlerts } = get();
    if (activeAlert === undefined) {
      return;
    }
    // TODO(Lot 8) : `accepted` appliquera l'action proposée au plan
    // (substitution/allègement en 1 tap). Ici : décision tracée (spec §9).
    const decided = alertSchema.parse({ ...activeAlert, userDecision: decision, decidedAt });
    set({ activeAlert: undefined, decidedAlerts: [...decidedAlerts, decided] });
  },
}));
