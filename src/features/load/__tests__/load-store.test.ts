import type { JournalEntry } from '@/features/journal';
import { useJournalStore } from '@/features/journal';
import { addDays } from '@/lib/dates';

import { useLoadStore } from '../load-store';

/**
 * Store de charge (E7) : orchestration jauge + alertes sur le journal.
 * La logique métier est testée dans `src/training-engine` — ici on vérifie
 * le branchement, le cycle de vie des alertes et la traçabilité des
 * décisions. `refresh({ today, now })` : injection du temps (déterminisme).
 */

const TODAY = '2026-07-16';
const NOW = `${TODAY}T18:00:00+02:00`;

function entry(date: string, durationMin: number, rpe?: number): JournalEntry {
  return {
    workout: {
      source: 'manuel',
      startedAt: `${date}T08:00:00+02:00`,
      durationS: durationMin * 60,
    },
    feedback: rpe === undefined ? undefined : { rpe, pains: [], at: `${date}T09:00:00+02:00` },
  };
}

/** 8 semaines régulières : une séance RPE 5 × 60 min par jour (ACWR = 1). */
function steadyEntries(rpe = 5): JournalEntry[] {
  const entries: JournalEntry[] = [];
  for (let i = 55; i >= 0; i -= 1) {
    entries.push(entry(addDays(TODAY, -i), 60, rpe));
  }
  return entries;
}

function resetStores(entries: JournalEntry[]) {
  useJournalStore.setState({ entries });
  useLoadStore.setState({
    current: undefined,
    forecast: undefined,
    plannedLoads: [],
    activeAlert: undefined,
    decidedAlerts: [],
    lastLoadAlertAt: undefined,
  });
}

describe('useLoadStore — jauge (E7-1/E7-3)', () => {
  it('calcule la chronique et l’ACWR depuis le journal (sRPE)', () => {
    resetStores(steadyEntries());
    useLoadStore.getState().refresh({ today: TODAY, now: NOW });
    const current = useLoadStore.getState().current;
    expect(current?.acwr).toBeCloseTo(1, 5);
    expect(current?.status).toBe('favorable');
    expect(useLoadStore.getState().activeAlert).toBeUndefined();
  });

  it('valorise les séances sans RPE par l’amorçage (D4) — jauge active quand même', () => {
    resetStores(steadyEntries().map(({ workout }) => ({ workout })));
    useLoadStore.getState().refresh({ today: TODAY, now: NOW });
    const current = useLoadStore.getState().current;
    expect(current?.acwr).toBeCloseTo(1, 5);
    expect(current?.status).toBe('favorable');
  });

  it('reste en calibration (< 4 semaines) et n’émet aucune alerte', () => {
    // 10 jours très chargés seulement : signaux au rouge mais calibration.
    const entries: JournalEntry[] = [];
    for (let i = 9; i >= 0; i -= 1) {
      entries.push(entry(addDays(TODAY, -i), 90, 9));
    }
    resetStores(entries);
    useLoadStore.getState().refresh({ today: TODAY, now: NOW });
    expect(useLoadStore.getState().current?.status).toBe('calibration');
    expect(useLoadStore.getState().activeAlert).toBeUndefined();
  });

  it('projette l’ACWR à J+7 quand le plan fournit des séances estimées', () => {
    resetStores(steadyEntries());
    useLoadStore.getState().setPlannedLoads(
      [1, 3, 5].map((offset) => ({
        scheduledDate: addDays(TODAY, offset),
        estimatedLoad: 300,
      })),
    );
    useLoadStore.getState().refresh({ today: TODAY, now: NOW });
    const forecast = useLoadStore.getState().forecast;
    expect(forecast?.date).toBe(addDays(TODAY, 7));
    expect(forecast?.acwr).toBeDefined();
  });
});

describe('useLoadStore — alertes & décisions (E7-4)', () => {
  /** Semaine courante doublée → pic. */
  function peakEntries(): JournalEntry[] {
    const entries: JournalEntry[] = [];
    for (let i = 55; i >= 7; i -= 1) {
      entries.push(entry(addDays(TODAY, -i), 60, 5));
    }
    for (let i = 6; i >= 0; i -= 1) {
      entries.push(entry(addDays(TODAY, -i), 120, 6));
    }
    return entries;
  }

  it('émet une alerte pic et trace la décision « Garder mon plan »', () => {
    resetStores(peakEntries());
    useLoadStore.getState().refresh({ today: TODAY, now: NOW });
    const alert = useLoadStore.getState().activeAlert;
    expect(alert?.alertType).toBe('pic_charge');
    expect(alert?.triggerContext.loadIncreasePct).toBeGreaterThan(30);
    expect(alert?.proposedAction.kind).toBe('substitution_seance');

    useLoadStore.getState().decideAlert('kept_plan', `${TODAY}T18:05:00+02:00`);
    expect(useLoadStore.getState().activeAlert).toBeUndefined();
    const [decided] = useLoadStore.getState().decidedAlerts;
    expect(decided?.userDecision).toBe('kept_plan');
    expect(decided?.decidedAt).toBe(`${TODAY}T18:05:00+02:00`);
  });

  it('throttling : pas de nouvelle alerte < 48 h après la précédente', () => {
    resetStores(peakEntries());
    const store = useLoadStore.getState();
    store.refresh({ today: TODAY, now: NOW });
    useLoadStore.getState().decideAlert('accepted');

    // Toujours en pic le lendemain : throttlé (34 h après la 1re alerte).
    useLoadStore.getState().refresh({
      today: addDays(TODAY, 1),
      now: `${addDays(TODAY, 1)}T04:00:00+02:00`,
    });
    expect(useLoadStore.getState().activeAlert).toBeUndefined();

    // 48 h pile après la 1re alerte : fenêtre écoulée, nouvelle alerte possible.
    useLoadStore.getState().refresh({
      today: addDays(TODAY, 2),
      now: `${addDays(TODAY, 2)}T18:00:00+02:00`,
    });
    expect(useLoadStore.getState().activeAlert).toBeDefined();
  });

  it('ne remplace pas une alerte en attente de décision', () => {
    resetStores(peakEntries());
    useLoadStore.getState().refresh({ today: TODAY, now: NOW });
    const first = useLoadStore.getState().activeAlert;
    useLoadStore.getState().refresh({
      today: addDays(TODAY, 5),
      now: `${addDays(TODAY, 5)}T18:00:00+02:00`,
    });
    expect(useLoadStore.getState().activeAlert).toBe(first);
  });

  it('RPE ≥ 8 sur 2 séances consécutives → proposition d’allègement', () => {
    const entries = steadyEntries();
    entries[entries.length - 2] = entry(addDays(TODAY, -1), 60, 8);
    entries[entries.length - 1] = entry(TODAY, 60, 9);
    resetStores(entries);
    useLoadStore.getState().refresh({ today: TODAY, now: NOW });
    const alert = useLoadStore.getState().activeAlert;
    expect(alert?.alertType).toBe('rpe_eleve');
    expect(alert?.proposedAction.kind).toBe('allegement_seance');
  });
});
