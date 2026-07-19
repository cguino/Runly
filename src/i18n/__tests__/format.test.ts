import {
  formatApprox,
  formatDateFr,
  formatDecimal,
  formatDistanceKm,
  formatDuration,
  formatPace,
} from '../format';

const NNBSP = ' ';

describe('formatPace', () => {
  it('formate le cas canonique de la spec §7.3 : allure semi ≈ 4:59 /km', () => {
    expect(formatPace(299)).toBe(`4:59${NNBSP}/km`);
  });

  it('padde les secondes sur deux chiffres', () => {
    expect(formatPace(305)).toBe(`5:05${NNBSP}/km`);
  });

  it('arrondit les secondes fractionnaires', () => {
    expect(formatPace(299.4)).toBe(`4:59${NNBSP}/km`);
  });

  it('rejette une allure nulle ou négative', () => {
    expect(() => formatPace(0)).toThrow(RangeError);
    expect(() => formatPace(-10)).toThrow(RangeError);
  });
});

describe('formatDecimal', () => {
  it('utilise la virgule décimale française (charte §5)', () => {
    expect(formatDecimal(1.12)).toBe('1,12');
  });

  it('respecte le nombre de décimales demandé', () => {
    expect(formatDecimal(1.5, 1)).toBe('1,5');
    expect(formatDecimal(2, 0)).toBe('2');
  });
});

describe('formatDistanceKm', () => {
  it('affiche les kilomètres entiers sans décimale', () => {
    expect(formatDistanceKm(9000)).toBe(`9${NNBSP}km`);
  });

  it('affiche une décimale avec virgule sinon', () => {
    expect(formatDistanceKm(9500)).toBe(`9,5${NNBSP}km`);
  });
});

describe('formatDuration', () => {
  it('affiche les durées courtes en minutes', () => {
    expect(formatDuration(2820)).toBe(`47${NNBSP}min`);
  });

  it('affiche les durées longues en heures + minutes paddées', () => {
    expect(formatDuration(3900)).toBe(`1${NNBSP}h${NNBSP}05`);
    expect(formatDuration(7200)).toBe(`2${NNBSP}h`);
  });
});

describe('formatDateFr', () => {
  it('formate une date ISO en JJ/MM/AAAA', () => {
    expect(formatDateFr('2026-07-16')).toBe('16/07/2026');
    expect(formatDateFr('2026-07-16T10:00:00+02:00')).toBe('16/07/2026');
  });

  it('rejette une chaîne non ISO', () => {
    expect(() => formatDateFr('16/07/2026')).toThrow(RangeError);
  });
});

describe('formatApprox', () => {
  it('préfixe avec « ≈ » (charte §5)', () => {
    expect(formatApprox(`47${NNBSP}min`)).toBe(`≈${NNBSP}47${NNBSP}min`);
  });
});
