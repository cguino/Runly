import { z } from 'zod';

/**
 * Alert : type, déclencheur, action proposée, décision utilisateur,
 * timestamps (spec §9) — aligné sur la table `alerts` de
 * `supabase/migrations/`. L'utilisateur décide toujours (spec §7.6) :
 * chaque alerte propose une action 1 tap + « Garder mon plan », et sa
 * décision est tracée. Aucun texte français ici : le moteur émet des
 * codes typés, l'UI traduit via `src/i18n`.
 */

export const alertTypeSchema = z.enum(['pic_charge', 'sous_charge', 'rpe_eleve']);

export type AlertType = z.infer<typeof alertTypeSchema>;

/** Décision utilisateur tracée (`alerts.user_decision`). */
export const alertDecisionSchema = z.enum(['accepted', 'kept_plan', 'dismissed']);

export type AlertDecision = z.infer<typeof alertDecisionSchema>;

/**
 * Action proposée en 1 tap (`alerts.proposed_action`) :
 * - `substitution_seance` : remplacer/alléger une séance référencée (pic) ;
 * - `allegement_seance` : alléger la prochaine séance (RPE élevés) ;
 * - `ajout_seance_facile` : reprendre le rythme (sous-charge prolongée).
 */
export const alertProposedActionSchema = z.object({
  kind: z.enum(['substitution_seance', 'allegement_seance', 'ajout_seance_facile']),
  /** Référence de la séance planifiée visée (id), si connue. */
  sessionRef: z.string().optional(),
});

export type AlertProposedAction = z.infer<typeof alertProposedActionSchema>;

/** Contexte du déclencheur (`alerts.trigger_context`) : valeurs, pas de texte. */
export const alertTriggerContextSchema = z.object({
  acwr: z.number().nonnegative().optional(),
  /** Hausse de charge vs habitude, en % arrondi (pic). */
  loadIncreasePct: z.number().optional(),
  /** Jours consécutifs en sous-charge. */
  underloadDays: z.number().int().nonnegative().optional(),
  /** Derniers RPE consécutifs élevés (rpe_eleve). */
  lastRpes: z.array(z.number().min(0).max(10)).optional(),
});

export type AlertTriggerContext = z.infer<typeof alertTriggerContextSchema>;

export const alertSchema = z.object({
  id: z.string().uuid().optional(),
  alertType: alertTypeSchema,
  triggerContext: alertTriggerContextSchema.default({}),
  proposedAction: alertProposedActionSchema,
  userDecision: alertDecisionSchema.optional(),
  decidedAt: z.string().datetime({ offset: true }).optional(),
  createdAt: z.string().datetime({ offset: true }),
});

export type Alert = z.infer<typeof alertSchema>;
