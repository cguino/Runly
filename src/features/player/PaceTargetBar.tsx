import { StyleSheet, View } from 'react-native';

import type { BlockTarget } from '@/schemas';
import { PACE_BAR_TARGET_ZONE, paceCursorFraction } from '@/training-engine';
import { colors, radii } from '@/ui';

/**
 * Barre d'allure cible (charte §4) : zone verte centrale + curseur point
 * blanc. La position vient de `paceCursorFraction` (fonction pure) ; sans
 * allure mesurable (signal perdu, départ), le curseur est masqué.
 */

const BAR_HEIGHT = 10;
const CURSOR_SIZE = 16;

export function PaceTargetBar({
  target,
  smoothedPaceSecPerKm,
}: {
  target: BlockTarget;
  smoothedPaceSecPerKm?: number;
}) {
  const fraction = paceCursorFraction(target, smoothedPaceSecPerKm);
  const [zoneStart, zoneEnd] = PACE_BAR_TARGET_ZONE;
  return (
    <View style={styles.bar}>
      <View
        style={[
          styles.zone,
          { left: `${zoneStart * 100}%`, width: `${(zoneEnd - zoneStart) * 100}%` },
        ]}
      />
      {fraction === undefined ? null : (
        <View style={[styles.cursor, { left: `${fraction * 100}%` }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: BAR_HEIGHT,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
    overflow: 'visible',
    justifyContent: 'center',
  },
  zone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: radii.pill,
    backgroundColor: colors.positive,
    opacity: 0.45,
  },
  cursor: {
    position: 'absolute',
    width: CURSOR_SIZE,
    height: CURSOR_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.text,
    marginLeft: -CURSOR_SIZE / 2,
    top: (BAR_HEIGHT - CURSOR_SIZE) / 2,
  },
});
