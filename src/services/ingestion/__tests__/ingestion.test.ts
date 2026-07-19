import type { PlannedSession, Workout } from '@/schemas';

import {
  healthConnectSundayLongRun,
  healthKitCorruptedWorkout,
  healthKitMorningIntervals,
  healthKitNoonCooldownJog,
  healthKitStrengthTraining,
  healthKitSundayLongRun,
  stravaBikeRide,
  stravaSundayLongRun,
  stravaTuesdayEasyRun,
} from '../__fixtures__/raw-payloads';
import { dedupeWorkouts } from '../dedup';
import { associateWorkout, dissociateWorkout, matchWorkout } from '../matching';
import {
  normalizeHealthConnectSession,
  normalizeHealthKitWorkout,
  normalizeStravaActivity,
} from '../normalize';

function workout(result: ReturnType<typeof normalizeStravaActivity>): Workout {
  if (!result.ok) {
    throw new Error(`normalisation attendue ok, reçu ${result.reason}`);
  }
  return result.workout;
}

describe('normalisation multi-sources (E6-1)', () => {
  it('normalise un run Strava en Workout agrégé (cadence ×2)', () => {
    const w = workout(normalizeStravaActivity(stravaSundayLongRun));
    expect(w.source).toBe('strava');
    expect(w.durationS).toBe(4890); // moving_time prioritaire
    expect(w.distanceM).toBe(15060);
    expect(w.avgHrBpm).toBe(148);
    expect(w.avgCadenceSpm).toBe(169); // 84,5 par jambe → 169 pas/min
  });

  it('normalise HealthKit et Health Connect', () => {
    const hk = workout(normalizeHealthKitWorkout(healthKitSundayLongRun));
    expect(hk.source).toBe('healthkit');
    expect(hk.maxHrBpm).toBe(166);
    const hc = workout(normalizeHealthConnectSession(healthConnectSundayLongRun));
    expect(hc.source).toBe('healthconnect');
    expect(hc.durationS).toBe(4980); // endTime − startTime
  });

  it('filtre les activités non-course (vélo, renfo)', () => {
    expect(normalizeStravaActivity(stravaBikeRide)).toEqual({
      ok: false,
      reason: 'not_running',
    });
    expect(normalizeHealthKitWorkout(healthKitStrengthTraining)).toEqual({
      ok: false,
      reason: 'not_running',
    });
  });

  it('rejette un payload corrompu (durée nulle) via zod', () => {
    expect(normalizeHealthKitWorkout(healthKitCorruptedWorkout)).toEqual({
      ok: false,
      reason: 'invalid_payload',
    });
  });
});

describe('déduplication (E6-1) — priorité Strava > santé', () => {
  const strava = workout(normalizeStravaActivity(stravaSundayLongRun));
  const healthkit = workout(normalizeHealthKitWorkout(healthKitSundayLongRun));
  const tuesday = workout(normalizeStravaActivity(stravaTuesdayEasyRun));

  it('garde la version Strava du doublon Strava + santé', () => {
    const { kept, discarded } = dedupeWorkouts([healthkit, strava]);
    expect(kept).toEqual([strava]);
    expect(discarded).toEqual([{ workout: healthkit, keptInstead: strava }]);
  });

  it('l’ordre d’arrivée ne change pas le résultat', () => {
    expect(dedupeWorkouts([strava, healthkit]).kept).toEqual([strava]);
  });

  it('ne fusionne pas deux séances proches mais distinctes du même jour', () => {
    const intervals = workout(normalizeHealthKitWorkout(healthKitMorningIntervals));
    const jog = workout(normalizeHealthKitWorkout(healthKitNoonCooldownJog));
    const { kept, discarded } = dedupeWorkouts([intervals, jog]);
    expect(kept).toHaveLength(2);
    expect(discarded).toHaveLength(0);
  });

  it('ne fusionne pas des séances de jours différents', () => {
    const { kept } = dedupeWorkouts([strava, tuesday]);
    expect(kept).toHaveLength(2);
  });

  it('triple remontée (Strava + HealthKit + Health Connect) → une seule séance', () => {
    const hc = workout(normalizeHealthConnectSession(healthConnectSundayLongRun));
    const { kept, discarded } = dedupeWorkouts([healthkit, hc, strava]);
    expect(kept).toEqual([strava]);
    expect(discarded).toHaveLength(2);
  });
});

describe('matching réalisé ↔ planifié (E6-5)', () => {
  const session = (
    id: string,
    date: string,
    type: PlannedSession['sessionType'],
  ): PlannedSession => ({
    id,
    scheduledDate: date,
    sessionType: type,
    blocks: [],
    status: 'planned',
  });

  const sundayWorkout = workout(normalizeStravaActivity(stravaSundayLongRun));

  it('nominal : une seule séance planifiée le même jour → matchée', () => {
    const planned = session('11111111-1111-4111-8111-111111111111', '2026-07-12', 'sortie_longue');
    const result = matchWorkout(sundayWorkout, [
      planned,
      session('22222222-2222-4222-8222-222222222222', '2026-07-14', 'ef'),
    ]);
    expect(result).toEqual({ status: 'matched', session: planned });
  });

  it('tolérance ± 1 jour quand rien le jour même (séance décalée)', () => {
    const saturday = session('33333333-3333-4333-8333-333333333333', '2026-07-11', 'sortie_longue');
    expect(matchWorkout(sundayWorkout, [saturday])).toEqual({
      status: 'matched',
      session: saturday,
    });
  });

  it('ambigu : deux séances le même jour → l’utilisateur tranche (D11)', () => {
    const a = session('44444444-4444-4444-8444-444444444444', '2026-07-12', 'ef');
    const b = session('55555555-5555-4555-8555-555555555555', '2026-07-12', 'sortie_longue');
    expect(matchWorkout(sundayWorkout, [a, b])).toEqual({
      status: 'ambiguous',
      candidates: [a, b],
    });
  });

  it('aucune séance dans la fenêtre → none (séance spontanée)', () => {
    const farSession = session('66666666-6666-4666-8666-666666666666', '2026-07-20', 'ef');
    expect(matchWorkout(sundayWorkout, [farSession])).toEqual({ status: 'none' });
  });

  it('ignore les séances déjà réalisées ou annulées', () => {
    const done = {
      ...session('77777777-7777-4777-8777-777777777777', '2026-07-12', 'ef'),
      status: 'done' as const,
    };
    expect(matchWorkout(sundayWorkout, [done])).toEqual({ status: 'none' });
  });

  it('faux positif corrigé : associer puis dissocier en 1 tap chacun (D11)', () => {
    const planned = session('88888888-8888-4888-8888-888888888888', '2026-07-12', 'ef');
    const associated = associateWorkout(sundayWorkout, planned);
    expect(associated.workout.matchedPlannedSessionId).toBe(planned.id);
    expect(associated.session.status).toBe('done');

    const dissociated = dissociateWorkout(associated.workout, associated.session);
    expect(dissociated.workout.matchedPlannedSessionId).toBeUndefined();
    expect(dissociated.session.status).toBe('planned');
  });
});
