import { fr } from '@/i18n/fr';
import type { WeeklyRecap } from '@/training-engine';

import {
  rpeRequestContent,
  sessionReminderContent,
  weeklyKickoffContent,
  weeklyRecapContent,
} from '../content';

/**
 * Contenu des notifications (Lot 9) : snapshots sur fixtures + filtre
 * wording réglementaire (`note-reglementaire-dm.md`) sur toutes les strings
 * ajoutées — jamais « blessure », « risque », ni pathologie ; aide à la
 * décision, jamais de prédiction.
 */

const RECAP_BASE: WeeklyRecap = {
  weekStart: '2026-07-13',
  weekEnd: '2026-07-19',
  plannedCount: 3,
  doneCount: 2,
  distanceM: 21_500,
  durationS: 2 * 3600 + 45 * 60,
  acwrStart: 0.95,
  acwrEnd: 1.12,
  endStatus: 'favorable',
  trend: 'hausse',
  adaptation: 'continuite',
};

describe('contenu des notifications (snapshots)', () => {
  it('« ta semaine » : séances + charge prévisionnelle', () => {
    expect(weeklyKickoffContent({ sessionsCount: 3, forecastStatus: 'favorable' })).toMatchSnapshot(
      'kickoff favorable',
    );
    expect(weeklyKickoffContent({ sessionsCount: 1, forecastStatus: 'pic' })).toMatchSnapshot(
      'kickoff pic',
    );
    expect(weeklyKickoffContent({ sessionsCount: 2 })).toMatchSnapshot('kickoff sans prévisionnel');
  });

  it('rappel de séance : typé ou générique', () => {
    expect(sessionReminderContent({ sessionType: 'seuil' })).toMatchSnapshot('rappel seuil');
    expect(sessionReminderContent({})).toMatchSnapshot('rappel générique');
  });

  it('demande de RPE', () => {
    expect(rpeRequestContent()).toMatchSnapshot();
  });

  it('récap hebdo : réalisé vs prévu, évolution ACWR, message d’adaptation', () => {
    expect(weeklyRecapContent(RECAP_BASE)).toMatchSnapshot('semaine favorable');
    expect(
      weeklyRecapContent({
        ...RECAP_BASE,
        acwrEnd: 1.45,
        endStatus: 'pic',
        adaptation: 'semaine_legere',
      }),
    ).toMatchSnapshot('pic de charge → semaine plus légère');
    expect(
      weeklyRecapContent({
        ...RECAP_BASE,
        doneCount: 0,
        distanceM: 0,
        durationS: 0,
        acwrEnd: 0.4,
        endStatus: 'sous_charge',
        trend: 'baisse',
        adaptation: 'relance_douce',
      }),
    ).toMatchSnapshot('semaine sans séance malgré un plan');
    expect(
      weeklyRecapContent({
        ...RECAP_BASE,
        plannedCount: 0,
        acwrStart: undefined,
        acwrEnd: undefined,
        endStatus: 'calibration',
        trend: 'indeterminee',
        adaptation: 'calibration',
      }),
    ).toMatchSnapshot('sans plan, jauge en calibration');
  });
});

describe('filtre wording réglementaire (note-reglementaire-dm.md)', () => {
  /** Termes proscrits dans tout texte produit (+ leviers exclus par D15). */
  const PROSCRIBED =
    /blessur|blessé|pathologie|tendin|périost|fracture|surentraîn|surmenage|risque|danger|médical|medical|clinique|diagnost|prévenir|prévient|prévention|streak/i;

  function flattenStrings(node: unknown, path: string): { path: string; value: string }[] {
    if (typeof node === 'string') {
      return [{ path, value: node }];
    }
    if (node !== null && typeof node === 'object') {
      return Object.entries(node).flatMap(([key, value]) =>
        flattenStrings(value, `${path}.${key}`),
      );
    }
    return [];
  }

  it('aucune string i18n du domaine notifications ne contient un terme proscrit', () => {
    const offenders = flattenStrings(fr.notifications, 'notifications').filter(({ value }) =>
      PROSCRIBED.test(value),
    );
    expect(offenders).toEqual([]);
  });

  it('aucun contenu rendu ne contient un terme proscrit', () => {
    const rendered = [
      weeklyKickoffContent({ sessionsCount: 3, forecastStatus: 'pic' }),
      weeklyKickoffContent({ sessionsCount: 3, forecastStatus: 'sous_charge' }),
      weeklyKickoffContent({ sessionsCount: 3, forecastStatus: 'calibration' }),
      sessionReminderContent({ sessionType: 'vma_court' }),
      rpeRequestContent(),
      weeklyRecapContent(RECAP_BASE),
      weeklyRecapContent({ ...RECAP_BASE, endStatus: 'pic', adaptation: 'semaine_legere' }),
      weeklyRecapContent({ ...RECAP_BASE, endStatus: 'sous_charge', adaptation: 'relance_douce' }),
    ];
    for (const content of rendered) {
      expect(`${content.title} ${content.body}`).not.toMatch(PROSCRIBED);
    }
  });

  it('le récap au format français : virgule décimale dans l’évolution de charge', () => {
    expect(weeklyRecapContent(RECAP_BASE).body).toContain('0,95 → 1,12');
  });
});
