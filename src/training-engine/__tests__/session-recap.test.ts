import type { SessionBlock } from '@/schemas';

import { buildSessionRecap, MIN_WORKOUT_DURATION_S, workoutFromRunner } from '../session-recap';
import {
  addRunnerDistance,
  createRunner,
  skipRunnerStep,
  startRunner,
  tickRunner,
} from '../session-runner';
import type { SessionRunnerState } from '../session-runner';

const T0 = 1_752_700_000_000;

const BLOCKS: SessionBlock[] = [
  {
    kind: 'step',
    extent: { type: 'duration', seconds: 60 },
    target: { type: 'none' },
    role: 'echauffement',
  },
  {
    kind: 'step',
    extent: { type: 'distance', meters: 1000 },
    target: { type: 'pace', minSecondsPerKm: 285, maxSecondsPerKm: 300 },
    role: 'travail',
  },
  {
    kind: 'step',
    extent: { type: 'duration', seconds: 60 },
    target: { type: 'none' },
    role: 'retour_calme',
  },
];

/** Joue la séance : échauffement 60 s, 1000 m travail en 5:00, RAC 60 s. */
function playedSession(): SessionRunnerState {
  let state = startRunner(createRunner({ sessionId: 'sess-1', blocks: BLOCKS }), T0).state;
  state = tickRunner(state, T0 + 60_000).state;
  state = addRunnerDistance(state, 1000, T0 + 360_000).state; // 300 s pour 1000 m
  state = tickRunner(state, T0 + 420_000).state;
  return state;
}

describe('buildSessionRecap (E5-5)', () => {
  it('agrège durée, distance, allure moyenne et allure des blocs cibles', () => {
    const recap = buildSessionRecap(playedSession());
    expect(recap.durationS).toBe(420);
    expect(recap.distanceM).toBe(1000);
    expect(recap.avgPaceSecPerKm).toBeCloseTo(420, 5);
    // Bloc travail : 1000 m en 300 s → 5:00 /km.
    expect(recap.workPaceSecPerKm).toBeCloseTo(300, 5);
    expect(recap.skippedSteps).toBe(0);
  });

  it('exclut les blocs sautés de l’allure cible et les compte', () => {
    let state = startRunner(createRunner({ sessionId: 'sess-2', blocks: BLOCKS }), T0).state;
    state = tickRunner(state, T0 + 60_000).state;
    state = skipRunnerStep(state, T0 + 90_000).state; // travail sauté
    state = tickRunner(state, T0 + 150_000).state;
    const recap = buildSessionRecap(state);
    expect(recap.skippedSteps).toBe(1);
    expect(recap.workPaceSecPerKm).toBeUndefined();
  });
});

describe('workoutFromRunner (E5-5) — Workout source player', () => {
  it('construit un Workout agrégé (jamais de GPS brut)', () => {
    const workout = workoutFromRunner(playedSession());
    expect(workout).toMatchObject({
      source: 'player',
      externalId: 'sess-1',
      durationS: 420,
      distanceM: 1000,
    });
    expect(workout?.startedAt).toBe(new Date(T0).toISOString());
    expect(workout && 'gps' in workout).toBe(false);
  });

  it('retourne undefined si la séance est trop courte ou jamais démarrée', () => {
    const ready = createRunner({ sessionId: 'sess-3', blocks: BLOCKS });
    expect(workoutFromRunner(ready)).toBeUndefined();
    let state = startRunner(ready, T0).state;
    state = tickRunner(state, T0 + (MIN_WORKOUT_DURATION_S - 1) * 1000).state;
    expect(workoutFromRunner(state)).toBeUndefined();
  });

  it('propage plannedSessionId seulement s’il est un uuid', () => {
    const withUuid = {
      ...playedSession(),
      plannedSessionId: '123e4567-e89b-42d3-a456-426614174000',
    };
    expect(workoutFromRunner(withUuid)?.matchedPlannedSessionId).toBe(
      '123e4567-e89b-42d3-a456-426614174000',
    );
    const withDemoId = { ...playedSession(), plannedSessionId: 'demo-1' };
    expect(workoutFromRunner(withDemoId)?.matchedPlannedSessionId).toBeUndefined();
  });
});
