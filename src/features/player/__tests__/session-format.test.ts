import '@/i18n';

import type { SessionBlock } from '@/schemas';
import { flattenBlocks } from '@/training-engine';

import {
  blocksToBrief,
  extentLabel,
  formatClock,
  speechForStep,
  stepCountdownLabel,
  stepHeading,
  stepSummary,
  targetLabel,
} from '../session-format';

const SERIES: SessionBlock = {
  kind: 'series',
  repetitions: 2,
  blocks: [
    {
      kind: 'step',
      extent: { type: 'distance', meters: 2000 },
      target: { type: 'pace', minSecondsPerKm: 285, maxSecondsPerKm: 300 },
      role: 'travail',
    },
  ],
  recovery: {
    kind: 'step',
    extent: { type: 'duration', seconds: 120 },
    target: { type: 'none' },
    role: 'recuperation',
  },
};

describe('formats du player (E5-3, D7 — formats français)', () => {
  it('formatClock : m:ss et h:mm:ss', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65)).toBe('1:05');
    expect(formatClock(3905)).toBe('1:05:05');
  });

  it('extentLabel : durée en horloge, distance en m/km', () => {
    expect(extentLabel({ type: 'duration', seconds: 600 })).toBe('10:00');
    expect(extentLabel({ type: 'distance', meters: 300 })).toBe('300 m');
    expect(extentLabel({ type: 'distance', meters: 2000 })).toBe('2 km');
  });

  it('targetLabel : bande d’allure, zone, RPE, libre', () => {
    expect(targetLabel({ type: 'pace', minSecondsPerKm: 285, maxSecondsPerKm: 300 })).toBe(
      '4:45–5:00 /km',
    );
    expect(targetLabel({ type: 'hrZone', zone: 2 })).toBe('Zone 2');
    expect(targetLabel({ type: 'rpe', rpe: 9 })).toBe('RPE 9');
    expect(targetLabel({ type: 'none' })).toBe('Allure libre');
  });

  it('stepHeading et stepSummary : série et rôle', () => {
    const flat = flattenBlocks([SERIES]);
    expect(stepHeading(flat[0]!)).toBe('Série 1 / 2');
    expect(stepHeading(flat[1]!)).toBe('Récupération');
    expect(stepSummary(flat[1]!)).toBe('Récupération · 2:00 @ Allure libre');
  });

  it('stepCountdownLabel : compte à rebours temps ou distance restante', () => {
    const flat = flattenBlocks([SERIES]);
    expect(stepCountdownLabel(flat[1]!, 30_000, 0)).toBe('1:30');
    expect(stepCountdownLabel(flat[0]!, 0, 750)).toBe('1,3 km');
    expect(stepCountdownLabel(flat[0]!, 0, 1400)).toBe('600 m');
  });

  it('speechForStep : texte parlé sans format « 4:59 » illisible en TTS', () => {
    const flat = flattenBlocks([SERIES]);
    const speech = speechForStep(flat[0]!);
    expect(speech).toContain('Série 1 / 2');
    expect(speech).toContain('2 kilomètres');
    expect(speech).toContain('4 minutes 45');
    expect(speech).not.toMatch(/\d:\d/u);
  });

  it('blocksToBrief : une ligne par bloc, séries résumées', () => {
    const brief = blocksToBrief([SERIES]);
    expect(brief).toHaveLength(1);
    expect(brief[0]?.title).toBe('2 × 2 km');
    expect(brief[0]?.subtitle).toContain('récup 2:00');
  });
});
