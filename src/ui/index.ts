/**
 * `src/ui` — tokens du design system + composants signatures (Lot 2).
 * Contrainte de frontière : ce module n'importe jamais `src/features`.
 * Revue visuelle : galerie interne (route `/ui-gallery`, dev).
 */
export { colors, radii, shadows, spacing, theme, typography } from './theme';
export type { Theme } from './theme';
export { PlaceholderScreen } from './PlaceholderScreen';
export { Pill } from './Pill';
export type { PillVariant } from './Pill';
export { Gauge } from './Gauge';
export { Label } from './Label';
export { Button } from './Button';
export { Card } from './Card';
export { Chip } from './Chip';
export { StatCard, StatCardTrio } from './StatCard';
export { TimelineStepper } from './TimelineStepper';
export type { TimelineStep, TimelineStepState } from './TimelineStepper';
export { WeeklyChecklist } from './WeeklyChecklist';
export type { WeeklyChecklistItem } from './WeeklyChecklist';
export { BottomSheet } from './BottomSheet';
export { TextField } from './TextField';
