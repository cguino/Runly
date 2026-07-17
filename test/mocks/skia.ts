/**
 * Mock jest de @shopify/react-native-skia : le moteur natif Skia ne se
 * charge pas sous Node. Mappé via `moduleNameMapper` (package.json),
 * comme le mock Sentry. Couvre uniquement la surface utilisée par
 * `src/ui/Gauge.tsx`.
 */

type MockPath = {
  addArc: (...args: unknown[]) => MockPath;
  moveTo: (...args: unknown[]) => MockPath;
  lineTo: (...args: unknown[]) => MockPath;
};

function makePath(): MockPath {
  const path: MockPath = {
    addArc: () => path,
    moveTo: () => path,
    lineTo: () => path,
  };
  return path;
}

export const Skia = {
  Path: { Make: makePath },
  XYWHRect: (x: number, y: number, width: number, height: number) => ({ x, y, width, height }),
};

export function Canvas(): null {
  return null;
}

export function Path(): null {
  return null;
}
