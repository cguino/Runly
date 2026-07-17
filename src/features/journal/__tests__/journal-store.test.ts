import { useJournalStore } from '../journal-store';

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
