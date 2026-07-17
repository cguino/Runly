import {
  ALERT_THROTTLE_HOURS,
  evaluateLoadAlerts,
  hasConsecutiveHighRpe,
  UNDERLOAD_MIN_DAYS,
} from '../alerts';
import type { LoadState } from '../load';

const NOW = '2026-07-16T18:00:00+02:00';

function state(partial: Partial<LoadState>): LoadState {
  return {
    date: '2026-07-16',
    acuteLoad7d: 700,
    chronicWeeklyLoad28d: 700,
    acwr: 1,
    historyDays: 60,
    status: 'favorable',
    ...partial,
  };
}

const BASE = {
  recentRpes: [] as number[],
  underloadDays: 0,
  now: NOW,
};

describe('déclencheur pic de charge (> 1,3 → substitution, E7-4)', () => {
  it('propose une substitution avec la référence de séance à alléger', () => {
    const alert = evaluateLoadAlerts({
      ...BASE,
      state: state({ acwr: 1.38, status: 'pic' }),
      nextIntenseSessionRef: 'session-jeudi',
    });
    expect(alert).toEqual({
      alertType: 'pic_charge',
      triggerContext: { acwr: 1.38, loadIncreasePct: 38 },
      proposedAction: { kind: 'substitution_seance', sessionRef: 'session-jeudi' },
    });
  });

  it('reste silencieux en zone favorable', () => {
    expect(evaluateLoadAlerts({ ...BASE, state: state({}) })).toBeUndefined();
  });

  it('prime sur les autres déclencheurs (une seule alerte à la fois)', () => {
    const alert = evaluateLoadAlerts({
      ...BASE,
      state: state({ acwr: 1.5, status: 'pic' }),
      recentRpes: [9, 9],
      underloadDays: 20,
    });
    expect(alert?.alertType).toBe('pic_charge');
  });
});

describe('déclencheur RPE élevés (≥ 8 × 2 séances consécutives)', () => {
  it('détecte deux dernières séances notées ≥ 8', () => {
    expect(hasConsecutiveHighRpe([5, 8, 9])).toBe(true);
    expect(hasConsecutiveHighRpe([8, 8])).toBe(true);
    expect(hasConsecutiveHighRpe([9, 7])).toBe(false);
    expect(hasConsecutiveHighRpe([8])).toBe(false);
    expect(hasConsecutiveHighRpe([])).toBe(false);
  });

  it("propose un allègement avec le contexte des RPE", () => {
    const alert = evaluateLoadAlerts({
      ...BASE,
      state: state({}),
      recentRpes: [6, 8, 9],
      nextIntenseSessionRef: 'session-samedi',
    });
    expect(alert).toEqual({
      alertType: 'rpe_eleve',
      triggerContext: { lastRpes: [8, 9] },
      proposedAction: { kind: 'allegement_seance', sessionRef: 'session-samedi' },
    });
  });

  it('un RPE 8 isolé entre deux séances plus douces ne déclenche rien', () => {
    expect(
      evaluateLoadAlerts({ ...BASE, state: state({}), recentRpes: [8, 6] }),
    ).toBeUndefined();
  });
});

describe('déclencheur sous-charge prolongée (> 2 semaines)', () => {
  it("encourage la régularité au-delà de 14 jours", () => {
    const alert = evaluateLoadAlerts({
      ...BASE,
      state: state({ acwr: 0.5, status: 'sous_charge' }),
      underloadDays: UNDERLOAD_MIN_DAYS + 1,
    });
    expect(alert).toEqual({
      alertType: 'sous_charge',
      triggerContext: { acwr: 0.5, underloadDays: 15 },
      proposedAction: { kind: 'ajout_seance_facile' },
    });
  });

  it('reste silencieux à exactement 14 jours (strictement > 2 semaines)', () => {
    expect(
      evaluateLoadAlerts({
        ...BASE,
        state: state({ acwr: 0.5, status: 'sous_charge' }),
        underloadDays: UNDERLOAD_MIN_DAYS,
      }),
    ).toBeUndefined();
  });
});

describe('alertes désactivées en calibration (spec §7.6)', () => {
  it("ne déclenche rien, même avec tous les signaux au rouge", () => {
    const alert = evaluateLoadAlerts({
      ...BASE,
      state: state({ acwr: 1.6, status: 'calibration', historyDays: 10 }),
      recentRpes: [9, 10],
      underloadDays: 20,
    });
    expect(alert).toBeUndefined();
  });
});

describe('throttling — max 1 alerte charge / 48 h (spec §7.6)', () => {
  const picState = state({ acwr: 1.4, status: 'pic' });

  it("reste silencieux moins de 48 h après la dernière alerte", () => {
    const lastLoadAlertAt = '2026-07-15T08:00:00+02:00'; // il y a 34 h
    expect(
      evaluateLoadAlerts({ ...BASE, state: picState, lastLoadAlertAt }),
    ).toBeUndefined();
  });

  it('redevient éligible une fois les 48 h écoulées', () => {
    const lastLoadAlertAt = '2026-07-14T17:00:00+02:00'; // il y a 49 h
    expect(evaluateLoadAlerts({ ...BASE, state: picState, lastLoadAlertAt })?.alertType).toBe(
      'pic_charge',
    );
  });

  it('borne exacte : 48 h pile → plus throttlé', () => {
    const lastLoadAlertAt = '2026-07-14T18:00:00+02:00';
    expect(evaluateLoadAlerts({ ...BASE, state: picState, lastLoadAlertAt })).toBeDefined();
    expect(ALERT_THROTTLE_HOURS).toBe(48);
  });

  it('le throttling vaut pour tous les types (RPE, sous-charge)', () => {
    const lastLoadAlertAt = '2026-07-16T08:00:00+02:00'; // il y a 10 h
    expect(
      evaluateLoadAlerts({
        ...BASE,
        state: state({}),
        recentRpes: [9, 9],
        lastLoadAlertAt,
      }),
    ).toBeUndefined();
    expect(
      evaluateLoadAlerts({
        ...BASE,
        state: state({ acwr: 0.4, status: 'sous_charge' }),
        underloadDays: 21,
        lastLoadAlertAt,
      }),
    ).toBeUndefined();
  });

  it('sans alerte précédente : pas de throttling', () => {
    expect(evaluateLoadAlerts({ ...BASE, state: picState })?.alertType).toBe('pic_charge');
  });
});
