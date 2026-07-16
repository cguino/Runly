const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/**
 * Motifs interdits dans les modules purs (`training-engine`, `schemas`) :
 * zéro import React/Expo (plan d'implémentation §2).
 */
const REACT_AND_EXPO_PATTERNS = [
  {
    group: [
      'react',
      'react/*',
      'react-dom',
      'react-dom/*',
      'react-native',
      'react-native/*',
      'react-native-*',
      'expo',
      'expo/*',
      'expo-*',
      '@expo/*',
      '@react-native/*',
      '@react-navigation/*',
      'react-i18next',
      '@sentry/react-native',
    ],
    message:
      'training-engine et schemas sont des modules TypeScript purs : aucun import React/Expo (plan §2).',
  },
];

/** APIs santé/Strava : accessibles uniquement depuis `src/services` (plan §2). */
const HEALTH_STRAVA_PATTERNS = [
  {
    group: [
      '@kingstinct/react-native-healthkit',
      '@kingstinct/react-native-healthkit/*',
      'react-native-health-connect',
      'react-native-health-connect/*',
      'expo-auth-session',
      'expo-auth-session/*',
    ],
    message:
      'features n’accède jamais directement aux APIs santé/Strava : passer par src/services (plan §2).',
  },
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'supabase/functions/*'],
  },
  {
    files: ['src/training-engine/**/*.{ts,tsx}', 'src/schemas/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: REACT_AND_EXPO_PATTERNS }],
    },
  },
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features', '@/features/*', '**/features', '**/features/*'],
              message: 'ui n’importe pas features (plan §2) : inverser la dépendance.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: HEALTH_STRAVA_PATTERNS }],
    },
  },
]);
