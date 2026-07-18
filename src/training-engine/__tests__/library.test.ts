import { formatPace } from '@/i18n/format';
import type { SessionBlock } from '@/schemas';

import { buildLibrarySession, estimateSessionTotals, LIBRARY_SESSION_TYPES } from '../library';
import { RACE_INTENSITY, raceTargetPace } from '../physio';

/**
 * Cas canonique spec §7.3 (critère d'acceptation US-05/US-06) :
 * « 2 × 2000 m @ allure semi, récup 2 min » avec échauffement 15 min et
 * retour au calme 10 min → ≈ 9 km, ≈ 47 min, allure 4:59 /km (objectif
 * semi en 1h45), zone FC 88–92 % FCmax.
 */
describe('cas canonique 2×2000 m @ allure semi (spec §7.3)', () => {
  const targetTimeS = 105 * 60; // 1h45
  const pace = raceTargetPace({
    raceDistance: 'semi',
    ambition: 'chrono',
    targetTimeS,
  });

  const blocks: SessionBlock[] = [
    {
      kind: 'step',
      role: 'echauffement',
      extent: { type: 'duration', seconds: 15 * 60 },
      target: { type: 'hrZone', zone: 1 },
    },
    {
      kind: 'series',
      repetitions: 2,
      blocks: [
        {
          kind: 'step',
          role: 'travail',
          extent: { type: 'distance', meters: 2000 },
          target: { type: 'pace', minSecondsPerKm: pace!, maxSecondsPerKm: pace! },
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

  it('affiche une allure cible de 4:59 /km pour un objectif semi 1h45', () => {
    expect(pace).toBeDefined();
    expect(formatPace(pace!)).toBe('4:59 /km');
  });

  it('vise la bande FC 88–92 % FCmax sur semi', () => {
    expect(RACE_INTENSITY.semi.pctFcmax).toEqual([88, 92]);
  });

  it('estime ≈ 9 km et ≈ 47 min (VMA 16 km/h)', () => {
    const totals = estimateSessionTotals(blocks, 16);
    // Durée : 15 min éch. + 2 × (2000 m @ 4:59) + 1 récup 2 min + 10 min RAC.
    expect(totals.durationS / 60).toBeGreaterThanOrEqual(46);
    expect(totals.durationS / 60).toBeLessThanOrEqual(48);
    // Distance : ~4,7 km de footing encadrant + 4 km de travail.
    expect(totals.distanceM / 1000).toBeGreaterThanOrEqual(8.5);
    expect(totals.distanceM / 1000).toBeLessThanOrEqual(9.5);
  });

  it('la récupération de série compte répétitions − 1 fois', () => {
    const withoutRecovery = estimateSessionTotals(
      blocks.map((b) => (b.kind === 'series' ? { ...b, recovery: undefined } : b)),
      16,
    );
    const withRecovery = estimateSessionTotals(blocks, 16);
    expect(withRecovery.durationS - withoutRecovery.durationS).toBe(120);
  });
});

describe('estimateSessionTotals', () => {
  it('convertit une durée en distance avec la cible d’allure du bloc', () => {
    // 30 min @ 5:00 /km = 6 km exactement, quelle que soit la VMA.
    const totals = estimateSessionTotals(
      [
        {
          kind: 'step',
          extent: { type: 'duration', seconds: 1800 },
          target: { type: 'pace', minSecondsPerKm: 300, maxSecondsPerKm: 300 },
        },
      ],
      12,
    );
    expect(totals.distanceM).toBe(6000);
    expect(totals.durationS).toBe(1800);
  });

  it('retombe sur les vitesses de référence sans cible d’allure', () => {
    const totals = estimateSessionTotals([
      {
        kind: 'step',
        extent: { type: 'distance', meters: 5000 },
        target: { type: 'hrZone', zone: 2 },
      },
    ]);
    // 5 km à 10 km/h (référence facile sans VMA) = 30 min.
    expect(totals.durationS).toBe(1800);
  });

  it('gère les séries imbriquées (pyramide 2 × (2 × 400 m))', () => {
    const inner: SessionBlock = {
      kind: 'series',
      repetitions: 2,
      blocks: [
        {
          kind: 'step',
          extent: { type: 'distance', meters: 400 },
          target: { type: 'pace', minSecondsPerKm: 240, maxSecondsPerKm: 240 },
        },
      ],
    };
    const totals = estimateSessionTotals([{ kind: 'series', repetitions: 2, blocks: [inner] }]);
    expect(totals.distanceM).toBe(4 * 400);
    expect(totals.durationS).toBe(4 * 96);
  });
});

describe('buildLibrarySession', () => {
  it('couvre les 7 types de la bibliothèque', () => {
    expect(LIBRARY_SESSION_TYPES).toHaveLength(7);
    for (const type of LIBRARY_SESSION_TYPES) {
      const spec = buildLibrarySession(type, 15);
      expect(spec.sessionType).toBe(type);
      expect(spec.blocks.length).toBeGreaterThan(0);
    }
  });

  it('propose un fartlek structuré en alternances au RPE', () => {
    const spec = buildLibrarySession('fartlek');
    const series = spec.blocks.find((b) => b.kind === 'series');
    expect(series).toBeDefined();
    expect(series?.kind === 'series' && series.recovery !== undefined).toBe(true);
  });
});
