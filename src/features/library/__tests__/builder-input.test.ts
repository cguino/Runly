import type { BlockDraft } from '../builder-input';
import {
  draftToBlock,
  parseMetersInput,
  parseMinutesInput,
  parsePaceInput,
} from '../builder-input';

/** Saisie du builder (E4-4) : parsing français → modèle de blocs. */

describe('parsePaceInput', () => {
  it.each([
    ['4:59', 299],
    ["4'59", 299],
    ['5', 300],
    ['10:00', 600],
  ])('%s → %d s/km', (text, expected) => {
    expect(parsePaceInput(text)).toBe(expected);
  });

  it.each(['', '4:75', 'abc', '0', '-4:00'])('rejette « %s »', (text) => {
    expect(parsePaceInput(text)).toBeUndefined();
  });
});

describe('parseMinutesInput', () => {
  it('accepte la virgule française (0,5 min → 30 s)', () => {
    expect(parseMinutesInput('0,5')).toBe(30);
    expect(parseMinutesInput('12')).toBe(720);
  });

  it.each(['', '0', 'abc', '-3'])('rejette « %s »', (text) => {
    expect(parseMinutesInput(text)).toBeUndefined();
  });
});

describe('parseMetersInput', () => {
  it('accepte des mètres entiers', () => {
    expect(parseMetersInput('2000')).toBe(2000);
  });

  it.each(['', '5', 'abc', '2,5'])('rejette « %s »', (text) => {
    expect(parseMetersInput(text)).toBeUndefined();
  });
});

const BASE_DRAFT: BlockDraft = {
  repetitions: 1,
  role: 'travail',
  extentType: 'duration',
  extentValue: '10',
  targetType: 'none',
  paceMin: '',
  paceMax: '',
  hrZone: 2,
  rpe: 7,
  recoveryMinutes: '',
};

describe('draftToBlock', () => {
  it('1 répétition → step simple', () => {
    expect(draftToBlock(BASE_DRAFT)).toEqual({
      kind: 'step',
      role: 'travail',
      extent: { type: 'duration', seconds: 600 },
      target: { type: 'none' },
    });
  });

  it('répétitions > 1 → série avec récup, cas canonique 2×2000 m récup 2 min', () => {
    const block = draftToBlock({
      ...BASE_DRAFT,
      repetitions: 2,
      extentType: 'distance',
      extentValue: '2000',
      targetType: 'pace',
      paceMin: '4:59',
      recoveryMinutes: '2',
    });
    expect(block).toEqual({
      kind: 'series',
      repetitions: 2,
      blocks: [
        {
          kind: 'step',
          role: 'travail',
          extent: { type: 'distance', meters: 2000 },
          target: { type: 'pace', minSecondsPerKm: 299, maxSecondsPerKm: 299 },
        },
      ],
      recovery: {
        kind: 'step',
        role: 'recuperation',
        extent: { type: 'duration', seconds: 120 },
        target: { type: 'none' },
      },
    });
  });

  it('remet la bande d’allure dans l’ordre (saisie inversée tolérée)', () => {
    const block = draftToBlock({
      ...BASE_DRAFT,
      targetType: 'pace',
      paceMin: '5:00',
      paceMax: '4:30',
    });
    expect(block).toMatchObject({
      target: { type: 'pace', minSecondsPerKm: 270, maxSecondsPerKm: 300 },
    });
  });

  it('saisie incomplète → undefined (CTA désactivé)', () => {
    expect(draftToBlock({ ...BASE_DRAFT, extentValue: '' })).toBeUndefined();
    expect(draftToBlock({ ...BASE_DRAFT, targetType: 'pace', paceMin: '' })).toBeUndefined();
    expect(draftToBlock({ ...BASE_DRAFT, repetitions: 3, recoveryMinutes: 'abc' })).toBeUndefined();
  });
});
