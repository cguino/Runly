import { addDays } from '@/lib/dates';
import type { PlannedSession, Workout } from '@/schemas';

/**
 * Matching séance réalisée ↔ planifiée (E6-5, spec §7.7) : même jour
 * ± tolérance, avec correction manuelle en 1–2 taps (D11) — l'algorithme
 * propose, l'utilisateur peut ré-associer/dissocier.
 */

export const MATCHING_TOLERANCE_DAYS = 1;

export type MatchResult =
  | { status: 'matched'; session: PlannedSession }
  | { status: 'ambiguous'; candidates: PlannedSession[] }
  | { status: 'none' };

function isMatchable(session: PlannedSession): boolean {
  return session.status === 'planned' || session.status === 'moved';
}

/**
 * Propose le rapprochement d'un workout avec les séances planifiées :
 * les séances du même jour priment ; à défaut, celles à ± 1 jour.
 * Plusieurs candidates au même niveau → ambigu (l'utilisateur tranche).
 */
export function matchWorkout(workout: Workout, sessions: PlannedSession[]): MatchResult {
  const workoutDay = workout.startedAt.slice(0, 10);
  const matchable = sessions.filter(isMatchable);

  const sameDay = matchable.filter((s) => s.scheduledDate === workoutDay);
  if (sameDay.length === 1) {
    return { status: 'matched', session: sameDay[0]! };
  }
  if (sameDay.length > 1) {
    return { status: 'ambiguous', candidates: sameDay };
  }

  const nearbyDays = new Set<string>();
  for (let offset = 1; offset <= MATCHING_TOLERANCE_DAYS; offset += 1) {
    nearbyDays.add(addDays(workoutDay, -offset));
    nearbyDays.add(addDays(workoutDay, offset));
  }
  const nearby = matchable.filter((s) => nearbyDays.has(s.scheduledDate));
  if (nearby.length === 1) {
    return { status: 'matched', session: nearby[0]! };
  }
  if (nearby.length > 1) {
    return { status: 'ambiguous', candidates: nearby };
  }
  return { status: 'none' };
}

/** Associe (1 tap) : le workout pointe la séance, la séance passe « done ». */
export function associateWorkout(
  workout: Workout,
  session: PlannedSession,
): { workout: Workout; session: PlannedSession } {
  return {
    workout: { ...workout, matchedPlannedSessionId: session.id },
    session: { ...session, status: 'done' },
  };
}

/** Dissocie (1 tap, faux positif) : la séance redevient planifiée. */
export function dissociateWorkout(
  workout: Workout,
  session: PlannedSession,
): { workout: Workout; session: PlannedSession } {
  const { matchedPlannedSessionId: _dropped, ...rest } = workout;
  return {
    workout: rest,
    session: { ...session, status: 'planned' },
  };
}
