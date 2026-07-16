import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, shadows, spacing } from './theme';

type ButtonVariant = 'primary' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Icône textuelle optionnelle (ex. « ▶ »). */
  icon?: string;
  disabled?: boolean;
};

/**
 * CTA (charte §4) : pleine largeur, pill 28 px, fond `action`, texte sombre
 * 700, glow léger. Secondaire : ghost (transparent, bordure, texte muted).
 * Un seul CTA primaire par écran. Touch target ≥ 48 px (charte §6).
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.ghost,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={isPrimary ? styles.primaryLabel : styles.ghostLabel}>
        {icon ? `${icon}  ${label}` : label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radii.cta,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenGutter,
    paddingVertical: 14,
    alignSelf: 'stretch',
  },
  primary: {
    backgroundColor: colors.action,
    ...shadows.ctaGlow,
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
  primaryLabel: {
    color: colors.onAction,
    fontSize: 16,
    fontWeight: '700',
  },
  ghostLabel: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
});
