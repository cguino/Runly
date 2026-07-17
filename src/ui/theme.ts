/**
 * Tokens du design system Runly (`design-system-runly.md` v1.1).
 * Règle transverse n°4 : aucune couleur/taille/rayon en dur ailleurs —
 * uniquement ces tokens. Le rouge `danger` est réservé à la jauge > 1,3
 * et aux alertes de pic, rien d'autre.
 */
export const colors = {
  bg: '#0B0E13',
  /** Fond de la tab bar : `bg` à 96 % (charte §4). */
  bgTranslucent: 'rgba(11,14,19,.96)',
  /** Voile derrière les bottom sheets/modales (non spécifié par la charte — à valider en revue visuelle). */
  overlay: 'rgba(0,0,0,.55)',
  surface: '#171C24',
  surface2: '#1E2530',
  border: '#252D3A',
  text: '#F2F5F9',
  textMuted: '#8A94A6',
  textFaint: '#5B6472',
  action: '#38BDF8',
  onAction: '#04121C',
  positive: '#4ADE80',
  positiveBg: 'rgba(74,222,128,.12)',
  danger: '#EF4444',
  infoLoad: '#3B82F6',
  warn: '#FBBF24',
  warnBg: 'rgba(251,191,36,.12)',
} as const;

export const radii = {
  card: 20,
  cardNested: 14,
  pill: 999,
  cta: 28,
} as const;

export const spacing = {
  screenGutter: 20,
  cardPadding: 16,
  cardGap: 12,
} as const;

export const typography = {
  timerGiant: { fontSize: 104, fontWeight: '800' },
  display: { fontSize: 40, fontWeight: '800' },
  h1: { fontSize: 28, fontWeight: '700' },
  h2: { fontSize: 20, fontWeight: '700' },
  body: { fontSize: 16, fontWeight: '400' },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
  caption: { fontSize: 12, fontWeight: '400' },
} as const;

/**
 * Ombres : quasi absentes en dark mode — la hiérarchie vient des niveaux de
 * surface. Seule exception : glow léger sous les CTA bleus (charte §3).
 */
export const shadows = {
  ctaGlow: {
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    shadowOpacity: 0.25,
    elevation: 8,
  },
} as const;

export const theme = { colors, radii, spacing, typography, shadows } as const;

export type Theme = typeof theme;
