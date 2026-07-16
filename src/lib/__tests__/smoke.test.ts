import { clamp, roundTo } from '../index';

describe('src/lib (fumée)', () => {
  it('clamp borne dans l’intervalle', () => {
    expect(clamp(1.7, 0.6, 1.6)).toBe(1.6);
    expect(clamp(1.12, 0.6, 1.6)).toBe(1.12);
    expect(() => clamp(1, 2, 0)).toThrow(RangeError);
  });

  it('roundTo arrondit à la décimale demandée', () => {
    expect(roundTo(1.1234, 2)).toBe(1.12);
  });
});
