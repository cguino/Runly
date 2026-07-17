/**
 * Contraste WCAG — utilitaires purs pour le check AA des paires de tokens
 * (vérification Lot 2 : « contrastes AA vérifiés sur les paires token »).
 */

export type Rgb = { r: number; g: number; b: number };
export type Rgba = Rgb & { a: number };

/** Parse `#RRGGBB` ou `rgba(r,g,b,a)` (formats des tokens du thème). */
export function parseColor(color: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (hex && hex[1]) {
    const value = parseInt(hex[1], 16);
    return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff, a: 1 };
  }
  const rgba = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\.?\d*\.?\d*)\s*\)$/i.exec(
    color.trim(),
  );
  if (rgba) {
    return {
      r: Number(rgba[1]),
      g: Number(rgba[2]),
      b: Number(rgba[3]),
      a: Number(rgba[4]),
    };
  }
  throw new RangeError(`couleur non reconnue : ${color}`);
}

/** Compose une couleur alpha sur un fond opaque (alpha blending). */
export function compositeOver(foreground: Rgba, background: Rgb): Rgb {
  const blend = (fg: number, bg: number) => Math.round(foreground.a * fg + (1 - foreground.a) * bg);
  return {
    r: blend(foreground.r, background.r),
    g: blend(foreground.g, background.g),
    b: blend(foreground.b, background.b),
  };
}

/** Luminance relative WCAG 2.x. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (value: number) => {
    const srgb = value / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Ratio de contraste WCAG entre deux couleurs opaques (1 → 21). */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [dark, light] = la < lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Ratio de contraste entre deux tokens du thème ; si le premier porte un
 * alpha (fonds de pills), il est composé sur le fond opaque fourni.
 */
export function tokenContrast(foreground: string, background: string, under?: string): number {
  const bgParsed = parseColor(background);
  const base = under ? parseColor(under) : { r: 0, g: 0, b: 0 };
  const bg = bgParsed.a < 1 ? compositeOver(bgParsed, base) : bgParsed;
  const fgParsed = parseColor(foreground);
  const fg = fgParsed.a < 1 ? compositeOver(fgParsed, bg) : fgParsed;
  return contrastRatio(fg, bg);
}
