import type { SessionBlock } from '@/schemas';

import { useLibraryStore } from '../library-store';

/** Store bibliothèque (E4-4) : sauvegarde et duplication des séances custom. */

const BLOCKS: SessionBlock[] = [
  {
    kind: 'step',
    role: 'travail',
    extent: { type: 'duration', seconds: 1200 },
    target: { type: 'rpe', rpe: 6 },
  },
];

beforeEach(() => {
  useLibraryStore.getState().reset();
});

describe('useLibraryStore', () => {
  it('sauvegarde une séance valide avec un id et une date de création', () => {
    const saved = useLibraryStore.getState().saveSession({
      name: 'Séance club du mardi',
      sessionType: 'fartlek',
      blocks: BLOCKS,
    });
    expect(saved).toBeDefined();
    expect(saved?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(useLibraryStore.getState().savedSessions).toHaveLength(1);
  });

  it('refuse une séance invalide (nom vide, aucun bloc)', () => {
    const store = useLibraryStore.getState();
    expect(store.saveSession({ name: '  ', sessionType: 'ef', blocks: BLOCKS })).toBeUndefined();
    expect(store.saveSession({ name: 'Vide', sessionType: 'ef', blocks: [] })).toBeUndefined();
    expect(useLibraryStore.getState().savedSessions).toHaveLength(0);
  });

  it('duplique en copie indépendante suffixée (US-06)', () => {
    const original = useLibraryStore.getState().saveSession({
      name: 'Pyramide',
      sessionType: 'vma_court',
      blocks: BLOCKS,
    });
    const copy = useLibraryStore.getState().duplicateSession(original!.id);
    expect(copy).toBeDefined();
    expect(copy?.id).not.toBe(original!.id);
    expect(copy?.name).toBe('Pyramide (copie)');
    expect(copy?.blocks).toEqual(original!.blocks);
    expect(useLibraryStore.getState().savedSessions).toHaveLength(2);
  });

  it('duplication d’un id inconnu → undefined, rien n’est ajouté', () => {
    expect(useLibraryStore.getState().duplicateSession('inconnu')).toBeUndefined();
    expect(useLibraryStore.getState().savedSessions).toHaveLength(0);
  });
});
