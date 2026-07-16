import { regularHistory } from '@/training-engine/__fixtures__/workouts';

import { usePhysioStore } from '../physio-store';

const AT = '2026-07-16T10:00:00+02:00';

function resetStore() {
  const { profile } = usePhysioStore.getInitialState();
  usePhysioStore.setState({
    profile: { ...profile, revisions: [] },
    recalcProposal: undefined,
  });
}

describe('usePhysioStore (E2-4, E2-5)', () => {
  beforeEach(resetStore);

  it('démarre avec SV1/SV2 estimés et les 5 zones', () => {
    const { profile } = usePhysioStore.getState();
    expect(profile.sv1PctVma?.confidence).toBe('estime');
    expect(profile.zones).toHaveLength(5);
    expect(profile.vmaKmh).toBeUndefined();
  });

  it('complète VMA et FCmax depuis l’historique (champs vides seulement)', () => {
    usePhysioStore.getState().deriveFromHistory({ workouts: regularHistory, ageYears: 34 });
    const { profile, recalcProposal } = usePhysioStore.getState();
    expect(profile.vmaKmh).toEqual({ value: 17.4, confidence: 'estime' });
    expect(profile.fcmaxBpm).toEqual({ value: 191, confidence: 'mesure' });
    expect(recalcProposal).toBeUndefined();
  });

  it('trace une révision et passe en « mesuré » lors d’une édition manuelle', () => {
    usePhysioStore.getState().setManualValue('vmaKmh', 16.8, AT);
    const { profile } = usePhysioStore.getState();
    expect(profile.vmaKmh).toEqual({ value: 16.8, confidence: 'mesure' });
    expect(profile.revisions).toEqual([
      { field: 'vmaKmh', previousValue: null, newValue: 16.8, source: 'manuel', at: AT },
    ]);
  });

  it('propose un recalcul quand une perf récente contredit la VMA saisie — sans l’imposer', () => {
    usePhysioStore.getState().setManualValue('vmaKmh', 16, AT);
    usePhysioStore.getState().deriveFromHistory({ workouts: regularHistory });
    expect(usePhysioStore.getState().recalcProposal).toEqual({ proposedVmaKmh: 17.4 });
    // La valeur n'a PAS bougé tant que l'utilisateur n'a pas accepté.
    expect(usePhysioStore.getState().profile.vmaKmh?.value).toBe(16);
  });

  it('accepte le recalcul : valeur mise à jour + révision tracée', () => {
    usePhysioStore.getState().setManualValue('vmaKmh', 16, AT);
    usePhysioStore.getState().deriveFromHistory({ workouts: regularHistory });
    usePhysioStore.getState().acceptRecalc(AT);
    const { profile, recalcProposal } = usePhysioStore.getState();
    expect(profile.vmaKmh).toEqual({ value: 17.4, confidence: 'estime' });
    expect(recalcProposal).toBeUndefined();
    expect(profile.revisions.at(-1)).toEqual({
      field: 'vmaKmh',
      previousValue: 16,
      newValue: 17.4,
      source: 'recalcul',
      at: AT,
    });
  });

  it('refuse le recalcul : rien ne change, la proposition disparaît', () => {
    usePhysioStore.getState().setManualValue('vmaKmh', 16, AT);
    usePhysioStore.getState().deriveFromHistory({ workouts: regularHistory });
    usePhysioStore.getState().dismissRecalc();
    expect(usePhysioStore.getState().profile.vmaKmh?.value).toBe(16);
    expect(usePhysioStore.getState().recalcProposal).toBeUndefined();
  });
});
