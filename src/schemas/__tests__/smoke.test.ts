import { confidenceSchema, workoutSourceSchema } from '../index';

describe('src/schemas (fumée)', () => {
  it('valide les sources de séance de la spec §9', () => {
    expect(workoutSourceSchema.parse('strava')).toBe('strava');
    expect(() => workoutSourceSchema.parse('garmin')).toThrow();
  });

  it('valide les niveaux de confiance physio', () => {
    expect(confidenceSchema.parse('estime')).toBe('estime');
  });
});
