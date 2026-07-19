import { create } from 'zustand';

import { dayOfWeek } from '@/lib/dates';
import { randomUuid } from '@/lib/uid';
import type { Goal, PlannedSession, SessionBlock, SessionType, TrainingPlan } from '@/schemas';
import { goalSchema } from '@/schemas';
import type {
  LoadState,
  PlanAlternative,
  PlanGenerationResult,
  PlanSessionRef,
  SessionMoveWarning,
  WeekTemplateEntry,
} from '@/training-engine';
import {
  addSessionToPlan,
  buildSession,
  forecastForSessions,
  generatePlan,
  instantiateWeekTemplate,
  isQualitySession,
  lighteningSuggested,
  mondayOf,
  movePlannedSession,
  moveSessionWarnings,
  upcomingPlannedLoads,
} from '@/training-engine';

import { useJournalStore } from '../journal/journal-store';
import { journalDailyLoads, useLoadStore } from '../load/load-store';
import { useOnboardingStore } from '../onboarding/onboarding-store';
import { usePhysioStore } from '../profile/physio-store';

/**
 * Store du plan (E8) : plan généré OU semaine type manuelle (D5), objectif
 * éditable depuis l'onglet Plan (E8-7), déplacement/ajout de séances
 * (E8-3, E8-4). Toute la logique métier vit dans `src/training-engine`
 * (fonctions pures) — ici : orchestration d'état. Persistance locale/
 * Supabase : Lots 6–7 sync — état en mémoire, comme les autres stores.
 *
 * Bascule plan généré ↔ semaine type SANS perte de données (E8-7) : la
 * semaine type et les séances matérialisées survivent à la création d'un
 * objectif ; supprimer l'objectif archive le plan (jamais effacé) et
 * réactive la semaine type telle quelle.
 */

export type GoalEditResult =
  | { status: 'invalid' }
  | { status: 'plan' }
  | { status: 'unrealistic'; alternatives: PlanAlternative[] }
  | { status: 'refused'; reason: 'too_few_sessions' | 'race_date_not_ahead' };

export type MovePreview = {
  warnings: SessionMoveWarning[];
  /** Projection J+7 si la semaine reste telle quelle. */
  forecastBefore: LoadState;
  /** Projection J+7 après le déplacement envisagé. */
  forecastAfter: LoadState;
};

/** Impact jauge prévisionnelle d'un ajout envisagé (E4-3, spec §7.3). */
export type AddPreview = Pick<MovePreview, 'forecastBefore' | 'forecastAfter'>;

type PlanStoreState = {
  hydrated: boolean;
  goal?: Goal;
  plan?: TrainingPlan;
  /** Semaine type manuelle (E8-6) — préservée à travers les bascules. */
  weekTemplate: WeekTemplateEntry[];
  /** Séances matérialisées du mode semaine type (statuts conservés). */
  manualSessions: PlannedSession[];
  /** Lundis déjà matérialisés (pas de double instanciation). */
  materializedWeeks: string[];
  /** Plans archivés (superseded/abandoned) — jamais supprimés (E8-7). */
  archivedPlans: TrainingPlan[];
  /** Objectif refusé/irréaliste en attente (support des alternatives). */
  pendingGoal?: Goal;

  /** Reprend objectif + plan générés à l'onboarding (une seule fois). */
  hydrateFromOnboarding: (today?: string) => void;
  /** Matérialise la semaine courante depuis la semaine type (mode manuel). */
  ensureCurrentWeek: (today?: string) => void;
  /** Aperçu d'un déplacement : avertissements + impact jauge (E8-3). */
  previewMove: (sessionId: string, newDate: string, today?: string) => MovePreview | undefined;
  /** Déplace la séance — toujours permis, jamais bloqué (spec §7.9). */
  moveSession: (sessionId: string, newDate: string, today?: string) => void;
  /** Aperçu de l'impact jauge d'un ajout envisagé, avant confirmation (E4-3). */
  previewAdd: (params: {
    sessionType: SessionType;
    blocks: SessionBlock[];
    date: string;
    today?: string;
  }) => AddPreview;
  /**
   * Ajoute une séance spontanée ; suggestion d'allègement SEULEMENT si
   * sortie de zone (E8-4). Sans `blocks`, la structure vient des templates
   * du moteur ; avec `blocks`, la séance vient de la bibliothèque ou du
   * builder (E4-3) et entre dans la charge comme les autres.
   */
  addSpontaneousSession: (params: {
    sessionType: SessionType;
    date: string;
    blocks?: SessionBlock[];
    today?: string;
  }) => { lightening: boolean };
  /** Ajoute une entrée à la semaine type (E8-6) et la matérialise si à venir. */
  addTemplateEntry: (entry: WeekTemplateEntry, today?: string) => void;
  /** Retire une entrée de la semaine type + sa séance à venir non réalisée. */
  removeTemplateEntry: (index: number, today?: string) => void;
  /** Crée ou remplace l'objectif → plan généré (E8-7). */
  createOrUpdateGoal: (submission: { goal: unknown; today?: string }) => GoalEditResult;
  /** Applique une alternative du moteur au dernier objectif refusé. */
  applyGoalAlternative: (alternative: PlanAlternative, today?: string) => GoalEditResult;
  /** Supprime l'objectif : plan archivé, retour semaine type (E8-7). */
  deleteGoal: (today?: string) => void;
  /** Pousse les charges planifiées vers la jauge prévisionnelle (E7-3). */
  syncPlannedLoads: (today?: string) => void;
  reset: () => void;
};

/** Date locale ISO `YYYY-MM-DD` (les stores peuvent lire l'horloge, pas le moteur). */
function localIsoDate(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Assigne un id à chaque séance qui n'en a pas (référence UI stable). */
function withSessionIds(plan: TrainingPlan): TrainingPlan {
  return {
    ...plan,
    weeks: plan.weeks.map((week) => ({
      ...week,
      sessions: week.sessions.map((s) => (s.id === undefined ? { ...s, id: randomUuid() } : s)),
    })),
  };
}

/** Toutes les séances « visibles » du mode courant (plan sinon semaine type). */
export function selectActiveSessions(
  state: Pick<PlanStoreState, 'plan' | 'manualSessions'>,
): PlannedSession[] {
  if (state.plan !== undefined) {
    return state.plan.weeks.flatMap((week) => week.sessions);
  }
  return state.manualSessions;
}

function findPlanRef(plan: TrainingPlan, sessionId: string): PlanSessionRef | undefined {
  for (let weekIndex = 0; weekIndex < plan.weeks.length; weekIndex += 1) {
    const sessionIndex = plan.weeks[weekIndex]!.sessions.findIndex((s) => s.id === sessionId);
    if (sessionIndex >= 0) {
      return { weekIndex, sessionIndex };
    }
  }
  return undefined;
}

/** Prochaine séance intense à venir (cible de substitution des alertes). */
function nextIntenseSessionId(sessions: PlannedSession[], today: string): string | undefined {
  return sessions
    .filter(
      (s) =>
        (s.status === 'planned' || s.status === 'moved') &&
        s.scheduledDate >= today &&
        isQualitySession(s),
    )
    .sort((a, b) => (a.scheduledDate < b.scheduledDate ? -1 : 1))[0]?.id;
}

function engineInput(goal: Goal, today: string) {
  // Contexte d'entraînement + prudence : saisis à l'onboarding (E1), VMA au profil.
  const onboarding = useOnboardingStore.getState();
  const vmaKmh = usePhysioStore.getState().profile.vmaKmh?.value;
  return {
    today,
    goal,
    context: {
      sessionsPerWeek: onboarding.context.sessionsPerWeek,
      preferredDays: onboarding.context.preferredDays,
      currentWeeklyVolumeKm: onboarding.context.weeklyVolumeKm,
      injuryWithin12Months: onboarding.profile.hasRecentInjury,
    },
    physio: { vmaKmh },
  };
}

function toGoalEditResult(result: PlanGenerationResult): GoalEditResult {
  switch (result.outcome) {
    case 'plan':
      return { status: 'plan' };
    case 'unrealistic':
      return { status: 'unrealistic', alternatives: result.alternatives };
    case 'refused':
      return { status: 'refused', reason: result.reason };
  }
}

const initialState = {
  hydrated: false,
  goal: undefined,
  plan: undefined,
  weekTemplate: [] as WeekTemplateEntry[],
  manualSessions: [] as PlannedSession[],
  materializedWeeks: [] as string[],
  archivedPlans: [] as TrainingPlan[],
  pendingGoal: undefined,
};

export const usePlanStore = create<PlanStoreState>()((set, get) => ({
  ...initialState,

  hydrateFromOnboarding: (today = localIsoDate()) => {
    if (get().hydrated) {
      return;
    }
    const onboarding = useOnboardingStore.getState();
    set({
      hydrated: true,
      goal: onboarding.goal,
      plan: onboarding.plan !== undefined ? withSessionIds(onboarding.plan) : undefined,
    });
    get().ensureCurrentWeek(today);
    get().syncPlannedLoads(today);
  },

  ensureCurrentWeek: (today = localIsoDate()) => {
    const state = get();
    if (state.plan !== undefined) {
      return;
    }
    const monday = mondayOf(today);
    if (state.materializedWeeks.includes(monday)) {
      return;
    }
    const vmaKmh = usePhysioStore.getState().profile.vmaKmh?.value;
    // On ne crée pas rétroactivement des séances « manquées » : seuls les
    // jours restants de la semaine courante sont matérialisés.
    const sessions = instantiateWeekTemplate(state.weekTemplate, monday, {
      vmaKmh,
      fromDay: dayOfWeek(today),
    }).map((s) => ({ ...s, id: randomUuid() }));
    set({
      manualSessions: [...state.manualSessions, ...sessions],
      materializedWeeks: [...state.materializedWeeks, monday],
    });
    get().syncPlannedLoads(today);
  },

  previewMove: (sessionId, newDate, today = localIsoDate()) => {
    const state = get();
    const sessions = selectActiveSessions(state);
    const session = sessions.find((s) => s.id === sessionId);
    if (session === undefined) {
      return undefined;
    }
    const others = sessions.filter((s) => s.id !== sessionId);
    const entries = useJournalStore.getState().entries;
    const fcmaxBpm = usePhysioStore.getState().profile.fcmaxBpm?.value;
    const vmaKmh = usePhysioStore.getState().profile.vmaKmh?.value;
    const dailyLoads = journalDailyLoads(entries, fcmaxBpm);
    const forecastBefore = forecastForSessions({ dailyLoads, today, sessions, vmaKmh });
    const forecastAfter = forecastForSessions({
      dailyLoads,
      today,
      sessions: [...others, { ...session, scheduledDate: newDate }],
      vmaKmh,
    });
    return {
      warnings: moveSessionWarnings({ session, newDate, otherSessions: others }),
      forecastBefore,
      forecastAfter,
    };
  },

  moveSession: (sessionId, newDate, today = localIsoDate()) => {
    const state = get();
    if (state.plan !== undefined) {
      const ref = findPlanRef(state.plan, sessionId);
      if (ref === undefined) {
        return;
      }
      set({ plan: movePlannedSession(state.plan, ref, newDate) });
    } else {
      set({
        manualSessions: state.manualSessions.map((s) =>
          s.id === sessionId && s.scheduledDate !== newDate
            ? { ...s, scheduledDate: newDate, status: 'moved' }
            : s,
        ),
      });
    }
    get().syncPlannedLoads(today);
  },

  previewAdd: ({ sessionType, blocks, date, today = localIsoDate() }) => {
    const sessions = selectActiveSessions(get());
    const entries = useJournalStore.getState().entries;
    const fcmaxBpm = usePhysioStore.getState().profile.fcmaxBpm?.value;
    const vmaKmh = usePhysioStore.getState().profile.vmaKmh?.value;
    const dailyLoads = journalDailyLoads(entries, fcmaxBpm);
    const added: PlannedSession = { scheduledDate: date, sessionType, blocks, status: 'planned' };
    return {
      forecastBefore: forecastForSessions({ dailyLoads, today, sessions, vmaKmh }),
      forecastAfter: forecastForSessions({
        dailyLoads,
        today,
        sessions: [...sessions, added],
        vmaKmh,
      }),
    };
  },

  addSpontaneousSession: ({ sessionType, date, blocks, today = localIsoDate() }) => {
    const vmaKmh = usePhysioStore.getState().profile.vmaKmh?.value;
    const spec =
      blocks !== undefined
        ? { sessionType, blocks }
        : sessionType === 'fartlek'
          ? // Fartlek sans structure = course libre (durée par défaut en charge).
            { sessionType, blocks: [] as SessionBlock[] }
          : buildSession({ type: sessionType, vmaKmh });
    const session: PlannedSession = {
      id: randomUuid(),
      scheduledDate: date,
      sessionType: spec.sessionType,
      blocks: spec.blocks,
      status: 'planned',
    };
    const state = get();
    if (state.plan !== undefined) {
      set({ plan: addSessionToPlan(state.plan, session) });
    } else {
      set({
        manualSessions: [...state.manualSessions, session].sort((a, b) =>
          a.scheduledDate < b.scheduledDate ? -1 : 1,
        ),
      });
    }
    get().syncPlannedLoads(today);

    // Règle d'équilibre (spec §7.9) : suggestion SEULEMENT si la charge
    // projetée sort de la zone favorable — sinon l'app se tait.
    const entries = useJournalStore.getState().entries;
    const fcmaxBpm = usePhysioStore.getState().profile.fcmaxBpm?.value;
    const projected = forecastForSessions({
      dailyLoads: journalDailyLoads(entries, fcmaxBpm),
      today,
      sessions: selectActiveSessions(get()),
      vmaKmh,
    });
    return { lightening: lighteningSuggested(projected) };
  },

  addTemplateEntry: (entry, today = localIsoDate()) => {
    const state = get();
    set({ weekTemplate: [...state.weekTemplate, entry].sort((a, b) => a.day - b.day) });
    if (state.plan === undefined && entry.day >= dayOfWeek(today)) {
      // La semaine courante reflète immédiatement la semaine type.
      const vmaKmh = usePhysioStore.getState().profile.vmaKmh?.value;
      const sessions = instantiateWeekTemplate([entry], mondayOf(today), { vmaKmh }).map((s) => ({
        ...s,
        id: randomUuid(),
      }));
      set({ manualSessions: [...get().manualSessions, ...sessions] });
    }
    get().syncPlannedLoads(today);
  },

  removeTemplateEntry: (index, today = localIsoDate()) => {
    const state = get();
    const entry = state.weekTemplate[index];
    if (entry === undefined) {
      return;
    }
    const weekTemplate = state.weekTemplate.filter((_, i) => i !== index);
    let manualSessions = state.manualSessions;
    if (state.plan === undefined) {
      // Retire la séance à venir correspondante (jamais une séance réalisée).
      const target = manualSessions.find(
        (s) =>
          s.status === 'planned' &&
          s.scheduledDate >= today &&
          s.sessionType === entry.sessionType &&
          dayOfWeek(s.scheduledDate) === entry.day,
      );
      if (target !== undefined) {
        manualSessions = manualSessions.filter((s) => s !== target);
      }
    }
    set({ weekTemplate, manualSessions });
    get().syncPlannedLoads(today);
  },

  createOrUpdateGoal: ({ goal, today = localIsoDate() }) => {
    const parsed = goalSchema.safeParse(goal);
    if (!parsed.success) {
      return { status: 'invalid' };
    }
    const result = generatePlan(engineInput(parsed.data, today));
    if (result.outcome !== 'plan') {
      // Rien n'est perdu : l'état courant (plan OU semaine type) reste actif.
      set({ pendingGoal: parsed.data });
      return toGoalEditResult(result);
    }
    const state = get();
    const archived =
      state.plan !== undefined
        ? [...state.archivedPlans, { ...state.plan, status: 'superseded' as const }]
        : state.archivedPlans;
    set({
      goal: { ...parsed.data, id: parsed.data.id ?? randomUuid() },
      plan: withSessionIds(result.plan),
      archivedPlans: archived,
      pendingGoal: undefined,
    });
    get().syncPlannedLoads(today);
    return { status: 'plan' };
  },

  applyGoalAlternative: (alternative, today = localIsoDate()) => {
    const base = get().pendingGoal ?? get().goal;
    if (base === undefined) {
      return { status: 'invalid' };
    }
    let nextGoal: Goal;
    switch (alternative.type) {
      case 'finish_ambition':
        nextGoal = { ...base, ambition: 'finir', targetTimeS: undefined };
        break;
      case 'later_date':
        nextGoal = { ...base, raceDate: alternative.suggestedRaceDate };
        break;
      case 'other_goal':
        nextGoal = { ...base, raceDistance: alternative.raceDistance };
        break;
    }
    return get().createOrUpdateGoal({ goal: nextGoal, today });
  },

  deleteGoal: (today = localIsoDate()) => {
    const state = get();
    // Sans perte de données (E8-7) : le plan est archivé, jamais effacé ;
    // la semaine type et les séances matérialisées reprennent telles quelles.
    set({
      goal: undefined,
      plan: undefined,
      pendingGoal: undefined,
      archivedPlans:
        state.plan !== undefined
          ? [...state.archivedPlans, { ...state.plan, status: 'abandoned' as const }]
          : state.archivedPlans,
    });
    get().ensureCurrentWeek(today);
    get().syncPlannedLoads(today);
  },

  syncPlannedLoads: (today = localIsoDate()) => {
    const sessions = selectActiveSessions(get());
    const vmaKmh = usePhysioStore.getState().profile.vmaKmh?.value;
    useLoadStore
      .getState()
      .setPlannedLoads(
        upcomingPlannedLoads(sessions, today, vmaKmh),
        nextIntenseSessionId(sessions, today),
      );
  },

  reset: () => set({ ...initialState }),
}));
