import { latestEntryWithoutFeedback, useJournalStore } from '../journal-store';

const START = '2026-07-16T18:30:00+02:00';

describe('useJournalStore — saisie manuelle (E6-6)', () => {
  beforeEach(() => {
    useJournalStore.setState({ entries: [] });
  });

  it('enregistre durée + distance + RPE (mode sans montre)', () => {
    const ok = useJournalStore
      .getState()
      .addManualWorkout({ startedAt: START, durationMin: 45, distanceKm: 8.2, rpe: 6 });
    expect(ok).toBe(true);
    const [entry] = useJournalStore.getState().entries;
    expect(entry?.workout).toMatchObject({
      source: 'manuel',
      durationS: 2700,
      distanceM: 8200,
    });
    expect(entry?.feedback?.rpe).toBe(6);
  });

  it('accepte une saisie durée seule (distance et RPE optionnels)', () => {
    const ok = useJournalStore.getState().addManualWorkout({ startedAt: START, durationMin: 30 });
    expect(ok).toBe(true);
    const [entry] = useJournalStore.getState().entries;
    expect(entry?.workout.distanceM).toBeUndefined();
    expect(entry?.feedback).toBeUndefined();
  });

  it('refuse une durée nulle ou un RPE hors 0–10 sans rien enregistrer', () => {
    const store = useJournalStore.getState();
    expect(store.addManualWorkout({ startedAt: START, durationMin: 0 })).toBe(false);
    expect(store.addManualWorkout({ startedAt: START, durationMin: 40, rpe: 11 })).toBe(false);
    expect(useJournalStore.getState().entries).toHaveLength(0);
  });
});

describe('useJournalStore — saisie RPE post-séance (E7-5)', () => {
  beforeEach(() => {
    useJournalStore.setState({ entries: [] });
  });

  it('note la séance la plus récente sans feedback', () => {
    const store = useJournalStore.getState();
    store.addManualWorkout({ startedAt: '2026-07-15T18:30:00+02:00', durationMin: 40, rpe: 5 });
    store.addManualWorkout({ startedAt: START, durationMin: 50 });

    expect(latestEntryWithoutFeedback(useJournalStore.getState().entries)?.workout.durationS).toBe(
      3000,
    );
    expect(useJournalStore.getState().addFeedbackToLatestWorkout(7, START)).toBe(true);

    const entries = useJournalStore.getState().entries;
    expect(entries[1]?.feedback?.rpe).toBe(7);
    expect(entries[0]?.feedback?.rpe).toBe(5); // la séance déjà notée ne bouge pas
    expect(latestEntryWithoutFeedback(entries)).toBeUndefined();
  });

  it('refuse un RPE hors échelle ou sans séance à noter', () => {
    expect(useJournalStore.getState().addFeedbackToLatestWorkout(6)).toBe(false); // journal vide
    useJournalStore.getState().addManualWorkout({ startedAt: START, durationMin: 30 });
    expect(useJournalStore.getState().addFeedbackToLatestWorkout(11)).toBe(false);
    expect(useJournalStore.getState().entries[0]?.feedback).toBeUndefined();
  });
});

describe('useJournalStore — import de séances normalisées (E1-2)', () => {
  beforeEach(() => {
    useJournalStore.setState({ entries: [] });
  });

  it('importe les séances valides et écarte les invalides (frontière zod)', () => {
    const imported = useJournalStore.getState().importWorkouts([
      { source: 'healthkit', startedAt: START, durationS: 2400, distanceM: 6000 },
      // durationS négative : rejetée par le schéma.
      { source: 'healthkit', startedAt: START, durationS: -5 },
    ]);
    expect(imported).toBe(1);
    expect(useJournalStore.getState().entries).toHaveLength(1);
    expect(useJournalStore.getState().entries[0]?.workout.source).toBe('healthkit');
  });
});
