import { compositeOver, contrastRatio, parseColor, tokenContrast } from '../contrast';

describe('contraste WCAG (src/lib/contrast)', () => {
  it('parse hex et rgba', () => {
    expect(parseColor('#0B0E13')).toEqual({ r: 11, g: 14, b: 19, a: 1 });
    expect(parseColor('rgba(74,222,128,.12)')).toEqual({ r: 74, g: 222, b: 128, a: 0.12 });
    expect(() => parseColor('bleu')).toThrow(RangeError);
  });

  it('noir sur blanc = 21, couleur sur elle-même = 1', () => {
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 255, g: 255, b: 255 };
    expect(contrastRatio(black, white)).toBeCloseTo(21);
    expect(contrastRatio(white, white)).toBeCloseTo(1);
  });

  it('compose un alpha sur un fond opaque', () => {
    const composed = compositeOver({ r: 74, g: 222, b: 128, a: 0.12 }, { r: 23, g: 28, b: 36 });
    expect(composed).toEqual({ r: 29, g: 51, b: 47 });
  });

  it('tokenContrast : texte sur action passe AA', () => {
    expect(tokenContrast('#04121C', '#38BDF8')).toBeGreaterThanOrEqual(4.5);
  });
});
