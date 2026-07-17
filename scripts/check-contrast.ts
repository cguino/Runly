/**
 * Check des contrastes AA sur les paires de tokens du design system
 * (vérification Lot 2). Usage : `yarn check:contrast` — sort en erreur si
 * une paire requise passe sous son seuil.
 *
 * Seuils WCAG : 4,5 (texte normal) ; 3,0 (texte large ≥ 18 pt / 14 pt gras —
 * et infos critiques du player qui visent AAA large, charte §6).
 */
import { tokenContrast } from '../src/lib/contrast';
import { colors } from '../src/ui/theme';

type Pair = {
  label: string;
  fg: string;
  bg: string;
  /** Fond opaque sous un bg alpha (pills). */
  under?: string;
  min: number;
  note?: string;
  /** Écart déjà remonté : rétrogradé en warning (jamais utilisé pour masquer un nouveau KO). */
  knownIssue?: string;
};

const PAIRS: Pair[] = [
  { label: 'text / bg', fg: colors.text, bg: colors.bg, min: 4.5 },
  { label: 'text / surface', fg: colors.text, bg: colors.surface, min: 4.5 },
  { label: 'text / surface2', fg: colors.text, bg: colors.surface2, min: 4.5 },
  { label: 'textMuted / bg', fg: colors.textMuted, bg: colors.bg, min: 4.5 },
  { label: 'textMuted / surface', fg: colors.textMuted, bg: colors.surface, min: 4.5 },
  { label: 'textMuted / surface2', fg: colors.textMuted, bg: colors.surface2, min: 4.5 },
  {
    label: 'textFaint / bg',
    fg: colors.textFaint,
    bg: colors.bg,
    min: 3,
    note: 'AA large uniquement — textFaint est réservé au fond bg (arbitrage 17/07/2026) ; dans les cartes : textMuted',
  },
  { label: 'onAction / action (CTA)', fg: colors.onAction, bg: colors.action, min: 4.5 },
  { label: 'action / bg (liens, tab active)', fg: colors.action, bg: colors.bg, min: 4.5 },
  {
    label: 'positive / positiveBg sur surface',
    fg: colors.positive,
    bg: colors.positiveBg,
    under: colors.surface,
    min: 4.5,
  },
  {
    label: 'warn / warnBg sur surface',
    fg: colors.warn,
    bg: colors.warnBg,
    under: colors.surface,
    min: 4.5,
  },
  { label: 'positive / bg', fg: colors.positive, bg: colors.bg, min: 4.5 },
  { label: 'warn / surface', fg: colors.warn, bg: colors.surface, min: 4.5 },
  {
    label: 'danger / surface',
    fg: colors.danger,
    bg: colors.surface,
    min: 3,
    note: 'signal rare, toujours accompagné de texte (la couleur n’est jamais le seul vecteur, charte §6)',
  },
  {
    label: 'infoLoad / surface (jauge)',
    fg: colors.infoLoad,
    bg: colors.surface,
    min: 3,
    note: 'segment de jauge (graphique, non textuel)',
  },
  {
    label: 'onAction / danger (pill pic, Lot 7)',
    fg: colors.onAction,
    bg: colors.danger,
    min: 4.5,
  },
  {
    label: 'onAction / infoLoad (pill sous-charge)',
    fg: colors.onAction,
    bg: colors.infoLoad,
    min: 4.5,
  },
];

let failed = false;
for (const pair of PAIRS) {
  const ratio = tokenContrast(pair.fg, pair.bg, pair.under);
  const ok = ratio >= pair.min;
  let status = 'OK  ';
  if (!ok && pair.knownIssue) {
    status = 'WARN';
  } else if (!ok) {
    status = 'KO  ';
    failed = true;
  }
  const noteSuffix = pair.knownIssue
    ? `  (${pair.knownIssue})`
    : pair.note
      ? `  (${pair.note})`
      : '';
  console.log(
    `${status} ${pair.label.padEnd(36)} ${ratio.toFixed(2).padStart(5)} (min ${pair.min})${noteSuffix}`,
  );
}

if (failed) {
  console.error('\nDes paires de tokens passent sous le seuil AA requis.');
  process.exit(1);
}
console.log('\nContrastes AA : toutes les paires requises passent.');
