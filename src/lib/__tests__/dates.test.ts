import { addDays, dayOfWeek, diffDays, nextMonday } from '../dates';

describe('src/lib/dates', () => {
  it('addDays traverse mois et années', () => {
    expect(addDays('2026-07-16', 1)).toBe('2026-07-17');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-07-16', -16)).toBe('2026-06-30');
  });

  it('diffDays est orienté (b − a)', () => {
    expect(diffDays('2026-07-16', '2026-10-18')).toBe(94);
    expect(diffDays('2026-07-16', '2026-07-09')).toBe(-7);
  });

  it('dayOfWeek : 0 = lundi … 6 = dimanche', () => {
    expect(dayOfWeek('2026-07-16')).toBe(3); // jeudi
    expect(dayOfWeek('2026-07-20')).toBe(0); // lundi
    expect(dayOfWeek('2026-07-19')).toBe(6); // dimanche
  });

  it('nextMonday est strictement postérieur', () => {
    expect(nextMonday('2026-07-16')).toBe('2026-07-20');
    expect(nextMonday('2026-07-20')).toBe('2026-07-27');
  });

  it('rejette un format invalide', () => {
    expect(() => addDays('16/07/2026', 1)).toThrow(RangeError);
  });
});
