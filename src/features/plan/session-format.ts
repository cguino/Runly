import { formatDistanceKm, formatDuration, formatPace } from '@/i18n';
import type { BlockTarget, SessionBlock, SessionStep, SessionType } from '@/schemas';

/**
 * Formatage présentation des séances planifiées (Lot 8) — aucune règle
 * métier : uniquement de la mise en texte via i18n + helpers de format.
 * `t` est la fonction de traduction de react-i18next (passée par l'écran).
 */

export type Translate = (key: string, options?: Record<string, unknown>) => string;

export function sessionTypeLabel(t: Translate, sessionType: SessionType): string {
  return t(`sessionTypes.${sessionType}`);
}

/** Allure sans unité : 299 → « 4:59 » (pour les bandes « 4:30–4:59 /km »). */
function paceNoUnit(secondsPerKm: number): string {
  const total = Math.round(secondsPerKm);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function targetLabel(t: Translate, target: BlockTarget): string {
  switch (target.type) {
    case 'pace':
      return `${paceNoUnit(target.minSecondsPerKm)}–${formatPace(target.maxSecondsPerKm)}`;
    case 'hrZone':
      return t('blocks.hrZone', { n: target.zone });
    case 'rpe':
      return t('blocks.rpeTarget', { value: target.rpe });
    case 'none':
      return t('blocks.freePace');
  }
}

function extentLabel(step: SessionStep): string {
  return step.extent.type === 'duration'
    ? formatDuration(step.extent.seconds)
    : formatDistanceKm(step.extent.meters);
}

function roleLabel(t: Translate, step: SessionStep): string {
  switch (step.role) {
    case 'echauffement':
      return t('blocks.warmup');
    case 'retour_calme':
      return t('blocks.cooldown');
    case 'recuperation':
      return t('blocks.recovery');
    default:
      return t('blocks.work');
  }
}

/** Une ligne lisible par bloc de premier niveau (détail prévu, E8-5). */
export function blockLine(t: Translate, block: SessionBlock): string {
  if (block.kind === 'step') {
    return `${roleLabel(t, block)} · ${extentLabel(block)} · ${targetLabel(t, block.target)}`;
  }
  const first = block.blocks[0];
  const inner =
    first === undefined
      ? ''
      : first.kind === 'step'
        ? `${extentLabel(first)} · ${targetLabel(t, first.target)}`
        : blockLine(t, first);
  const series = t('blocks.series', { reps: block.repetitions, content: inner });
  if (block.recovery === undefined) {
    return series;
  }
  return `${series} · ${t('blocks.recoveryBetween', { duration: extentLabel(block.recovery) })}`;
}

export function blockLines(t: Translate, blocks: SessionBlock[]): string[] {
  return blocks.map((block) => blockLine(t, block));
}
