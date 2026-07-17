import { z } from 'zod';

/**
 * SessionFeedback : rpe, douleurs[], note (spec §9).
 * RPE 0–10 (échelle Foster, G6). Douleurs = tags texte libres au MVP
 * (cartographie corps humain = P1) — jamais de pathologie nommée par l'app.
 */
export const sessionFeedbackSchema = z.object({
  workoutId: z.string().uuid().optional(),
  rpe: z.number().int().min(0).max(10),
  pains: z.array(z.string().min(1)).default([]),
  note: z.string().optional(),
  at: z.string().datetime({ offset: true }).optional(),
});

export type SessionFeedback = z.infer<typeof sessionFeedbackSchema>;
