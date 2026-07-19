import { z } from 'zod';

/**
 * Profil utilisateur (spec §9 : profil, antécédents[], préférences).
 * L'antécédent < 12 mois pilote la prudence du moteur de plan
 * (progression 5–8 % au lieu de ≤ 10 %, Lot 3).
 */
export const injuryRecordSchema = z.object({
  /** Mois de l'épisode, ISO `YYYY-MM` (déclaratif, pas de pathologie nommée en UI). */
  occurredIn: z.string().regex(/^\d{4}-\d{2}$/, 'mois attendu au format YYYY-MM'),
  note: z.string().optional(),
});

export type InjuryRecord = z.infer<typeof injuryRecordSchema>;

export const userProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  /** Date de naissance ISO `YYYY-MM-DD` — âge minimum 16 ans vérifié à l'onboarding (D12). */
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date attendue au format YYYY-MM-DD')
    .optional(),
  injuryHistory: z.array(injuryRecordSchema).default([]),
  /** Jours d'entraînement préférés : 0 = lundi … 6 = dimanche. */
  preferredDays: z.array(z.number().int().min(0).max(6)).default([]),
  sessionsPerWeek: z.number().int().min(2).max(7).optional(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
