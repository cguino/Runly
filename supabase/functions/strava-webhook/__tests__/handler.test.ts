import { decideWebhookAction, validateSubscription } from '../handler';

describe('webhook Strava — validation d’abonnement (E6-4)', () => {
  it('renvoie le challenge quand le verify_token correspond', () => {
    const query = new URLSearchParams({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'runly-secret',
      'hub.challenge': 'abc123',
    });
    expect(validateSubscription(query, 'runly-secret')).toEqual({
      ok: true,
      body: { 'hub.challenge': 'abc123' },
    });
  });

  it('refuse un mauvais token', () => {
    const query = new URLSearchParams({
      'hub.mode': 'subscribe',
      'hub.verify_token': 'intrus',
      'hub.challenge': 'abc123',
    });
    expect(validateSubscription(query, 'runly-secret')).toEqual({ ok: false, status: 403 });
  });
});

describe('webhook Strava — tri des événements (payloads simulés)', () => {
  const base = {
    object_id: 15482930211,
    owner_id: 4471,
    subscription_id: 12,
    event_time: 1784200000,
  };

  it('activité créée → import', () => {
    expect(
      decideWebhookAction({ ...base, object_type: 'activity', aspect_type: 'create' }),
    ).toEqual({ action: 'import_activity', activityId: 15482930211, ownerId: 4471 });
  });

  it('activité supprimée → suppression relayée', () => {
    expect(
      decideWebhookAction({ ...base, object_type: 'activity', aspect_type: 'delete' }),
    ).toEqual({ action: 'delete_activity', activityId: 15482930211, ownerId: 4471 });
  });

  it('update avec changement de type → ré-import (Workout requalifié en Run)', () => {
    expect(
      decideWebhookAction({
        ...base,
        object_type: 'activity',
        aspect_type: 'update',
        updates: { type: 'Run' },
      }),
    ).toEqual({ action: 'import_activity', activityId: 15482930211, ownerId: 4471 });
  });

  it('update sans changement pertinent (titre) → ignoré', () => {
    expect(
      decideWebhookAction({
        ...base,
        object_type: 'activity',
        aspect_type: 'update',
        updates: { title: 'Sortie du dimanche' },
      }),
    ).toEqual({ action: 'ignore', reason: 'update_without_relevant_change' });
  });

  it('événement athlète (désautorisation) → ignoré ici', () => {
    expect(decideWebhookAction({ ...base, object_type: 'athlete', aspect_type: 'update' })).toEqual(
      { action: 'ignore', reason: 'athlete_event' },
    );
  });

  it('payload malformé → ignoré sans crash', () => {
    expect(decideWebhookAction(null)).toEqual({ action: 'ignore', reason: 'malformed' });
    expect(decideWebhookAction({ hello: 'world' })).toEqual({
      action: 'ignore',
      reason: 'malformed',
    });
  });
});
