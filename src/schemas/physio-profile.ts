import { z } from 'zod';

/**
 * PhysioProfile : vma, fcmax, sv1/sv2, zones, confiance par champ,
 * historique des révisions (spec §9, §7.5).
 */

/** Niveau de confiance d'une référence physio (spec §7.5). */
export const confidenceSchema = z.enum(['mesure', 'estime', 'defaut']);

export type Confidence = z.infer<typeof confidenceSchema>;

/** Valeur physiologique + provenance (badge `warn` si estimé/défaut). */
export const physioValueSchema = z.object({
  value: z.number().positive(),
  confidence: confidenceSchema,
});

export type PhysioValue = z.infer<typeof physioValueSchema>;

/** Champs révisables du profil physio. */
export const physioFieldSchema = z.enum(['vmaKmh', 'fcmaxBpm', 'sv1PctVma', 'sv2PctVma']);

export type PhysioField = z.infer<typeof physioFieldSchema>;

/** Une révision : qui a changé quoi, quand, d'où venait la valeur. */
export const physioRevisionSchema = z.object({
  field: physioFieldSchema,
  previousValue: z.number().positive().nullable(),
  newValue: z.number().positive(),
  /** Origine de la révision : édition manuelle ou recalcul accepté. */
  source: z.enum(['manuel', 'recalcul']),
  at: z.string().datetime({ offset: true }),
});

export type PhysioRevision = z.infer<typeof physioRevisionSchema>;

/** Zone FC en % FCmax (5 zones, spec §7.5). */
export const hrZoneSchema = z.object({
  zone: z.number().int().min(1).max(5),
  minPctFcmax: z.number().min(0).max(100),
  maxPctFcmax: z.number().min(0).max(100),
});

export type HrZone = z.infer<typeof hrZoneSchema>;

export const physioProfileSchema = z.object({
  vmaKmh: physioValueSchema.optional(),
  fcmaxBpm: physioValueSchema.optional(),
  sv1PctVma: physioValueSchema.optional(),
  sv2PctVma: physioValueSchema.optional(),
  zones: z.array(hrZoneSchema).length(5).optional(),
  revisions: z.array(physioRevisionSchema).default([]),
});

export type PhysioProfile = z.infer<typeof physioProfileSchema>;
