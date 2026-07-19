import type { SessionBlock, SessionStep, SessionType } from '@/schemas';

import { buildSession, type SessionSpec } from './session-templates';

/**
 * Bibliothèque pédagogique (E4-3, spec §7.3) — fonctions pures : séance
 * type de chaque famille (structure d'exemple de la fiche) et estimation
 * distance/durée totales d'une structure de blocs, fidèle aux cibles
 * d'allure quand elles existent (calcul auto de la fiche et du builder).
 */

/** Ordre d'affichage des 7 types dans l'onglet Séances (spec §7.3). */
export const LIBRARY_SESSION_TYPES: readonly SessionType[] = [
  'ef',
  'sortie_longue',
  'vma_court',
  'seuil',
  'tempo',
  'fartlek',
  'recuperation',
];

/** Fartlek d'exemple : éch. + 8 × 1 min soutenue / 1 min libre + RAC. */
function fartlekSession(): SessionBlock[] {
  return [
    {
      kind: 'step',
      role: 'echauffement',
      extent: { type: 'duration', seconds: 15 * 60 },
      target: { type: 'hrZone', zone: 1 },
    },
    {
      kind: 'series',
      repetitions: 8,
      blocks: [
        {
          kind: 'step',
          role: 'travail',
          extent: { type: 'duration', seconds: 60 },
          target: { type: 'rpe', rpe: 7 },
        },
      ],
      recovery: {
        kind: 'step',
        role: 'recuperation',
        extent: { type: 'duration', seconds: 60 },
        target: { type: 'none' },
      },
    },
    {
      kind: 'step',
      role: 'retour_calme',
      extent: { type: 'duration', seconds: 10 * 60 },
      target: { type: 'hrZone', zone: 1 },
    },
  ];
}

/**
 * Séance d'exemple d'une fiche : les 6 types du moteur de plan viennent de
 * `buildSession` (mêmes réglages que le plan, cohérence G3) ; le fartlek —
 * jeu libre par définition — a sa structure d'exemple dédiée.
 */
export function buildLibrarySession(type: SessionType, vmaKmh?: number): SessionSpec {
  if (type === 'fartlek') {
    return { sessionType: 'fartlek', blocks: fartlekSession() };
  }
  return vmaKmh !== undefined ? buildSession({ type, vmaKmh }) : buildSession({ type });
}

export type SessionTotals = {
  /** Distance totale estimée, en mètres. */
  distanceM: number;
  /** Durée totale estimée, en secondes. */
  durationS: number;
};

/**
 * Vitesses de conversion durée ↔ distance quand un step n'a pas de cible
 * d'allure : références par intensité (mêmes réglages que
 * `estimateBlocksKm` / `estimateBlocksDurationS`, plan-flex).
 */
function referenceSpeedKmh(step: SessionStep, vmaKmh?: number): number {
  const easy = vmaKmh !== undefined ? vmaKmh * 0.7 : 10;
  const work = vmaKmh !== undefined ? vmaKmh * 0.87 : 12;
  return step.target.type === 'rpe' ? work : easy;
}

/** Vitesse d'un step (km/h) : milieu de la bande d'allure si elle existe. */
function stepSpeedKmh(step: SessionStep, vmaKmh?: number): number {
  if (step.target.type === 'pace') {
    const midSecondsPerKm = (step.target.minSecondsPerKm + step.target.maxSecondsPerKm) / 2;
    return 3600 / midSecondsPerKm;
  }
  return referenceSpeedKmh(step, vmaKmh);
}

/**
 * Estimation distance + durée totales d'une structure de blocs (critère
 * d'acceptation US-05, spec §7.3) : contrairement aux estimations de charge
 * de `plan-flex`, la conversion utilise la **cible d'allure du bloc** quand
 * elle existe — « 2 × 2000 m @ allure semi » compte à l'allure semi.
 * Les récupérations de série comptent `répétitions − 1` fois.
 */
export function estimateSessionTotals(blocks: SessionBlock[], vmaKmh?: number): SessionTotals {
  const add = (a: SessionTotals, b: SessionTotals): SessionTotals => ({
    distanceM: a.distanceM + b.distanceM,
    durationS: a.durationS + b.durationS,
  });

  const stepTotals = (step: SessionStep): SessionTotals => {
    const speedKmh = stepSpeedKmh(step, vmaKmh);
    if (step.extent.type === 'duration') {
      return {
        durationS: step.extent.seconds,
        distanceM: (step.extent.seconds / 3600) * speedKmh * 1000,
      };
    }
    return {
      distanceM: step.extent.meters,
      durationS: (step.extent.meters / 1000 / speedKmh) * 3600,
    };
  };

  const blockTotals = (block: SessionBlock): SessionTotals => {
    if (block.kind === 'step') {
      return stepTotals(block);
    }
    const inner = block.blocks.reduce((sum, b) => add(sum, blockTotals(b)), {
      distanceM: 0,
      durationS: 0,
    } as SessionTotals);
    const recovery =
      block.recovery !== undefined ? stepTotals(block.recovery) : { distanceM: 0, durationS: 0 };
    const recoveryCount = Math.max(0, block.repetitions - 1);
    return {
      distanceM: block.repetitions * inner.distanceM + recoveryCount * recovery.distanceM,
      durationS: block.repetitions * inner.durationS + recoveryCount * recovery.durationS,
    };
  };

  const total = blocks.reduce((sum, b) => add(sum, blockTotals(b)), {
    distanceM: 0,
    durationS: 0,
  } as SessionTotals);
  return { distanceM: Math.round(total.distanceM), durationS: Math.round(total.durationS) };
}
