/**
 * Mock jest de @sentry/react-native : le SDK natif ne se charge pas
 * sous Node. Mappé via `moduleNameMapper` (package.json).
 */
export function init(): void {
  // no-op en test
}
