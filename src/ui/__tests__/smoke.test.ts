import { colors, PlaceholderScreen, theme } from '../index';

describe('src/ui (fumée)', () => {
  it('expose les tokens du design system', () => {
    expect(theme.colors.bg).toBe('#0B0E13');
    expect(colors.danger).toBe('#EF4444');
    expect(theme.radii.card).toBe(20);
  });

  it('expose les composants', () => {
    expect(typeof PlaceholderScreen).toBe('function');
  });
});
