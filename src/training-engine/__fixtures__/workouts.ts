import type { Workout } from '@/schemas';

/**
 * Fixtures d'historiques réalistes pour les tests du moteur physio
 * (vérification Lot 1 : débutant, régulier, données creuses).
 */

function run(partial: Omit<Workout, 'source'>): Workout {
  return { source: 'healthkit', ...partial };
}

/**
 * Débutant : 3 semaines de course lente, footings 20–30 min sans effort
 * soutenu de 5–12 min → pas d'estimation VMA possible, FC max observée.
 */
export const beginnerHistory: Workout[] = [
  run({
    startedAt: '2026-06-28T09:00:00+02:00',
    durationS: 1500,
    distanceM: 3300,
    avgHrBpm: 158,
    maxHrBpm: 176,
  }),
  run({
    startedAt: '2026-07-01T09:00:00+02:00',
    durationS: 1800,
    distanceM: 4000,
    avgHrBpm: 155,
    maxHrBpm: 172,
  }),
  run({
    startedAt: '2026-07-05T09:00:00+02:00',
    durationS: 1560,
    distanceM: 3500,
    avgHrBpm: 156,
    maxHrBpm: 170,
  }),
  run({
    startedAt: '2026-07-08T09:00:00+02:00',
    durationS: 1740,
    distanceM: 4100,
    avgHrBpm: 154,
    maxHrBpm: 169,
  }),
];

/**
 * Coureur régulier : footings + sortie longue + un effort soutenu de 10 min
 * (2,75 km → 16,5 km/h) exploitable pour la VMA.
 */
export const regularHistory: Workout[] = [
  run({
    startedAt: '2026-06-14T08:30:00+02:00',
    durationS: 3600,
    distanceM: 10200,
    avgHrBpm: 148,
    maxHrBpm: 168,
  }),
  run({
    startedAt: '2026-06-17T19:00:00+02:00',
    durationS: 2700,
    distanceM: 8100,
    avgHrBpm: 150,
    maxHrBpm: 165,
  }),
  // Effort soutenu : 10 min à 16,5 km/h (course locale, format court)
  run({
    startedAt: '2026-06-21T10:00:00+02:00',
    durationS: 600,
    distanceM: 2750,
    avgHrBpm: 178,
    maxHrBpm: 191,
  }),
  run({
    startedAt: '2026-06-24T19:00:00+02:00',
    durationS: 3000,
    distanceM: 8800,
    avgHrBpm: 149,
    maxHrBpm: 166,
  }),
  run({
    startedAt: '2026-06-28T08:30:00+02:00',
    durationS: 5400,
    distanceM: 15000,
    avgHrBpm: 145,
    maxHrBpm: 163,
  }),
];

/**
 * Données creuses : une seule séance sans distance ni FC (import partiel) —
 * rien d'exploitable, tout doit retomber sur les fallbacks.
 */
export const sparseHistory: Workout[] = [
  run({ startedAt: '2026-07-02T12:00:00+02:00', durationS: 2400 }),
];
