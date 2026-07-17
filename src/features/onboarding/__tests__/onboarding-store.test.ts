import type { Workout } from '@/schemas';
import { createMockHealthAdapter } from '@/services';

import { useJournalStore } from '../../journal/journal-store';
import { useOnboardingStore } from '../onboarding-store';

const TODAY = '2026-07-17';

/** Historique santé : `weeks` semaines de 2 sorties de 6 km (12 km/sem). */
function history(weeks: number): Workout[] {
  const workouts: Workout[] = [];
  const dayMs = 86_400_000;
  const todayMs = Date.parse(`${TODAY}T08:00:00Z`);
  for (let week = 0; week < weeks; week += 1) {
    for (const dayInWeek of [2, 5]) {
      const startedAt = new Date(todayMs - (week * 7 + dayInWeek) * dayMs).toISOString();
      workouts.push({
        source: 'healthkit',
        startedAt,
        durationS: 2400,
        distanceM: 6000,
        avgHrBpm: 150,
        maxHrBpm: 172,
      });
    }
  }
  return workouts;
}

function resetStores() {
  useOnboardingStore.getState().reset();
  useJournalStore.setState({ entries: [] });
}

describe('useOnboardingStore — connexion santé (E1-1, E1-2)', () => {
  beforeEach(resetStores);

  it('importe 26 semaines, pré-remplit le volume et sort de calibration si ≥ 4 semaines', async () => {
    const adapter = createMockHealthAdapter(history(8));
    const permission = await useOnboardingStore
      .getState()
      .connectHealth({ adapter, today: TODAY });

    expect(permission).toBe('granted');
    const { health, context, currentStep } = useOnboardingStore.getState();
    expect(health.importedCount).toBe(16);
    expect(useJournalStore.getState().entries).toHaveLength(16);
    expect(health.calibrating).toBe(false);
    expect(health.historyWeeks).toBeGreaterThanOrEqual(4);
    // 2 × 6 km/sem sur la fenêtre de 4 semaines.
    expect(health.suggestedWeeklyVolumeKm).toBeCloseTo(12, 0);
    expect(context.weeklyVolumeKm).toBe(health.suggestedWeeklyVolumeKm);
    expect(currentStep).toBe('profil');
  });

  it('flag « jauge en calibration » si historique < 4 semaines', async () => {
    const adapter = createMockHealthAdapter(history(2));
    await useOnboardingStore.getState().connectHealth({ adapter, today: TODAY });
    expect(useOnboardingStore.getState().health.calibrating).toBe(true);
  });

  it('refus des permissions → mode 100 % déclaratif, rien d’importé', async () => {
    const adapter = {
      ...createMockHealthAdapter(history(8)),
      requestPermissions: () => Promise.resolve(false),
    };
    const permission = await useOnboardingStore
      .getState()
      .connectHealth({ adapter, today: TODAY });

    expect(permission).toBe('denied');
    const { health, currentStep } = useOnboardingStore.getState();
    expect(health.permission).toBe('denied');
    expect(health.importedCount).toBe(0);
    expect(useJournalStore.getState().entries).toHaveLength(0);
    // Le parcours continue : l’app reste fonctionnelle sans montre.
    expect(currentStep).toBe('profil');
  });

  it('« Plus tard » saute l’étape avec défaut (E1-7)', () => {
    useOnboardingStore.getState().skipHealth();
    expect(useOnboardingStore.getState().health.permission).toBe('skipped');
    expect(useOnboardingStore.getState().currentStep).toBe('profil');
  });
});

describe('useOnboardingStore — profil & âge minimum (E1-3, D12)', () => {
  beforeEach(resetStores);

  it('accepte un profil complet et pose le flag prudence', () => {
    const result = useOnboardingStore.getState().submitProfile({
      firstName: 'Marc',
      birthDate: '1990-04-12',
      hasRecentInjury: true,
      injuryNote: 'douleur au mollet au printemps',
      today: TODAY,
    });
    expect(result).toBe('ok');
    const { profile, currentStep } = useOnboardingStore.getState();
    expect(profile.firstName).toBe('Marc');
    expect(profile.hasRecentInjury).toBe(true);
    expect(currentStep).toBe('contexte');
  });

  it('bloque à moins de 16 ans, sans contournement (skip ni effacement de date)', () => {
    useOnboardingStore.getState().skipHealth(); // arrivée sur l'étape profil
    const result = useOnboardingStore.getState().submitProfile({
      birthDate: '2012-01-01',
      hasRecentInjury: false,
      today: TODAY,
    });
    expect(result).toBe('under_min_age');
    expect(useOnboardingStore.getState().ageBlocked).toBe(true);
    expect(useOnboardingStore.getState().currentStep).toBe('profil');

    // Le skip ne contourne pas le blocage…
    useOnboardingStore.getState().skipProfile();
    expect(useOnboardingStore.getState().currentStep).toBe('profil');

    // …ni l’effacement de la date.
    const cleared = useOnboardingStore.getState().submitProfile({
      hasRecentInjury: false,
      today: TODAY,
    });
    expect(cleared).toBe('under_min_age');
    expect(useOnboardingStore.getState().currentStep).toBe('profil');
  });

  it('la limite est exactement 16 ans révolus', () => {
    const justSixteen = useOnboardingStore.getState().submitProfile({
      birthDate: '2010-07-17',
      hasRecentInjury: false,
      today: TODAY,
    });
    expect(justSixteen).toBe('ok');

    useOnboardingStore.getState().reset();
    const almostSixteen = useOnboardingStore.getState().submitProfile({
      birthDate: '2010-07-18',
      hasRecentInjury: false,
      today: TODAY,
    });
    expect(almostSixteen).toBe('under_min_age');
  });

  it('une date corrigée (≥ 16 ans) débloque l’étape', () => {
    useOnboardingStore
      .getState()
      .submitProfile({ birthDate: '2015-01-01', hasRecentInjury: false, today: TODAY });
    const corrected = useOnboardingStore
      .getState()
      .submitProfile({ birthDate: '1995-01-01', hasRecentInjury: false, today: TODAY });
    expect(corrected).toBe('ok');
    expect(useOnboardingStore.getState().ageBlocked).toBe(false);
  });
});

describe('useOnboardingStore — contexte (E1-4)', () => {
  beforeEach(resetStores);

  it('valide séances/sem 2–6 et jours dispo', () => {
    const ok = useOnboardingStore.getState().submitContext({
      sessionsPerWeek: 3,
      preferredDays: [1, 3, 5],
      weeklyVolumeKm: 25,
    });
    expect(ok).toBe('ok');
    expect(useOnboardingStore.getState().currentStep).toBe('objectif');

    expect(
      useOnboardingStore
        .getState()
        .submitContext({ sessionsPerWeek: 1, preferredDays: [1], weeklyVolumeKm: 10 }),
    ).toBe('invalid');
    expect(
      useOnboardingStore
        .getState()
        .submitContext({ sessionsPerWeek: 7, preferredDays: [0, 1, 2, 3, 4, 5, 6] }),
    ).toBe('invalid');
    expect(
      useOnboardingStore.getState().submitContext({ sessionsPerWeek: 3, preferredDays: [] }),
    ).toBe('invalid');
  });

  it('le skip reprend le volume suggéré par l’import', async () => {
    await useOnboardingStore
      .getState()
      .connectHealth({ adapter: createMockHealthAdapter(history(8)), today: TODAY });
    useOnboardingStore.getState().skipContext();
    const { context } = useOnboardingStore.getState();
    expect(context.sessionsPerWeek).toBe(3);
    expect(context.weeklyVolumeKm).toBeCloseTo(12, 0);
    expect(useOnboardingStore.getState().currentStep).toBe('objectif');
  });
});

describe('useOnboardingStore — objectif & garde-fou moteur (E1-5, D5)', () => {
  beforeEach(() => {
    resetStores();
    useOnboardingStore.getState().submitContext({
      sessionsPerWeek: 3,
      preferredDays: [1, 3, 5],
      weeklyVolumeKm: 30,
    });
  });

  it('parcours nominal : objectif réaliste → plan généré, étape compte', () => {
    const result = useOnboardingStore.getState().submitGoal({
      goal: { raceDistance: 'semi', raceDate: '2026-10-25', ambition: 'finir' },
      today: TODAY,
      vmaKmh: 16.5,
    });
    expect(result.status).toBe('plan');
    const state = useOnboardingStore.getState();
    expect(state.goal?.raceDistance).toBe('semi');
    expect(state.plan).toBeDefined();
    expect(state.plan?.weeks.length).toBeGreaterThanOrEqual(8);
    expect(state.currentStep).toBe('compte');
  });

  it('objectif irréaliste → alternatives du moteur, jamais bloquant', () => {
    const result = useOnboardingStore.getState().submitGoal({
      goal: {
        raceDistance: 'marathon',
        raceDate: '2026-08-14',
        ambition: 'chrono',
        targetTimeS: 3 * 3600,
      },
      today: TODAY,
      vmaKmh: 14,
    });
    expect(result.status).toBe('unrealistic');
    if (result.status !== 'unrealistic') {
      throw new Error('unrealistic attendu');
    }
    expect(result.alternatives.length).toBeGreaterThan(0);
    // L'utilisateur reste sur l'étape, libre de choisir ou passer.
    expect(useOnboardingStore.getState().currentStep).toBe('objectif');

    const laterDate = result.alternatives.find((a) => a.type === 'later_date');
    expect(laterDate).toBeDefined();
    const applied = useOnboardingStore
      .getState()
      .applyAlternative(laterDate!, { today: TODAY, vmaKmh: 14 });
    // La date recalculée par le moteur mène à un plan sans « finir » l'ambition.
    expect(['plan', 'unrealistic']).toContain(applied.status);

    const finish = { type: 'finish_ambition' as const };
    const finishApplied = useOnboardingStore
      .getState()
      .applyAlternative(finish, { today: TODAY, vmaKmh: 14 });
    expect(finishApplied.status).not.toBe('invalid');
  });

  it('date passée → refus explicite du moteur (pas de plan)', () => {
    const result = useOnboardingStore.getState().submitGoal({
      goal: { raceDistance: '10k', raceDate: '2026-07-01', ambition: 'finir' },
      today: TODAY,
      vmaKmh: 16,
    });
    expect(result).toEqual({ status: 'refused', reason: 'race_date_not_ahead' });
  });

  it('objectif invalide (chrono sans temps cible) → invalid, rien d’enregistré', () => {
    const result = useOnboardingStore.getState().submitGoal({
      goal: { raceDistance: '10k', raceDate: '2026-10-25', ambition: 'chrono' },
      today: TODAY,
    });
    expect(result.status).toBe('invalid');
    expect(useOnboardingStore.getState().goal).toBeUndefined();
  });

  it('skip objectif (D5) → mode semaine type, étape compte', () => {
    useOnboardingStore.getState().skipGoal();
    const state = useOnboardingStore.getState();
    expect(state.goal).toBeUndefined();
    expect(state.goalSkipped).toBe(true);
    expect(state.plan).toBeUndefined();
    expect(state.currentStep).toBe('compte');
  });
});

describe('useOnboardingStore — reprise & complétion (E1-7)', () => {
  beforeEach(resetStores);

  it('reprend là où on s’est arrêté (currentStep)', () => {
    expect(useOnboardingStore.getState().currentStep).toBe('sante');
    useOnboardingStore.getState().skipHealth();
    useOnboardingStore
      .getState()
      .submitProfile({ firstName: 'Léa', hasRecentInjury: false, today: TODAY });
    // « Fermer l’app » : le store est la source de vérité de la reprise.
    expect(useOnboardingStore.getState().currentStep).toBe('contexte');
    expect(useOnboardingStore.getState().completed).toBe(false);
  });

  it('l’utilisateur qui ferme à l’étape compte reprend à l’étape compte', () => {
    useOnboardingStore.getState().skipHealth();
    useOnboardingStore.getState().skipProfile();
    useOnboardingStore.getState().skipContext();
    useOnboardingStore.getState().skipGoal();
    expect(useOnboardingStore.getState().currentStep).toBe('compte');
    expect(useOnboardingStore.getState().completed).toBe(false);
  });

  it('complete() marque l’onboarding terminé (racine → tabs)', () => {
    useOnboardingStore.getState().complete();
    expect(useOnboardingStore.getState().completed).toBe(true);
  });
});

describe('useOnboardingStore — rattachement au compte sans perte (E1-8, D2)', () => {
  beforeEach(resetStores);

  it('les données saisies avant compte survivent intégralement à attachToAccount', async () => {
    // Parcours complet avant compte : import santé + profil + contexte + objectif.
    await useOnboardingStore
      .getState()
      .connectHealth({ adapter: createMockHealthAdapter(history(8)), today: TODAY });
    useOnboardingStore.getState().submitProfile({
      firstName: 'Marc',
      birthDate: '1990-04-12',
      hasRecentInjury: true,
      injuryNote: 'mollet au printemps',
      today: TODAY,
    });
    useOnboardingStore.getState().submitContext({
      sessionsPerWeek: 3,
      preferredDays: [1, 3, 5],
      weeklyVolumeKm: 30,
    });
    useOnboardingStore.getState().submitGoal({
      goal: { raceDistance: 'semi', raceDate: '2026-10-25', ambition: 'finir' },
      today: TODAY,
      vmaKmh: 16.5,
    });

    const before = useOnboardingStore.getState();
    const profileBefore = structuredClone(before.profile);
    const contextBefore = structuredClone(before.context);
    const goalBefore = structuredClone(before.goal);
    const planBefore = structuredClone(before.plan);
    const healthBefore = structuredClone(before.health);
    const journalBefore = structuredClone(useJournalStore.getState().entries);
    expect(before.accountUserId).toBeUndefined();

    useOnboardingStore.getState().attachToAccount('mock-user-1');

    const after = useOnboardingStore.getState();
    expect(after.accountUserId).toBe('mock-user-1');
    expect(after.profile).toEqual(profileBefore);
    expect(after.context).toEqual(contextBefore);
    expect(after.goal).toEqual(goalBefore);
    expect(after.plan).toEqual(planBefore);
    expect(after.health).toEqual(healthBefore);
    expect(useJournalStore.getState().entries).toEqual(journalBefore);
    expect(useJournalStore.getState().entries).toHaveLength(16);
    expect(after.currentStep).toBe('restitution');
  });
});
