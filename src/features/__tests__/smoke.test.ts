import { FEATURE_DOMAINS } from '../index';

describe('src/features (fumée)', () => {
  it('déclare les six domaines du plan §2', () => {
    expect(FEATURE_DOMAINS).toHaveLength(6);
    expect(FEATURE_DOMAINS).toContain('player');
  });
});
