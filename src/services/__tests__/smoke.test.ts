import { initMonitoring } from '../index';

describe('src/services (fumée)', () => {
  it('expose initMonitoring, inoffensif sans DSN (D10 : crash-only)', () => {
    expect(typeof initMonitoring).toBe('function');
    expect(() => initMonitoring()).not.toThrow();
  });
});
