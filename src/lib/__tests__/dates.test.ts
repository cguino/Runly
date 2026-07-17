import { addDays, dayOfWeek, diffDays, nextMonday, yearsBetween } from '../dates';

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

  it('yearsBetween : années révolues, anniversaire compté le jour même (D12)', () => {
    expect(yearsBetween('2010-07-17', '2026-07-17')).toBe(16); // anniversaire le jour J
    expect(yearsBetween('2010-07-18', '2026-07-17')).toBe(15); // veille de l'anniversaire
    expect(yearsBetween('2010-01-01', '2026-07-17')).toBe(16);
    expect(yearsBetween('2010-12-31', '2026-07-17')).toBe(15);
  });
});
