import { z } from 'zod';

/**
 * Modèle de séance en blocs (E4-1) — **la** structure pivot partagée par le
 * player, le plan et le builder (spec §9). Contraintes : sérialisable JSON
 * (persistée en jsonb, P2 montre) et récursive (séries imbriquées).
 *
 * Un bloc est soit un `step` (répétition unique : durée|distance @ cible),
 * soit une `series` (répétitions × blocs, récupération entre répétitions).
 */

/** Étendue d'un bloc : durée OU distance (spec §9). */
export const blockExtentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('duration'), seconds: z.number().int().positive() }),
  z.object({ type: z.literal('distance'), meters: z.number().positive() }),
]);

export type BlockExtent = z.infer<typeof blockExtentSchema>;

/**
 * Cible d'un bloc : allure (bande min–max en s/km), zone FC (1–5) ou RPE
 * (0–10, échelle Foster) ; `none` = allure libre (récupération, échauffement).
 */
export const blockTargetSchema = z
  .discriminatedUnion('type', [
    z.object({
      type: z.literal('pace'),
      minSecondsPerKm: z.number().positive(),
      maxSecondsPerKm: z.number().positive(),
    }),
    z.object({ type: z.literal('hrZone'), zone: z.number().int().min(1).max(5) }),
    z.object({ type: z.literal('rpe'), rpe: z.number().int().min(0).max(10) }),
    z.object({ type: z.literal('none') }),
  ])
  .superRefine((target, ctx) => {
    if (target.type === 'pace' && target.minSecondsPerKm > target.maxSecondsPerKm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'bande d’allure inversée (min > max)',
      });
    }
  });

export type BlockTarget = z.infer<typeof blockTargetSchema>;

/** Rôle d'un step dans la séance (affichage / stats, optionnel). */
export const stepRoleSchema = z.enum(['echauffement', 'travail', 'recuperation', 'retour_calme']);

export type StepRole = z.infer<typeof stepRoleSchema>;

export type SessionStep = {
  kind: 'step';
  extent: BlockExtent;
  target: BlockTarget;
  role?: StepRole;
};

export type SessionSeries = {
  kind: 'series';
  repetitions: number;
  blocks: SessionBlock[];
  /** Récupération jouée entre les répétitions (pas après la dernière). */
  recovery?: SessionStep;
};

export type SessionBlock = SessionStep | SessionSeries;

export const sessionStepSchema: z.ZodType<SessionStep> = z.object({
  kind: z.literal('step'),
  extent: blockExtentSchema,
  target: blockTargetSchema,
  role: stepRoleSchema.optional(),
});

export const sessionSeriesSchema: z.ZodType<SessionSeries> = z.object({
  kind: z.literal('series'),
  repetitions: z.number().int().min(1).max(50),
  blocks: z.lazy(() => z.array(sessionBlockSchema).min(1)),
  recovery: sessionStepSchema.optional(),
});

export const sessionBlockSchema: z.ZodType<SessionBlock> = z.lazy(() =>
  z.union([sessionStepSchema, sessionSeriesSchema]),
);

/** Une structure de séance complète = liste ordonnée de blocs. */
export const sessionBlocksSchema = z.array(sessionBlockSchema);
