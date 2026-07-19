import { createRunner, startRunner, tickRunner } from '@/training-engine';

import { createInMemoryKeyValueStore } from '../../storage';
import { ACTIVE_SESSION_KEY, createSessionSnapshotStore } from '../session-snapshot-store';

const T0 = 1_752_700_000_000;

function runningState() {
  const runner = createRunner({
    sessionId: 's1',
    blocks: [
      { kind: 'step', extent: { type: 'duration', seconds: 600 }, target: { type: 'none' } },
    ],
  });
  return tickRunner(startRunner(runner, T0).state, T0 + 42_000).state;
}

describe('session snapshot store (E5-1, ADR-009) — crash-safe', () => {
  it('save puis load sur un « nouveau process » : la séance revient en pause', () => {
    const kv = createInMemoryKeyValueStore();
    createSessionSnapshotStore(kv).save(runningState());

    // Kill/restore simulé : nouveau store branché sur la même persistance.
    const afterRestart = createSessionSnapshotStore(kv);
    const restored = afterRestart.load();
    expect(restored?.phase).toBe('paused');
    expect(restored?.totalElapsedMs).toBe(42_000);
  });

  it('load sans snapshot ou avec un snapshot corrompu : undefined', () => {
    const kv = createInMemoryKeyValueStore();
    const store = createSessionSnapshotStore(kv);
    expect(store.load()).toBeUndefined();
    kv.set(ACTIVE_SESSION_KEY, '{corrompu');
    expect(store.load()).toBeUndefined();
  });

  it('clear efface la séance persistée', () => {
    const kv = createInMemoryKeyValueStore();
    const store = createSessionSnapshotStore(kv);
    store.save(runningState());
    store.clear();
    expect(store.load()).toBeUndefined();
  });
});
