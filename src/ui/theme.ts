/**
 * Tokens du design system Runly (`design-system-runly.md` v1.1).
 * Règle transverse n°4 : aucune couleur/taille/rayon en dur ailleurs —
 * uniquement ces tokens. Le rouge `danger` est réservé à la jauge > 1,3
 * et aux alertes de pic, rien d'autre.
 */
export const colors = {
  bg: '#0B0E13',
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

export const theme = { colors, radii, spacing, typography } as const;

export type Theme = typeof theme;
