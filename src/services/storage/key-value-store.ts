/**
 * Abstraction clé-valeur synchrone (offline-first, ADR-009).
 * Implémentations : expo-sqlite (`sqlite-key-value-store.ts`) en app,
 * mémoire ici pour les tests (kill/restore simulés).
 */
export type KeyValueStore = {
  get: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  remove: (key: string) => void;
};

/** Implémentation mémoire (tests, environnements sans natif). */
export function createInMemoryKeyValueStore(
  initial?: Record<string, string>,
): KeyValueStore & { dump: () => Record<string, string> } {
  const map = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    get: (key) => map.get(key),
    set: (key, value) => {
      map.set(key, value);
    },
    remove: (key) => {
      map.delete(key);
    },
    dump: () => Object.fromEntries(map),
  };
}
