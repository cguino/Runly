import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ACWR_ZONES } from '@/training-engine';

import { colors, spacing, typography } from './theme';

/**
 * Jauge de charge ACWR (charte §4) — élément identitaire. Demi-cercle
 * 3 segments : bleu `infoLoad` (0,6→0,8 sous-charge), vert `positive`
 * (0,8→1,3 favorable), rouge `danger` (1,3→1,6 pic — usage réservé).
 * Aiguille blanche épaisse animée (Reanimated), pivot central.
 * Composant purement graphique : les textes (valeur formatée « 1,12 »,
 * pill de statut) arrivent déjà traduits/formatés des features
 * (règle transverse n°3) ; la couleur n'est jamais le seul vecteur
 * (charte §6) — la pill texte vit sous la jauge, dans `LoadGaugeCard`.
 */

const STROKE_WIDTH = 22;
const NEEDLE_THICKNESS = 6;
const PIVOT_RADIUS = 9;
const SEGMENT_GAP_DEG = 2;
const FORECAST_TICK_WIDTH = 3;
const NEEDLE_ANIMATION_MS = 700;

const GAUGE_MIN = ACWR_ZONES.underloadMin;
const GAUGE_MAX = ACWR_ZONES.max;
const GAUGE_SPAN = GAUGE_MAX - GAUGE_MIN;

/** Angle Skia (0° à 3 h, sens horaire) d'une valeur ACWR sur le demi-cercle. */
function angleOf(value: number): number {
  const clamped = Math.min(Math.max(value, GAUGE_MIN), GAUGE_MAX);
  return 180 + ((clamped - GAUGE_MIN) / GAUGE_SPAN) * 180;
}

type GaugeProps = {
  /** ACWR courant ; `undefined` (calibration, chronique vide) → pas d'aiguille. */
  acwr?: number;
  /** Valeur affichée en display, déjà formatée (« 1,12 » — `formatDecimal`). */
  valueLabel: string;
  /** ACWR prévisionnel à J+7 (E7-3) : repère discret sur l'arc. */
  forecastAcwr?: number;
  /** Jauge estompée (état calibration : affichage dédié). */
  dimmed?: boolean;
  /** Largeur du composant (le demi-cercle s'y inscrit). */
  size?: number;
  accessibilityLabel?: string;
};

export function Gauge({
  acwr,
  valueLabel,
  forecastAcwr,
  dimmed = false,
  size = 260,
  accessibilityLabel,
}: GaugeProps) {
  const canvasHeight = size / 2 + PIVOT_RADIUS;
  const center = { x: size / 2, y: size / 2 };
  const needleLength = size / 2 - STROKE_WIDTH - 10;

  const segments = useMemo(() => {
    const rect = Skia.XYWHRect(
      STROKE_WIDTH / 2,
      STROKE_WIDTH / 2,
      size - STROKE_WIDTH,
      size - STROKE_WIDTH,
    );
    const arc = (from: number, to: number) => {
      const start = angleOf(from) + SEGMENT_GAP_DEG / 2;
      const sweep = angleOf(to) - angleOf(from) - SEGMENT_GAP_DEG;
      const path = Skia.Path.Make();
      path.addArc(rect, start, sweep);
      return path;
    };
    return [
      { path: arc(GAUGE_MIN, ACWR_ZONES.optimalMin), color: colors.infoLoad },
      { path: arc(ACWR_ZONES.optimalMin, ACWR_ZONES.peakMin), color: colors.positive },
      { path: arc(ACWR_ZONES.peakMin, GAUGE_MAX), color: colors.danger },
    ];
  }, [size]);

  const forecastTick = useMemo(() => {
    if (forecastAcwr === undefined) {
      return undefined;
    }
    const angleRad = (angleOf(forecastAcwr) * Math.PI) / 180;
    const inner = size / 2 - STROKE_WIDTH * 1.9;
    const outer = size / 2 - STROKE_WIDTH * 1.2;
    const path = Skia.Path.Make();
    path.moveTo(center.x + inner * Math.cos(angleRad), center.y + inner * Math.sin(angleRad));
    path.lineTo(center.x + outer * Math.cos(angleRad), center.y + outer * Math.sin(angleRad));
    return path;
  }, [forecastAcwr, size, center.x, center.y]);

  // Aiguille : rotation animée Reanimated ; repos à gauche (180°) sans valeur.
  const rotation = useSharedValue(angleOf(acwr ?? GAUGE_MIN));
  useEffect(() => {
    rotation.value = withTiming(angleOf(acwr ?? GAUGE_MIN), { duration: NEEDLE_ANIMATION_MS });
  }, [acwr, rotation]);
  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[styles.container, dimmed && styles.dimmed]}
    >
      <View style={{ width: size, height: canvasHeight }}>
        <Canvas style={{ width: size, height: canvasHeight }}>
          {segments.map((segment, index) => (
            <Path
              key={index}
              path={segment.path}
              style="stroke"
              strokeWidth={STROKE_WIDTH}
              color={segment.color}
            />
          ))}
          {forecastTick !== undefined && (
            <Path
              path={forecastTick}
              style="stroke"
              strokeWidth={FORECAST_TICK_WIDTH}
              strokeCap="round"
              color={colors.textMuted}
            />
          )}
        </Canvas>
        {acwr !== undefined && (
          <Animated.View
            style={[
              styles.needle,
              {
                left: center.x,
                top: center.y - NEEDLE_THICKNESS / 2,
                width: needleLength,
              },
              needleStyle,
            ]}
          />
        )}
        <View
          style={[
            styles.pivot,
            { left: center.x - PIVOT_RADIUS, top: center.y - PIVOT_RADIUS },
          ]}
        />
      </View>
      <Text style={styles.value}>{valueLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.cardGap,
  },
  dimmed: {
    opacity: 0.45,
  },
  needle: {
    position: 'absolute',
    height: NEEDLE_THICKNESS,
    borderRadius: NEEDLE_THICKNESS / 2,
    backgroundColor: colors.text,
    transformOrigin: 'left center',
  },
  pivot: {
    position: 'absolute',
    width: PIVOT_RADIUS * 2,
    height: PIVOT_RADIUS * 2,
    borderRadius: PIVOT_RADIUS,
    backgroundColor: colors.text,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  value: {
    color: colors.text,
    fontSize: typography.display.fontSize,
    fontWeight: typography.display.fontWeight,
    fontVariant: ['tabular-nums'],
  },
});
