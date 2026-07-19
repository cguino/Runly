import type { SessionBlock, SessionStep, StepRole } from '@/schemas';

/**
 * Saisie du builder (E4-4) — parsing pur des champs texte vers le modèle de
 * blocs (testé unitairement, aucune règle métier : uniquement de la
 * conversion de formats français).
 */

/** « 4:59 », « 4'59 » ou « 5 » (minutes rondes) → secondes par km. */
export function parsePaceInput(text: string): number | undefined {
  const trimmed = text.trim();
  const withSeconds = /^(\d{1,2})[:'](\d{1,2})$/.exec(trimmed);
  if (withSeconds !== null) {
    const minutes = Number(withSeconds[1]);
    const seconds = Number(withSeconds[2]);
    if (seconds >= 60) {
      return undefined;
    }
    const total = minutes * 60 + seconds;
    return total > 0 ? total : undefined;
  }
  if (/^\d{1,2}$/.test(trimmed)) {
    const minutes = Number(trimmed);
    return minutes > 0 ? minutes * 60 : undefined;
  }
  return undefined;
}

/** « 12 » ou « 1,5 » (virgule française ou point) → minutes → secondes. */
export function parseMinutesInput(text: string): number | undefined {
  const trimmed = text.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(trimmed)) {
    return undefined;
  }
  const seconds = Math.round(Number(trimmed) * 60);
  return seconds > 0 ? seconds : undefined;
}

/** « 2000 » → mètres entiers positifs. */
export function parseMetersInput(text: string): number | undefined {
  const trimmed = text.trim();
  if (!/^\d{2,6}$/.test(trimmed)) {
    return undefined;
  }
  const meters = Number(trimmed);
  return meters > 0 ? meters : undefined;
}

/** Brouillon d'un bloc du builder : 1 répétition = step, sinon série. */
export type BlockDraft = {
  repetitions: number;
  role: StepRole;
  extentType: 'duration' | 'distance';
  /** Durée en minutes ou distance en mètres, telle que saisie. */
  extentValue: string;
  targetType: 'pace' | 'hrZone' | 'rpe' | 'none';
  paceMin: string;
  paceMax: string;
  hrZone: number;
  rpe: number;
  /** Récup entre répétitions en minutes — vide = aucune (séries seulement). */
  recoveryMinutes: string;
};

function draftExtent(draft: BlockDraft): SessionStep['extent'] | undefined {
  if (draft.extentType === 'duration') {
    const seconds = parseMinutesInput(draft.extentValue);
    return seconds === undefined ? undefined : { type: 'duration', seconds };
  }
  const meters = parseMetersInput(draft.extentValue);
  return meters === undefined ? undefined : { type: 'distance', meters };
}

function draftTarget(draft: BlockDraft): SessionStep['target'] | undefined {
  switch (draft.targetType) {
    case 'pace': {
      const min = parsePaceInput(draft.paceMin);
      const max = draft.paceMax.trim() === '' ? min : parsePaceInput(draft.paceMax);
      if (min === undefined || max === undefined) {
        return undefined;
      }
      // Saisie tolérante : la bande est remise dans l'ordre (min ≤ max).
      return {
        type: 'pace',
        minSecondsPerKm: Math.min(min, max),
        maxSecondsPerKm: Math.max(min, max),
      };
    }
    case 'hrZone':
      return { type: 'hrZone', zone: draft.hrZone };
    case 'rpe':
      return { type: 'rpe', rpe: draft.rpe };
    case 'none':
      return { type: 'none' };
  }
}

/**
 * Convertit un brouillon en bloc du modèle (E4-1) : step simple, ou série
 * `répétitions × step` avec récup optionnelle. `undefined` si la saisie est
 * incomplète — le CTA du sheet reste désactivé.
 */
export function draftToBlock(draft: BlockDraft): SessionBlock | undefined {
  const extent = draftExtent(draft);
  const target = draftTarget(draft);
  if (extent === undefined || target === undefined) {
    return undefined;
  }
  const step: SessionStep = { kind: 'step', extent, target, role: draft.role };
  if (draft.repetitions <= 1) {
    return step;
  }
  const recoverySeconds =
    draft.recoveryMinutes.trim() === '' ? undefined : parseMinutesInput(draft.recoveryMinutes);
  if (draft.recoveryMinutes.trim() !== '' && recoverySeconds === undefined) {
    return undefined;
  }
  return {
    kind: 'series',
    repetitions: draft.repetitions,
    blocks: [{ ...step, role: 'travail' }],
    ...(recoverySeconds !== undefined
      ? {
          recovery: {
            kind: 'step',
            role: 'recuperation',
            extent: { type: 'duration', seconds: recoverySeconds },
            target: { type: 'none' },
          } satisfies SessionStep,
        }
      : {}),
  };
}
