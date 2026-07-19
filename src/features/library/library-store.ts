import { create } from 'zustand';

import i18n from '@/i18n';
import { randomUuid } from '@/lib/uid';
import type { CustomSession, SessionBlock, SessionType } from '@/schemas';
import { customSessionSchema } from '@/schemas';

/**
 * Store de la bibliothèque (E4-4) : séances personnalisées du builder —
 * sauvegarde et duplication (US-06). Validation zod à l'entrée (règle
 * transverse n°1) ; état en mémoire comme les autres stores (persistance
 * locale/Supabase : lots sync).
 */

type LibraryStoreState = {
  savedSessions: CustomSession[];
  /** Sauvegarde une séance du builder ; `undefined` si structure invalide. */
  saveSession: (input: {
    name: string;
    sessionType: SessionType;
    blocks: SessionBlock[];
  }) => CustomSession | undefined;
  /** Duplique une séance sauvegardée (US-06) : copie indépendante, suffixée. */
  duplicateSession: (id: string) => CustomSession | undefined;
  reset: () => void;
};

export const useLibraryStore = create<LibraryStoreState>()((set, get) => ({
  savedSessions: [],

  saveSession: (input) => {
    const parsed = customSessionSchema.safeParse({
      id: randomUuid(),
      name: input.name,
      sessionType: input.sessionType,
      blocks: input.blocks,
      createdAt: new Date().toISOString(),
    });
    if (!parsed.success) {
      return undefined;
    }
    set({ savedSessions: [...get().savedSessions, parsed.data] });
    return parsed.data;
  },

  duplicateSession: (id) => {
    const source = get().savedSessions.find((s) => s.id === id);
    if (source === undefined) {
      return undefined;
    }
    const copy: CustomSession = {
      ...source,
      id: randomUuid(),
      name: `${source.name} ${i18n.t('library.duplicateSuffix')}`.slice(0, 60),
      createdAt: new Date().toISOString(),
    };
    set({ savedSessions: [...get().savedSessions, copy] });
    return copy;
  },

  reset: () => set({ savedSessions: [] }),
}));
