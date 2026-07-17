import {
  BottomSheet,
  Button,
  Card,
  Chip,
  colors,
  Gauge,
  Label,
  Pill,
  PlaceholderScreen,
  StatCard,
  StatCardTrio,
  TextField,
  theme,
  TimelineStepper,
  WeeklyChecklist,
} from '../index';

describe('src/ui (fumée)', () => {
  it('expose les tokens du design system', () => {
    expect(theme.colors.bg).toBe('#0B0E13');
    expect(colors.danger).toBe('#EF4444');
    expect(theme.radii.card).toBe(20);
    expect(theme.shadows.ctaGlow.shadowOpacity).toBe(0.25);
  });

  it('expose les composants signatures du Lot 2', () => {
    for (const component of [
      PlaceholderScreen,
      Pill,
      Gauge,
      Label,
      Button,
      Card,
      Chip,
      StatCard,
      StatCardTrio,
      TimelineStepper,
      WeeklyChecklist,
      BottomSheet,
      TextField,
    ]) {
      expect(typeof component).toBe('function');
    }
  });
});
