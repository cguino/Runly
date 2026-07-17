import type { SessionBlock } from '@/schemas';

import {
  abandonRunner,
  addRunnerDistance,
  createRunner,
  currentFlatStep,
  deserializeRunnerState,
  flattenBlocks,
  nextFlatStep,
  pauseRunner,
  resumeRunner,
  serializeRunnerState,
  skipRunnerStep,
  startRunner,
  tickRunner,
} from '../session-runner';
import type { RunnerTransition, SessionRunnerState } from '../session-runner';

/** Steps utilitaires. */
function durationStep(seconds: number, role?: 'echauffement' | 'travail' | 'recuperation' | 'retour_calme'): SessionBlock {
  return { kind: 'step', extent: { type: 'duration', seconds }, target: { type: 'none' }, role };
}

function distanceStep(meters: number): SessionBlock {
  return {
    kind: 'step',
    extent: { type: 'distance', meters },
    target: { type: 'pace', minSecondsPerKm: 285, maxSecondsPerKm: 300 },
    role: 'travail',
  };
}

const T0 = 1_752_700_000_000;

function startedRunner(blocks: SessionBlock[], nowMs = T0): SessionRunnerState {
  return startRunner(createRunner({ sessionId: 's1', blocks }), nowMs).state;
}

function types(transitions: RunnerTransition[]): string[] {
  return transitions.map((t) => t.type);
}

describe('flattenBlocks (E5-1) — aplatissement des séries', () => {
  it('déroule répétitions et récupérations (pas de récup après la dernière)', () => {
    const blocks: SessionBlock[] = [
      durationStep(900, 'echauffement'),
      {
        kind: 'series',
        repetitions: 2,
        blocks: [distanceStep(2000)],
        recovery: {
          kind: 'step',
          extent: { type: 'duration', seconds: 120 },
          target: { type: 'none' },
          role: 'recuperation',
        },
      },
      durationStep(600, 'retour_calme'),
    ];
    const flat = flattenBlocks(blocks);
    expect(flat).toHaveLength(5);
    expect(flat.map((f) => f.isSeriesRecovery)).toEqual([false, false, true, false, false]);
    expect(flat[1]?.series).toEqual({ repetition: 1, totalRepetitions: 2 });
    expect(flat[3]?.series).toEqual({ repetition: 2, totalRepetitions: 2 });
  });

  it('gère les séries imbriquées', () => {
    const blocks: SessionBlock[] = [
      {
        kind: 'series',
        repetitions: 2,
        blocks: [{ kind: 'series', repetitions: 3, blocks: [durationStep(30, 'travail')] }],
      },
    ];
    expect(flattenBlocks(blocks)).toHaveLength(6);
  });
});

describe('machine à états (E5-1) — transitions', () => {
  it('start : ready → running, step 0 démarré', () => {
    const update = startRunner(createRunner({ sessionId: 's1', blocks: [durationStep(60)] }), T0);
    expect(update.state.phase).toBe('running');
    expect(update.state.startedAt).toBe(new Date(T0).toISOString());
    expect(types(update.transitions)).toEqual(['session_started', 'step_started']);
  });

  it('start ignoré hors de ready', () => {
    const state = startedRunner([durationStep(60)]);
    expect(startRunner(state, T0 + 1000).transitions).toEqual([]);
  });

  it('tick : franchit la frontière d’un bloc en durée avec report de l’excédent', () => {
    const state = startedRunner([durationStep(60), durationStep(60)]);
    const update = tickRunner(state, T0 + 61_500);
    expect(update.state.stepIndex).toBe(1);
    expect(update.state.stepElapsedMs).toBe(1500);
    expect(update.state.totalElapsedMs).toBe(61_500);
    expect(types(update.transitions)).toEqual(['step_completed', 'step_started']);
    expect(update.state.completedSteps[0]).toMatchObject({
      index: 0,
      elapsedMs: 60_000,
      skipped: false,
    });
  });

  it('tick : peut franchir plusieurs blocs d’un coup (retour d’arrière-plan)', () => {
    const state = startedRunner([durationStep(30), durationStep(30), durationStep(600)]);
    const update = tickRunner(state, T0 + 70_000);
    expect(update.state.stepIndex).toBe(2);
    expect(update.state.stepElapsedMs).toBe(10_000);
    expect(types(update.transitions)).toEqual([
      'step_completed',
      'step_started',
      'step_completed',
      'step_started',
    ]);
  });

  it('distance : franchit un bloc en distance avec report des mètres', () => {
    const state = startedRunner([distanceStep(400), distanceStep(400)]);
    const mid = addRunnerDistance(state, 250, T0 + 60_000);
    expect(mid.state.stepIndex).toBe(0);
    const done = addRunnerDistance(mid.state, 180, T0 + 100_000);
    expect(done.state.stepIndex).toBe(1);
    expect(done.state.stepDistanceM).toBe(30);
    expect(done.state.totalDistanceM).toBe(430);
    expect(done.state.completedSteps[0]).toMatchObject({ index: 0, distanceM: 400 });
  });

  it('fin de séance : dernier bloc terminé → completed + endedAt', () => {
    const state = startedRunner([durationStep(60)]);
    const update = tickRunner(state, T0 + 60_000);
    expect(update.state.phase).toBe('completed');
    expect(update.state.endedAt).toBe(new Date(T0 + 60_000).toISOString());
    expect(types(update.transitions)).toEqual(['step_completed', 'session_completed']);
    expect(currentFlatStep(update.state)).toBeUndefined();
  });

  it('pause : fige le temps ; resume : ré-ancre sans compter la pause', () => {
    const state = startedRunner([durationStep(600)]);
    const paused = pauseRunner(state, T0 + 10_000);
    expect(paused.state.phase).toBe('paused');
    expect(paused.state.totalElapsedMs).toBe(10_000);
    expect(types(paused.transitions)).toEqual(['session_paused']);

    // 5 minutes de pause : rien ne s'écoule.
    expect(tickRunner(paused.state, T0 + 310_000).state.totalElapsedMs).toBe(10_000);

    const resumed = resumeRunner(paused.state, T0 + 310_000);
    expect(types(resumed.transitions)).toEqual(['session_resumed']);
    const after = tickRunner(resumed.state, T0 + 315_000);
    expect(after.state.totalElapsedMs).toBe(15_000);
  });

  it('skip : trace le step sauté et démarre le suivant', () => {
    const state = startedRunner([durationStep(600), durationStep(60)]);
    const update = skipRunnerStep(state, T0 + 20_000);
    expect(update.state.stepIndex).toBe(1);
    expect(update.state.completedSteps[0]).toMatchObject({
      index: 0,
      skipped: true,
      elapsedMs: 20_000,
    });
    expect(types(update.transitions)).toEqual(['step_completed', 'step_started']);
  });

  it('skip du dernier bloc : termine la séance', () => {
    const state = startedRunner([durationStep(600)]);
    const update = skipRunnerStep(state, T0 + 20_000);
    expect(update.state.phase).toBe('completed');
  });

  it('abandon : depuis running ou paused, avec le temps intégré', () => {
    const state = startedRunner([durationStep(600)]);
    const update = abandonRunner(state, T0 + 45_000);
    expect(update.state.phase).toBe('abandoned');
    expect(update.state.totalElapsedMs).toBe(45_000);
    expect(types(update.transitions)).toEqual(['session_abandoned']);

    const paused = pauseRunner(startedRunner([durationStep(600)]), T0 + 10_000);
    expect(abandonRunner(paused.state, T0 + 60_000).state.phase).toBe('abandoned');
  });

  it('événements ignorés une fois la séance terminée', () => {
    const done = tickRunner(startedRunner([durationStep(60)]), T0 + 60_000).state;
    expect(tickRunner(done, T0 + 90_000).transitions).toEqual([]);
    expect(addRunnerDistance(done, 100, T0 + 90_000).transitions).toEqual([]);
    expect(skipRunnerStep(done, T0 + 90_000).transitions).toEqual([]);
    expect(abandonRunner(done, T0 + 90_000).transitions).toEqual([]);
  });

  it('nextFlatStep : expose le bloc suivant (affichage « PROCHAIN »)', () => {
    const state = startedRunner([durationStep(60), distanceStep(400)]);
    expect(nextFlatStep(state)?.step.extent).toEqual({ type: 'distance', meters: 400 });
  });
});

describe('structure jamais interrompue (D13, spec §7.4)', () => {
  it('sans GPS, les blocs en durée avancent et le timer continue', () => {
    const state = startedRunner([durationStep(60), distanceStep(400), durationStep(60)]);
    // Aucun événement distance : uniquement des ticks.
    const afterFirst = tickRunner(state, T0 + 65_000);
    expect(afterFirst.state.stepIndex).toBe(1);
    // Perte GPS prolongée sur le bloc distance : le temps continue de compter.
    const later = tickRunner(afterFirst.state, T0 + 300_000);
    expect(later.state.phase).toBe('running');
    expect(later.state.stepIndex).toBe(1);
    expect(later.state.totalElapsedMs).toBe(300_000);
    // Retour du signal : la distance reprend et le bloc se termine.
    const resumed = addRunnerDistance(later.state, 400, T0 + 400_000);
    expect(resumed.state.stepIndex).toBe(2);
  });
});

describe('dérive du timer < 1 s/h (spec §7.4)', () => {
  it('reste exact avec des ticks irréguliers sur 1 h simulée', () => {
    let state = startedRunner([durationStep(2 * 3600)]);
    let now = T0;
    const end = T0 + 3_600_000;
    let i = 0;
    while (now < end) {
      // Ticks volontairement irréguliers (250 ms à ~1,4 s).
      now = Math.min(end, now + 250 + ((i * 37) % 1200));
      state = tickRunner(state, now).state;
      i += 1;
    }
    expect(Math.abs(state.totalElapsedMs - 3_600_000)).toBeLessThan(1000);
  });
});

describe('kill/restore du process (E5-1, ADR-009)', () => {
  it('sérialise puis restaure : une séance running revient en pause, rien n’est perdu', () => {
    const blocks: SessionBlock[] = [
      durationStep(900, 'echauffement'),
      {
        kind: 'series',
        repetitions: 2,
        blocks: [distanceStep(2000)],
        recovery: {
          kind: 'step',
          extent: { type: 'duration', seconds: 120 },
          target: { type: 'none' },
          role: 'recuperation',
        },
      },
    ];
    let state = startedRunner(blocks);
    state = tickRunner(state, T0 + 900_000).state; // échauffement terminé
    state = addRunnerDistance(state, 1234, T0 + 1_200_000).state;

    const restored = deserializeRunnerState(serializeRunnerState(state));
    expect(restored).toBeDefined();
    expect(restored?.phase).toBe('paused');
    expect(restored?.stepIndex).toBe(1);
    expect(restored?.stepDistanceM).toBe(1234);
    expect(restored?.totalElapsedMs).toBe(1_200_000);
    expect(restored?.completedSteps).toHaveLength(1);

    // La séance restaurée reprend exactement où elle en était.
    const resumed = resumeRunner(restored as SessionRunnerState, T0 + 2_000_000);
    const finished = addRunnerDistance(resumed.state, 766, T0 + 2_060_000);
    expect(finished.state.stepIndex).toBe(2); // récupération de la série
  });

  it('une séance paused ou completed est restaurée telle quelle', () => {
    const paused = pauseRunner(startedRunner([durationStep(600)]), T0 + 10_000).state;
    expect(deserializeRunnerState(serializeRunnerState(paused))?.phase).toBe('paused');
    const completed = tickRunner(startedRunner([durationStep(60)]), T0 + 60_000).state;
    expect(deserializeRunnerState(serializeRunnerState(completed))?.phase).toBe('completed');
  });

  it('snapshot corrompu ou invalide : undefined, jamais d’exception', () => {
    expect(deserializeRunnerState('{pas du json')).toBeUndefined();
    expect(deserializeRunnerState('{"version":99,"state":{}}')).toBeUndefined();
    expect(deserializeRunnerState(JSON.stringify({ version: 1, state: { phase: 'running' } }))).toBeUndefined();
  });
});
