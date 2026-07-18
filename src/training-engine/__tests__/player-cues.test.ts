import type { BlockTarget } from '@/schemas';

import {
  PACE_BAR_TARGET_ZONE,
  PACE_CUE_SOFT_MARGIN_S,
  paceCue,
  paceCursorFraction,
} from '../player-cues';

// Bande cible : 4:45–5:00 /km.
const TARGET: BlockTarget = { type: 'pace', minSecondsPerKm: 285, maxSecondsPerKm: 300 };

describe('paceCue (E5-3) — état de coaching', () => {
  it('dans la cible quand l’allure est dans la bande', () => {
    expect(paceCue(TARGET, 285)).toBe('in_target');
    expect(paceCue(TARGET, 292)).toBe('in_target');
    expect(paceCue(TARGET, 300)).toBe('in_target');
  });

  it('« un poil » dans la marge, « trop » au-delà', () => {
    expect(paceCue(TARGET, 285 - 1)).toBe('slightly_fast');
    expect(paceCue(TARGET, 285 - PACE_CUE_SOFT_MARGIN_S - 1)).toBe('too_fast');
    expect(paceCue(TARGET, 300 + 1)).toBe('slightly_slow');
    expect(paceCue(TARGET, 300 + PACE_CUE_SOFT_MARGIN_S + 1)).toBe('too_slow');
  });

  it('pas de guidance sans cible d’allure (D6) ni sans signal', () => {
    expect(paceCue({ type: 'hrZone', zone: 2 }, 290)).toBe('no_target');
    expect(paceCue({ type: 'rpe', rpe: 9 }, 290)).toBe('no_target');
    expect(paceCue({ type: 'none' }, 290)).toBe('no_target');
    expect(paceCue(TARGET, undefined)).toBe('no_signal');
  });
});

describe('paceCursorFraction (E5-3) — curseur de la barre d’allure', () => {
  const [zoneStart, zoneEnd] = PACE_BAR_TARGET_ZONE;

  it('dans la bande : interpolé dans la zone verte centrale', () => {
    expect(paceCursorFraction(TARGET, 300)).toBeCloseTo(zoneStart, 5);
    expect(paceCursorFraction(TARGET, 285)).toBeCloseTo(zoneEnd, 5);
    expect(paceCursorFraction(TARGET, 292.5)).toBeCloseTo((zoneStart + zoneEnd) / 2, 5);
  });

  it('hors bande : progresse vers les bords, borné 0–1', () => {
    const slow = paceCursorFraction(TARGET, 310);
    expect(slow).toBeLessThan(zoneStart);
    expect(slow).toBeGreaterThan(0);
    expect(paceCursorFraction(TARGET, 1000)).toBe(0);
    const fast = paceCursorFraction(TARGET, 275);
    expect(fast).toBeGreaterThan(zoneEnd);
    expect(fast).toBeLessThan(1);
    expect(paceCursorFraction(TARGET, 100)).toBe(1);
  });

  it('bande dégénérée (min = max) : centre de la zone', () => {
    const flat: BlockTarget = { type: 'pace', minSecondsPerKm: 300, maxSecondsPerKm: 300 };
    expect(paceCursorFraction(flat, 300)).toBeCloseTo((zoneStart + zoneEnd) / 2, 5);
  });

  it('undefined sans cible d’allure ou sans allure', () => {
    expect(paceCursorFraction({ type: 'none' }, 300)).toBeUndefined();
    expect(paceCursorFraction(TARGET, undefined)).toBeUndefined();
  });
});
