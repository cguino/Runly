import type { BlockTarget, SessionBlock, SessionStep, SessionType } from '@/schemas';

import { paceFromVma } from './physio';

/**
 * Templates de séances du moteur de plan (E3-2) — structures en blocs
 * (`SessionBlock`) par type. Cibles : bande d'allure quand la VMA est
 * connue, sinon zone FC (efforts continus) ou RPE (fractionné).
 * Réglages produit à confronter à la validation coach (G3).
 */

/** Bandes d'intensité en % VMA par usage (bornes basses/hautes). */
export const INTENSITY_PCT_VMA: Record<
  Exclude<SessionType, 'fartlek'>,
  readonly [number, number]
> = {
  ef: [65, 75],
  sortie_longue: [62, 72],
  tempo: [78, 84],
  seuil: [85, 90],
  vma_court: [100, 105],
  recuperation: [55, 65],
};

function paceBand(vmaKmh: number, [minPct, maxPct]: readonly [number, number]): BlockTarget {
  // % VMA élevé = plus rapide = moins de s/km → la borne min de l'allure vient du % max.
  return {
    type: 'pace',
    minSecondsPerKm: Math.round(paceFromVma(vmaKmh, maxPct)),
    maxSecondsPerKm: Math.round(paceFromVma(vmaKmh, minPct)),
  };
}

function continuousTarget(
  vmaKmh: number | undefined,
  type: Exclude<SessionType, 'fartlek'>,
  hrZone: number,
): BlockTarget {
  return vmaKmh !== undefined
    ? paceBand(vmaKmh, INTENSITY_PCT_VMA[type])
    : { type: 'hrZone', zone: hrZone };
}

function step(partial: Omit<SessionStep, 'kind'>): SessionStep {
  return { kind: 'step', ...partial };
}

const WARMUP: SessionStep = step({
  role: 'echauffement',
  extent: { type: 'duration', seconds: 15 * 60 },
  target: { type: 'hrZone', zone: 1 },
});

const COOLDOWN: SessionStep = step({
  role: 'retour_calme',
  extent: { type: 'duration', seconds: 10 * 60 },
  target: { type: 'hrZone', zone: 1 },
});

/** EF / sortie longue / récupération : un bloc continu en distance. */
function continuousSession(
  type: Exclude<SessionType, 'fartlek'>,
  distanceKm: number,
  vmaKmh: number | undefined,
  hrZone: number,
): SessionBlock[] {
  return [
    step({
      role: 'travail',
      extent: { type: 'distance', meters: Math.round(distanceKm * 1000) },
      target: continuousTarget(vmaKmh, type, hrZone),
    }),
  ];
}

/** VMA courte : éch. + reps × 300 m récup 1 min + RAC. */
function vmaShortSession(repetitions: number, vmaKmh: number | undefined): SessionBlock[] {
  const workTarget: BlockTarget =
    vmaKmh !== undefined ? paceBand(vmaKmh, INTENSITY_PCT_VMA.vma_court) : { type: 'rpe', rpe: 9 };
  return [
    WARMUP,
    {
      kind: 'series',
      repetitions,
      blocks: [
        step({ role: 'travail', extent: { type: 'distance', meters: 300 }, target: workTarget }),
      ],
      recovery: step({
        role: 'recuperation',
        extent: { type: 'duration', seconds: 60 },
        target: { type: 'none' },
      }),
    },
    COOLDOWN,
  ];
}

/** Seuil : éch. + 2 × 10 min @ SV2 récup 2 min + RAC. */
function thresholdSession(vmaKmh: number | undefined): SessionBlock[] {
  return [
    WARMUP,
    {
      kind: 'series',
      repetitions: 2,
      blocks: [
        step({
          role: 'travail',
          extent: { type: 'duration', seconds: 10 * 60 },
          target: continuousTarget(vmaKmh, 'seuil', 4),
        }),
      ],
      recovery: step({
        role: 'recuperation',
        extent: { type: 'duration', seconds: 120 },
        target: { type: 'none' },
      }),
    },
    COOLDOWN,
  ];
}

/** Tempo : éch. + 20 min continues + RAC. */
function tempoSession(vmaKmh: number | undefined): SessionBlock[] {
  return [
    WARMUP,
    step({
      role: 'travail',
      extent: { type: 'duration', seconds: 20 * 60 },
      target: continuousTarget(vmaKmh, 'tempo', 3),
    }),
    COOLDOWN,
  ];
}

export type SessionSpec = {
  sessionType: SessionType;
  blocks: SessionBlock[];
};

/** Construit la séance d'un type donné, dimensionnée par la distance EF/SL ou les répétitions. */
export function buildSession(params: {
  type: Exclude<SessionType, 'fartlek'>;
  vmaKmh?: number;
  /** Distance pour les efforts continus (EF, SL, récupération), km. */
  distanceKm?: number;
  /** Répétitions pour la VMA courte. */
  repetitions?: number;
}): SessionSpec {
  const { type, vmaKmh } = params;
  switch (type) {
    case 'ef':
      return {
        sessionType: 'ef',
        blocks: continuousSession('ef', params.distanceKm ?? 6, vmaKmh, 2),
      };
    case 'sortie_longue':
      return {
        sessionType: 'sortie_longue',
        blocks: continuousSession('sortie_longue', params.distanceKm ?? 10, vmaKmh, 2),
      };
    case 'recuperation':
      return {
        sessionType: 'recuperation',
        blocks: continuousSession('recuperation', params.distanceKm ?? 4, vmaKmh, 1),
      };
    case 'vma_court':
      return { sessionType: 'vma_court', blocks: vmaShortSession(params.repetitions ?? 8, vmaKmh) };
    case 'seuil':
      return { sessionType: 'seuil', blocks: thresholdSession(vmaKmh) };
    case 'tempo':
      return { sessionType: 'tempo', blocks: tempoSession(vmaKmh) };
  }
}

/**
 * Estimation kilométrique d'une liste de blocs (comptabilité du volume
 * hebdo) : les durées sont converties avec une vitesse de référence par
 * intensité (VMA connue) ou des vitesses par défaut prudentes.
 */
export function estimateBlocksKm(blocks: SessionBlock[], vmaKmh?: number): number {
  const easySpeed = vmaKmh !== undefined ? vmaKmh * 0.7 : 10;
  const workSpeed = vmaKmh !== undefined ? vmaKmh * 0.87 : 12;

  const stepKm = (s: SessionStep): number => {
    if (s.extent.type === 'distance') {
      return s.extent.meters / 1000;
    }
    const speed = s.target.type === 'pace' || s.target.type === 'rpe' ? workSpeed : easySpeed;
    return (s.extent.seconds / 3600) * speed;
  };

  const blockKm = (block: SessionBlock): number => {
    if (block.kind === 'step') {
      return stepKm(block);
    }
    const inner = block.blocks.reduce((sum, b) => sum + blockKm(b), 0);
    const recovery = block.recovery ? stepKm(block.recovery) : 0;
    return block.repetitions * inner + Math.max(0, block.repetitions - 1) * recovery;
  };

  const total = blocks.reduce((sum, b) => sum + blockKm(b), 0);
  return Math.round(total * 10) / 10;
}
