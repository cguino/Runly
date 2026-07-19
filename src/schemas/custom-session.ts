import { z } from 'zod';

import { sessionTypeSchema } from './plan';
import { sessionBlockSchema } from './session-block';

/**
 * Séance personnalisée du builder (E4-4, US-06) : une structure de blocs
 * nommée, sauvegardée dans la bibliothèque et rejouable dans le player.
 * Sérialisable JSON (persistence locale puis sync Supabase, Lots suivants).
 */

export const customSessionSchema = z.object({
  id: z.string().uuid(),
  /** Nom donné par l'utilisateur (« Séance club mardi »). */
  name: z.string().trim().min(1).max(60),
  /**
   * Type déclaré à la création — sert à valoriser la séance dans la charge
   * (RPE attendu par type) et à titrer le player. Le fartlek est le type
   * par défaut du builder (structure libre, spec §7.3).
   */
  sessionType: sessionTypeSchema.default('fartlek'),
  blocks: z.array(sessionBlockSchema).min(1),
  /** Date de création ISO (tri d'affichage). */
  createdAt: z.string().datetime({ offset: true }).optional(),
});

export type CustomSession = z.infer<typeof customSessionSchema>;
