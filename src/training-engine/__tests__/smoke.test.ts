import { ACWR_ZONES, LOAD_WINDOWS } from '../index';

describe('src/training-engine (fumée)', () => {
  it('expose les bornes ACWR de la charte (0,8–1,3 favorable)', () => {
    expect(ACWR_ZONES.optimalMin).toBe(0.8);
    expect(ACWR_ZONES.peakMin).toBe(1.3);
  });

  it('expose les fenêtres rolling 7/28 j (D16)', () => {
    expect(LOAD_WINDOWS).toEqual({ acuteDays: 7, chronicDays: 28 });
  });
});
