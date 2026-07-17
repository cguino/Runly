import type { BlockExtent, BlockTarget, SessionBlock } from '@/schemas';
import type { FlatStep } from '@/training-engine';
import { stepDistanceTargetM, stepDurationMs } from '@/training-engine';
import i18n, { formatDistanceKm, formatPace } from '@/i18n';

/**
 * Formats d'affichage et d'annonce du player (E5-3/E5-4) — pas de règle
 * métier ici : uniquement de la présentation, strings via `src/i18n` (D7).
 */

/** Espace fine insécable entre valeur et unité (comme `src/i18n/format`). */
const NNBSP = ' ';

/** Horloge `m:ss` / `h:mm:ss` (timer géant, « sur 10:00 »). */
export function formatClock(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mmss = `${minutes}:${String(seconds).padStart(2, '0')}`;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : mmss;
}

/** Valeur principale du timer géant : temps restant ou distance restante. */
export function stepCountdownLabel(step: FlatStep, elapsedMs: number, distanceM: number): string {
  const durationMs = stepDurationMs(step.step);
  if (durationMs !== undefined) {
    return formatClock((durationMs - elapsedMs) / 1000);
  }
  const targetM = stepDistanceTargetM(step.step) ?? 0;
  const remaining = Math.max(0, Math.round(targetM - distanceM));
  return remaining >= 1000 ? formatDistanceKm(remaining) : `${remaining}${NNBSP}m`;
}

/** Extent d'un step : « 10:00 » ou « 2 km » (sous-texte « sur … »). */
export function extentLabel(extent: BlockExtent): string {
  if (extent.type === 'duration') {
    return formatClock(extent.seconds);
  }
  return extent.meters >= 1000
    ? formatDistanceKm(extent.meters)
    : `${Math.round(extent.meters)}${NNBSP}m`;
}

/** Cible affichée : « 4:45–5:00 /km », « Zone 2 », « RPE 9 », « Allure libre ». */
export function targetLabel(target: BlockTarget): string {
  switch (target.type) {
    case 'pace': {
      const min = formatPace(target.minSecondsPerKm).replace(/\s\/km$/u, '');
      return `${min}–${formatPace(target.maxSecondsPerKm)}`;
    }
    case 'hrZone':
      return i18n.t('player.target.hrZone', { zone: target.zone });
    case 'rpe':
      return i18n.t('player.target.rpe', { rpe: target.rpe });
    case 'none':
      return i18n.t('player.target.none');
  }
}

/** Libellé de tête du step : « Série 1 / 2 » ou le rôle (« Échauffement »). */
export function stepHeading(flat: FlatStep): string {
  if (flat.series !== undefined && !flat.isSeriesRecovery) {
    return i18n.t('player.seriesLabel', {
      rep: flat.series.repetition,
      total: flat.series.totalRepetitions,
    });
  }
  const role = flat.isSeriesRecovery ? 'recuperation' : (flat.step.role ?? 'travail');
  return i18n.t(`player.stepRoles.${role}`);
}

/** Ligne « PROCHAIN » et notifications : « Travail · 10:00 @ 4:45–5:00 /km ». */
export function stepSummary(flat: FlatStep): string {
  return `${stepHeading(flat)} · ${extentLabel(flat.step.extent)} @ ${targetLabel(flat.step.target)}`;
}

/** Brief de séance (pré-start, mode carte E5-6) : une ligne par bloc. */
export function blocksToBrief(blocks: SessionBlock[]): { title: string; subtitle?: string }[] {
  return blocks.map((block) => {
    if (block.kind === 'step') {
      return {
        title: i18n.t(`player.stepRoles.${block.role ?? 'travail'}`),
        subtitle: `${extentLabel(block.extent)} @ ${targetLabel(block.target)}`,
      };
    }
    const first = block.blocks[0];
    const firstExtent =
      first !== undefined && first.kind === 'step' ? extentLabel(first.extent) : '';
    const firstTarget =
      first !== undefined && first.kind === 'step' ? ` @ ${targetLabel(first.target)}` : '';
    const recovery =
      block.recovery === undefined
        ? ''
        : ` · ${i18n.t('player.recoverySuffix', { extent: extentLabel(block.recovery.extent) })}`;
    return {
      title: i18n.t('player.seriesSummary', { reps: block.repetitions, extent: firstExtent }),
      subtitle: `${firstTarget.replace(/^ @ /u, '@ ')}${recovery}`,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Textes parlés (TTS E5-4) — chiffres énoncés en toutes lettres.      */
/* ------------------------------------------------------------------ */

function speechDuration(seconds: number): string {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes === 0) {
    return i18n.t('player.speech.seconds', { count: rest });
  }
  if (rest === 0) {
    return i18n.t('player.speech.minutes', { count: minutes });
  }
  return i18n.t('player.speech.minutesSeconds', { minutes, seconds: rest });
}

function speechPaceValue(secondsPerKm: number): string {
  const total = Math.round(secondsPerKm);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0
    ? i18n.t('player.speech.minutes', { count: minutes })
    : i18n.t('player.speech.minutesSeconds', { minutes, seconds: rest });
}

function speechTarget(target: BlockTarget): string {
  switch (target.type) {
    case 'pace':
      return i18n.t('player.speech.paceBand', {
        min: speechPaceValue(target.minSecondsPerKm),
        max: speechPaceValue(target.maxSecondsPerKm),
      });
    case 'hrZone':
      return i18n.t('player.speech.hrZone', { zone: target.zone });
    case 'rpe':
      return i18n.t('player.speech.rpe', { rpe: target.rpe });
    case 'none':
      return i18n.t('player.speech.freePace');
  }
}

function speechExtent(extent: BlockExtent): string {
  if (extent.type === 'duration') {
    return speechDuration(extent.seconds);
  }
  if (extent.meters >= 1000 && extent.meters % 100 === 0) {
    const km = extent.meters / 1000;
    return i18n.t('player.speech.kilometers', {
      count: Number.isInteger(km) ? km : Number(km.toFixed(1)),
    });
  }
  return i18n.t('player.speech.meters', { count: Math.round(extent.meters) });
}

/** Description parlée d'un step : « Série 1 sur 2 · 10 minutes, allure 4 minutes 45 à 5 minutes au kilomètre ». */
export function speechForStep(flat: FlatStep): string {
  return `${stepHeading(flat)}. ${speechExtent(flat.step.extent)}, ${speechTarget(flat.step.target)}.`;
}
