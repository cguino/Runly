import { z } from 'zod';

import type { SessionBlock, SessionStep, SessionType } from '@/schemas';
import { sessionBlocksSchema, sessionTypeSchema } from '@/schemas';

/**
 * Machine à états de séance (E5-1) — fonctions pures, zéro import React/Expo.
 *
 * Principes :
 * - la séance (`SessionBlock[]`) est aplatie en une liste linéaire de steps
 *   jouables (`FlatStep[]`), séries et récupérations déroulées ;
 * - chaque événement (`start`, `tick`, `distance`, `pause`, `resume`, `skip`,
 *   `abandon`) est un réducteur pur `(état, nowMs) → { état, transitions }` ;
 * - le temps écoulé dérive **exclusivement des horodatages** fournis par
 *   l'appelant (`nowMs`), jamais d'un comptage de ticks : la dérive du timer
 *   est bornée par l'horloge système (< 1 s/h, critère spec §7.4) ;
 * - l'état est intégralement sérialisable (JSON) et re-validé par zod au
 *   restore : la persistance expo-sqlite à chaque transition (crash-safe,
 *   ADR-009) vit dans `src/services/session-store`.
 */

/** Étape jouable après aplatissement des séries. */
export type FlatStep = {
  step: SessionStep;
  /** Position dans la série englobante la plus proche (1-based). */
  series?: { repetition: number; totalRepetitions: number };
  /** Récupération insérée entre deux répétitions d'une série. */
  isSeriesRecovery: boolean;
};

/** Déroule blocs et séries en liste linéaire de steps (récursif). */
export function flattenBlocks(blocks: SessionBlock[]): FlatStep[] {
  const result: FlatStep[] = [];
  const pushBlock = (
    block: SessionBlock,
    series: FlatStep['series'],
    isSeriesRecovery: boolean,
  ): void => {
    if (block.kind === 'step') {
      result.push({ step: block, series, isSeriesRecovery });
      return;
    }
    for (let repetition = 1; repetition <= block.repetitions; repetition += 1) {
      const info = { repetition, totalRepetitions: block.repetitions };
      for (const inner of block.blocks) {
        pushBlock(inner, info, false);
      }
      if (block.recovery !== undefined && repetition < block.repetitions) {
        result.push({ step: block.recovery, series: info, isSeriesRecovery: true });
      }
    }
  };
  for (const block of blocks) {
    pushBlock(block, undefined, false);
  }
  return result;
}

export const runnerPhaseSchema = z.enum(['ready', 'running', 'paused', 'completed', 'abandoned']);

export type RunnerPhase = z.infer<typeof runnerPhaseSchema>;

/** Bilan d'un step terminé (récap E5-5 : allure sur les blocs cibles). */
export const stepResultSchema = z.object({
  index: z.number().int().min(0),
  elapsedMs: z.number().nonnegative(),
  distanceM: z.number().nonnegative(),
  skipped: z.boolean(),
});

export type StepResult = z.infer<typeof stepResultSchema>;

export const sessionRunnerStateSchema = z.object({
  sessionId: z.string().min(1),
  sessionType: sessionTypeSchema.optional(),
  /** Séance planifiée d'origine (matching plan ↔ réalisé). */
  plannedSessionId: z.string().optional(),
  /** Titre affiché (player, Live Activity) — déjà localisé par l'appelant. */
  title: z.string().optional(),
  blocks: sessionBlocksSchema,
  phase: runnerPhaseSchema,
  stepIndex: z.number().int().min(0),
  stepElapsedMs: z.number().nonnegative(),
  stepDistanceM: z.number().nonnegative(),
  totalElapsedMs: z.number().nonnegative(),
  totalDistanceM: z.number().nonnegative(),
  startedAt: z.string().datetime({ offset: true }).optional(),
  endedAt: z.string().datetime({ offset: true }).optional(),
  /** Horodatage (epoch ms) du dernier événement intégré — base du temps écoulé. */
  lastEventAtMs: z.number().nonnegative().optional(),
  completedSteps: z.array(stepResultSchema),
});

export type SessionRunnerState = z.infer<typeof sessionRunnerStateSchema>;

export type RunnerTransition =
  | { type: 'session_started' }
  | { type: 'step_started'; stepIndex: number }
  | { type: 'step_completed'; stepIndex: number; skipped: boolean }
  | { type: 'session_completed' }
  | { type: 'session_paused' }
  | { type: 'session_resumed' }
  | { type: 'session_abandoned' };

export type RunnerUpdate = { state: SessionRunnerState; transitions: RunnerTransition[] };

export type CreateRunnerInput = {
  sessionId: string;
  blocks: SessionBlock[];
  sessionType?: SessionType;
  plannedSessionId?: string;
  title?: string;
};

/** État initial (`ready`) — la séance ne démarre qu'au `startRunner`. */
export function createRunner(input: CreateRunnerInput): SessionRunnerState {
  return {
    sessionId: input.sessionId,
    sessionType: input.sessionType,
    plannedSessionId: input.plannedSessionId,
    title: input.title,
    blocks: input.blocks,
    phase: 'ready',
    stepIndex: 0,
    stepElapsedMs: 0,
    stepDistanceM: 0,
    totalElapsedMs: 0,
    totalDistanceM: 0,
    completedSteps: [],
  };
}

function unchanged(state: SessionRunnerState): RunnerUpdate {
  return { state, transitions: [] };
}

/** Écoulement du temps depuis le dernier événement (jamais négatif). */
function elapsedSince(state: SessionRunnerState, nowMs: number): number {
  if (state.lastEventAtMs === undefined) {
    return 0;
  }
  return Math.max(0, nowMs - state.lastEventAtMs);
}

/** Extent d'un step en ms (steps en durée) ou undefined (steps en distance). */
export function stepDurationMs(step: SessionStep): number | undefined {
  return step.extent.type === 'duration' ? step.extent.seconds * 1000 : undefined;
}

/** Extent d'un step en mètres (steps en distance) ou undefined. */
export function stepDistanceTargetM(step: SessionStep): number | undefined {
  return step.extent.type === 'distance' ? step.extent.meters : undefined;
}

/**
 * Clôt le step courant et ouvre le suivant (ou termine la séance).
 * Les excédents temps/distance sont reportés sur le step suivant pour ne
 * pas perdre d'écoulement quand une frontière de bloc est franchie.
 */
function completeCurrentStep(
  state: SessionRunnerState,
  steps: FlatStep[],
  options: { skipped: boolean; carryMs: number; carryM: number; nowMs: number },
): RunnerUpdate {
  const flat = steps[state.stepIndex];
  const cappedElapsed =
    flat === undefined
      ? state.stepElapsedMs
      : Math.min(state.stepElapsedMs, stepDurationMs(flat.step) ?? state.stepElapsedMs);
  const cappedDistance =
    flat === undefined
      ? state.stepDistanceM
      : Math.min(state.stepDistanceM, stepDistanceTargetM(flat.step) ?? state.stepDistanceM);

  const completed: StepResult = {
    index: state.stepIndex,
    elapsedMs: options.skipped ? state.stepElapsedMs : cappedElapsed,
    distanceM: options.skipped ? state.stepDistanceM : cappedDistance,
    skipped: options.skipped,
  };
  const transitions: RunnerTransition[] = [
    { type: 'step_completed', stepIndex: state.stepIndex, skipped: options.skipped },
  ];

  const nextIndex = state.stepIndex + 1;
  if (nextIndex >= steps.length) {
    transitions.push({ type: 'session_completed' });
    return {
      state: {
        ...state,
        phase: 'completed',
        stepElapsedMs: 0,
        stepDistanceM: 0,
        completedSteps: [...state.completedSteps, completed],
        endedAt: new Date(options.nowMs).toISOString(),
      },
      transitions,
    };
  }

  transitions.push({ type: 'step_started', stepIndex: nextIndex });
  return {
    state: {
      ...state,
      stepIndex: nextIndex,
      stepElapsedMs: options.carryMs,
      stepDistanceM: options.carryM,
      completedSteps: [...state.completedSteps, completed],
    },
    transitions,
  };
}

/** Fait avancer les frontières de steps en durée tant qu'elles sont franchies. */
function settleDurationSteps(update: RunnerUpdate, steps: FlatStep[], nowMs: number): RunnerUpdate {
  let current = update;
  for (;;) {
    const { state } = current;
    if (state.phase !== 'running') {
      return current;
    }
    const flat = steps[state.stepIndex];
    if (flat === undefined) {
      return current;
    }
    const durationMs = stepDurationMs(flat.step);
    if (durationMs === undefined || state.stepElapsedMs < durationMs) {
      return current;
    }
    const next = completeCurrentStep(state, steps, {
      skipped: false,
      carryMs: state.stepElapsedMs - durationMs,
      carryM: 0,
      nowMs,
    });
    current = { state: next.state, transitions: [...current.transitions, ...next.transitions] };
  }
}

/** Fait avancer les frontières de steps en distance tant qu'elles sont franchies. */
function settleDistanceSteps(update: RunnerUpdate, steps: FlatStep[], nowMs: number): RunnerUpdate {
  let current = update;
  for (;;) {
    const { state } = current;
    if (state.phase !== 'running') {
      return current;
    }
    const flat = steps[state.stepIndex];
    if (flat === undefined) {
      return current;
    }
    const targetM = stepDistanceTargetM(flat.step);
    if (targetM === undefined || state.stepDistanceM < targetM) {
      return current;
    }
    const next = completeCurrentStep(state, steps, {
      skipped: false,
      carryMs: 0,
      carryM: state.stepDistanceM - targetM,
      nowMs,
    });
    current = { state: next.state, transitions: [...current.transitions, ...next.transitions] };
  }
}

/** Intègre le temps écoulé depuis le dernier événement (état `running` seul). */
function advanceClock(state: SessionRunnerState, nowMs: number): SessionRunnerState {
  if (state.phase !== 'running') {
    return state;
  }
  const delta = elapsedSince(state, nowMs);
  return {
    ...state,
    stepElapsedMs: state.stepElapsedMs + delta,
    totalElapsedMs: state.totalElapsedMs + delta,
    lastEventAtMs: nowMs,
  };
}

/** Démarre la séance (transition `ready → running`). */
export function startRunner(state: SessionRunnerState, nowMs: number): RunnerUpdate {
  if (state.phase !== 'ready') {
    return unchanged(state);
  }
  return {
    state: {
      ...state,
      phase: 'running',
      startedAt: new Date(nowMs).toISOString(),
      lastEventAtMs: nowMs,
    },
    transitions: [{ type: 'session_started' }, { type: 'step_started', stepIndex: 0 }],
  };
}

/**
 * Tick d'horloge : intègre le temps réel écoulé et franchit les frontières
 * de blocs en durée. La fréquence d'appel n'influe pas sur la précision.
 */
export function tickRunner(state: SessionRunnerState, nowMs: number): RunnerUpdate {
  if (state.phase !== 'running') {
    return unchanged(state);
  }
  const steps = flattenBlocks(state.blocks);
  return settleDurationSteps(unchanged(advanceClock(state, nowMs)), steps, nowMs);
}

/**
 * Distance GPS supplémentaire (mètres, déjà filtrée/lissée par le service
 * de tracking). Fait aussi avancer l'horloge, puis les steps en distance.
 * En perte de signal, le service n'émet simplement plus de delta : le timer
 * et la structure continuent (D13), la distance reprend au retour.
 */
export function addRunnerDistance(
  state: SessionRunnerState,
  deltaMeters: number,
  nowMs: number,
): RunnerUpdate {
  if (state.phase !== 'running' || deltaMeters < 0) {
    return unchanged(state);
  }
  const steps = flattenBlocks(state.blocks);
  const ticked = settleDurationSteps(unchanged(advanceClock(state, nowMs)), steps, nowMs);
  if (ticked.state.phase !== 'running') {
    return ticked;
  }
  const withDistance: RunnerUpdate = {
    state: {
      ...ticked.state,
      stepDistanceM: ticked.state.stepDistanceM + deltaMeters,
      totalDistanceM: ticked.state.totalDistanceM + deltaMeters,
    },
    transitions: ticked.transitions,
  };
  return settleDistanceSteps(withDistance, steps, nowMs);
}

/** Pause : fige l'écoulement (le temps en pause n'est jamais compté). */
export function pauseRunner(state: SessionRunnerState, nowMs: number): RunnerUpdate {
  if (state.phase !== 'running') {
    return unchanged(state);
  }
  const advanced = advanceClock(state, nowMs);
  return {
    state: { ...advanced, phase: 'paused' },
    transitions: [{ type: 'session_paused' }],
  };
}

/** Reprise après pause : ré-ancre l'horloge à `nowMs`. */
export function resumeRunner(state: SessionRunnerState, nowMs: number): RunnerUpdate {
  if (state.phase !== 'paused') {
    return unchanged(state);
  }
  return {
    state: { ...state, phase: 'running', lastEventAtMs: nowMs },
    transitions: [{ type: 'session_resumed' }],
  };
}

/** Passe au bloc suivant (le step sauté est tracé `skipped`). */
export function skipRunnerStep(state: SessionRunnerState, nowMs: number): RunnerUpdate {
  if (state.phase !== 'running' && state.phase !== 'paused') {
    return unchanged(state);
  }
  const steps = flattenBlocks(state.blocks);
  const advanced = advanceClock(state, nowMs);
  return completeCurrentStep(advanced, steps, {
    skipped: true,
    carryMs: 0,
    carryM: 0,
    nowMs,
  });
}

/** Abandon : la séance s'arrête là, l'état reste disponible pour le récap. */
export function abandonRunner(state: SessionRunnerState, nowMs: number): RunnerUpdate {
  if (state.phase !== 'running' && state.phase !== 'paused') {
    return unchanged(state);
  }
  const advanced = advanceClock(state, nowMs);
  return {
    state: { ...advanced, phase: 'abandoned', endedAt: new Date(nowMs).toISOString() },
    transitions: [{ type: 'session_abandoned' }],
  };
}

/** Step courant (undefined une fois la séance terminée). */
export function currentFlatStep(state: SessionRunnerState): FlatStep | undefined {
  if (state.phase === 'completed' || state.phase === 'abandoned') {
    return undefined;
  }
  return flattenBlocks(state.blocks)[state.stepIndex];
}

/** Step suivant (affichage « PROCHAIN », annonces). */
export function nextFlatStep(state: SessionRunnerState): FlatStep | undefined {
  return flattenBlocks(state.blocks)[state.stepIndex + 1];
}

/* ------------------------------------------------------------------ */
/* Snapshot crash-safe (ADR-009)                                       */
/* ------------------------------------------------------------------ */

export const SESSION_SNAPSHOT_VERSION = 1;

export const sessionRunnerSnapshotSchema = z.object({
  version: z.literal(SESSION_SNAPSHOT_VERSION),
  state: sessionRunnerStateSchema,
});

export type SessionRunnerSnapshot = z.infer<typeof sessionRunnerSnapshotSchema>;

/** Sérialise l'état complet (JSON) pour la persistance à chaque transition. */
export function serializeRunnerState(state: SessionRunnerState): string {
  return JSON.stringify({ version: SESSION_SNAPSHOT_VERSION, state });
}

/**
 * Restaure un snapshot après kill/restore du process : re-validé par zod
 * (un snapshot corrompu retourne `undefined`, jamais d'exception) ; une
 * séance qui était `running` revient en `paused` — le temps mort entre le
 * kill et la reprise n'est pas compté, l'utilisateur reprend explicitement.
 */
export function deserializeRunnerState(json: string): SessionRunnerState | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return undefined;
  }
  const parsed = sessionRunnerSnapshotSchema.safeParse(raw);
  if (!parsed.success) {
    return undefined;
  }
  const state = parsed.data.state;
  if (state.phase === 'running') {
    return { ...state, phase: 'paused' };
  }
  return state;
}
