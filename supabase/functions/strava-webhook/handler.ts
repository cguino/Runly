/**
 * Logique pure du webhook Strava (E6-4) — sans API Deno, testable en jest.
 * Deux responsabilités :
 * 1. validation d'abonnement (GET avec hub.challenge) ;
 * 2. tri des événements POST → décision d'import (les activités « create »
 *    du propriétaire), le fetch de l'activité et l'insertion Supabase se
 *    font dans index.ts (Deno) avec les secrets d'environnement.
 */

export type SubscriptionValidation =
  { ok: true; body: { 'hub.challenge': string } } | { ok: false; status: 403 };

/** GET de validation : echo du challenge si le verify_token correspond. */
export function validateSubscription(
  query: URLSearchParams | Record<string, string>,
  expectedVerifyToken: string,
): SubscriptionValidation {
  const get = (key: string) =>
    query instanceof URLSearchParams ? (query.get(key) ?? undefined) : query[key];
  const mode = get('hub.mode');
  const token = get('hub.verify_token');
  const challenge = get('hub.challenge');
  if (mode === 'subscribe' && token === expectedVerifyToken && challenge !== undefined) {
    return { ok: true, body: { 'hub.challenge': challenge } };
  }
  return { ok: false, status: 403 };
}

/** Événement webhook Strava (documentation API v3). */
export type StravaWebhookEvent = {
  object_type: 'activity' | 'athlete';
  object_id: number;
  aspect_type: 'create' | 'update' | 'delete';
  owner_id: number;
  subscription_id: number;
  event_time: number;
  updates?: Record<string, unknown>;
};

export type WebhookDecision =
  | { action: 'import_activity'; activityId: number; ownerId: number }
  | { action: 'delete_activity'; activityId: number; ownerId: number }
  | { action: 'ignore'; reason: 'athlete_event' | 'update_without_relevant_change' | 'malformed' };

/**
 * Décide quoi faire d'un événement : import sur create (et update de type —
 * une activité requalifiée en course doit entrer), suppression relayée,
 * le reste ignoré. Toujours répondre 200 vite (Strava retente sinon).
 */
export function decideWebhookAction(payload: unknown): WebhookDecision {
  if (typeof payload !== 'object' || payload === null) {
    return { action: 'ignore', reason: 'malformed' };
  }
  const event = payload as Partial<StravaWebhookEvent>;
  if (
    typeof event.object_id !== 'number' ||
    typeof event.owner_id !== 'number' ||
    event.object_type === undefined ||
    event.aspect_type === undefined
  ) {
    return { action: 'ignore', reason: 'malformed' };
  }
  if (event.object_type === 'athlete') {
    return { action: 'ignore', reason: 'athlete_event' };
  }
  if (event.aspect_type === 'delete') {
    return { action: 'delete_activity', activityId: event.object_id, ownerId: event.owner_id };
  }
  if (event.aspect_type === 'create') {
    return { action: 'import_activity', activityId: event.object_id, ownerId: event.owner_id };
  }
  // update : seul un changement de type (ex. Workout → Run) justifie un ré-import.
  if (event.updates !== undefined && 'type' in event.updates) {
    return { action: 'import_activity', activityId: event.object_id, ownerId: event.owner_id };
  }
  return { action: 'ignore', reason: 'update_without_relevant_change' };
}
