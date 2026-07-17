/**
 * Edge Function : webhook Strava (E6-4). Rôle limité à l'ingestion
 * (ADR-005) : valider l'abonnement, accuser réception vite, puis importer
 * l'activité en agrégats (jamais de séries FC brutes ni de GPS brut en
 * base — ADR-004).
 *
 * Secrets attendus (supabase secrets set) :
 * - STRAVA_VERIFY_TOKEN : token de validation d'abonnement ;
 * - STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET : rafraîchissement des tokens
 *   utilisateur (table de connexions à créer avec l'OAuth, Lot 5 suite).
 *
 * ⚠️ L'import effectif (fetch activité + insert `workouts`) sera branché
 * quand l'OAuth Strava côté app existera (stockage des tokens par user) —
 * gate G5 : quota Strava demandé. En attendant, l'événement est journalisé
 * et acquitté (Strava exige une réponse < 2 s, sinon il retente).
 */
import { decideWebhookAction, validateSubscription } from './handler.ts';

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const result = validateSubscription(
      url.searchParams,
      Deno.env.get('STRAVA_VERIFY_TOKEN') ?? '',
    );
    if (result.ok) {
      return Response.json(result.body);
    }
    return new Response('forbidden', { status: result.status });
  }

  if (req.method === 'POST') {
    const payload = await req.json().catch(() => null);
    const decision = decideWebhookAction(payload);
    console.log('strava-webhook', JSON.stringify(decision));
    // TODO(Lot 5 suite, gate G5) : import_activity → fetch /activities/:id
    // avec le token du owner, normalisation (agrégats) et upsert `workouts`
    // (dédup par (user_id, source, external_id)).
    return Response.json({ received: true });
  }

  return new Response('method not allowed', { status: 405 });
});
