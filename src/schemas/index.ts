/**
 * `src/schemas` — schémas zod aux frontières (règle transverse n°1) :
 * aucune donnée externe (santé, Strava, formulaires) n'entre dans le
 * domaine sans validation ici. Les schémas métier complets
 * (SessionBlock, Workout, PhysioProfile, Goal, Plan…) arrivent au Lot 1.
 * Contrainte de frontière : zéro import React/Expo dans ce module.
 */
import { z } from 'zod';

/** Sources de séance possibles (spec §9, table `workouts`). */
export const workoutSourceSchema = z.enum([
  'healthkit',
  'healthconnect',
  'strava',
  'player',
  'manuel',
]);

export type WorkoutSource = z.infer<typeof workoutSourceSchema>;

/** Niveau de confiance d'une référence physio (spec §7.5). */
export const confidenceSchema = z.enum(['mesure', 'estime', 'defaut']);

export type Confidence = z.infer<typeof confidenceSchema>;
