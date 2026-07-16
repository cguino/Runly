import { goalSchema, physioProfileSchema, RACE_DISTANCES_M, workoutSchema } from '../index';

describe('workoutSchema', () => {
  const base = {
    source: 'healthkit',
    startedAt: '2026-07-10T07:30:00+02:00',
    durationS: 2820,
    distanceM: 9000,
    avgHrBpm: 152,
    maxHrBpm: 171,
  };

  it('valide un workout agrégé multi-sources', () => {
    expect(workoutSchema.parse(base).source).toBe('healthkit');
  });

  it('rejette une source inconnue et une durée nulle', () => {
    expect(workoutSchema.safeParse({ ...base, source: 'garmin' }).success).toBe(false);
    expect(workoutSchema.safeParse({ ...base, durationS: 0 }).success).toBe(false);
  });
});

describe('goalSchema (D5)', () => {
  it('valide un objectif chrono avec temps cible', () => {
    const goal = goalSchema.parse({
      raceDistance: 'semi',
      raceDate: '2026-10-18',
      ambition: 'chrono',
      targetTimeS: 6300,
    });
    expect(goal.status).toBe('active');
  });

  it('exige un temps cible quand l’ambition est chrono', () => {
    const result = goalSchema.safeParse({
      raceDistance: '10k',
      raceDate: '2026-09-01',
      ambition: 'chrono',
    });
    expect(result.success).toBe(false);
  });

  it('accepte « finir » sans temps cible', () => {
    const result = goalSchema.safeParse({
      raceDistance: 'marathon',
      raceDate: '2027-04-11',
      ambition: 'finir',
    });
    expect(result.success).toBe(true);
  });

  it('porte les distances officielles', () => {
    expect(RACE_DISTANCES_M.semi).toBeCloseTo(21097.5);
    expect(RACE_DISTANCES_M.marathon).toBe(42195);
  });
});

describe('physioProfileSchema', () => {
  it('valide un profil avec confiance par champ et révisions', () => {
    const profile = physioProfileSchema.parse({
      vmaKmh: { value: 16.5, confidence: 'estime' },
      fcmaxBpm: { value: 187, confidence: 'defaut' },
      revisions: [
        {
          field: 'vmaKmh',
          previousValue: null,
          newValue: 16.5,
          source: 'manuel',
          at: '2026-07-16T10:00:00+02:00',
        },
      ],
    });
    expect(profile.vmaKmh?.confidence).toBe('estime');
    expect(profile.revisions).toHaveLength(1);
  });

  it('rejette un niveau de confiance inconnu', () => {
    const result = physioProfileSchema.safeParse({
      vmaKmh: { value: 16.5, confidence: 'sûr' },
    });
    expect(result.success).toBe(false);
  });
});
