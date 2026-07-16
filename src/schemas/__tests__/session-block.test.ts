import type { SessionBlock } from '../index';
import { sessionBlocksSchema } from '../index';

/**
 * Cas canonique spec §7.3 : « 2×2000 m @ allure semi, récup 2 min »,
 * avec échauffement 15 min et retour au calme.
 */
const canonicalSession: SessionBlock[] = [
  {
    kind: 'step',
    role: 'echauffement',
    extent: { type: 'duration', seconds: 15 * 60 },
    target: { type: 'none' },
  },
  {
    kind: 'series',
    repetitions: 2,
    blocks: [
      {
        kind: 'step',
        role: 'travail',
        extent: { type: 'distance', meters: 2000 },
        target: { type: 'pace', minSecondsPerKm: 292, maxSecondsPerKm: 306 },
      },
    ],
    recovery: {
      kind: 'step',
      role: 'recuperation',
      extent: { type: 'duration', seconds: 120 },
      target: { type: 'none' },
    },
  },
  {
    kind: 'step',
    role: 'retour_calme',
    extent: { type: 'duration', seconds: 10 * 60 },
    target: { type: 'hrZone', zone: 1 },
  },
];

describe('sessionBlockSchema (E4-1)', () => {
  it('valide la séance canonique 2×2000 m @ allure semi', () => {
    expect(sessionBlocksSchema.parse(canonicalSession)).toEqual(canonicalSession);
  });

  it('survit à un aller-retour JSON (sérialisable — jsonb, P2 montre)', () => {
    const roundTrip = JSON.parse(JSON.stringify(canonicalSession));
    expect(sessionBlocksSchema.parse(roundTrip)).toEqual(canonicalSession);
  });

  it('accepte les séries imbriquées (série de séries)', () => {
    const nested: SessionBlock[] = [
      {
        kind: 'series',
        repetitions: 3,
        blocks: [
          {
            kind: 'series',
            repetitions: 4,
            blocks: [
              {
                kind: 'step',
                extent: { type: 'duration', seconds: 30 },
                target: { type: 'rpe', rpe: 9 },
              },
            ],
          },
        ],
      },
    ];
    expect(sessionBlocksSchema.parse(nested)).toEqual(nested);
  });

  it('rejette une bande d’allure inversée', () => {
    const invalid = [
      {
        kind: 'step',
        extent: { type: 'duration', seconds: 60 },
        target: { type: 'pace', minSecondsPerKm: 320, maxSecondsPerKm: 300 },
      },
    ];
    expect(sessionBlocksSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejette une zone FC hors 1–5 et un RPE hors 0–10', () => {
    const badZone = [
      {
        kind: 'step',
        extent: { type: 'duration', seconds: 60 },
        target: { type: 'hrZone', zone: 6 },
      },
    ];
    const badRpe = [
      { kind: 'step', extent: { type: 'duration', seconds: 60 }, target: { type: 'rpe', rpe: 11 } },
    ];
    expect(sessionBlocksSchema.safeParse(badZone).success).toBe(false);
    expect(sessionBlocksSchema.safeParse(badRpe).success).toBe(false);
  });
});
