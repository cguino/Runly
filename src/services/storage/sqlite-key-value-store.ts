import { openDatabaseSync } from 'expo-sqlite';

import type { KeyValueStore } from './key-value-store';

/**
 * Implémentation expo-sqlite du stockage clé-valeur (ADR-009) : API
 * synchrone — chaque `set` est committé immédiatement par SQLite, ce qui
 * rend la persistance de la séance crash-safe à chaque transition (E5-1).
 */
export const RUNLY_DB_NAME = 'runly.db';

export function createSqliteKeyValueStore(dbName: string = RUNLY_DB_NAME): KeyValueStore {
  const db = openDatabaseSync(dbName);
  db.execSync(
    'CREATE TABLE IF NOT EXISTS key_value (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)',
  );
  return {
    get: (key) =>
      db.getFirstSync<{ value: string }>('SELECT value FROM key_value WHERE key = ?', key)?.value,
    set: (key, value) => {
      db.runSync('INSERT OR REPLACE INTO key_value (key, value) VALUES (?, ?)', key, value);
    },
    remove: (key) => {
      db.runSync('DELETE FROM key_value WHERE key = ?', key);
    },
  };
}
