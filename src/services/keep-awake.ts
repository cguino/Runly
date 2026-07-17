/**
 * Écran toujours actif pendant la séance (charte §6) — ré-exporté ici pour
 * respecter la frontière plan §2 : `features` ne touche pas les APIs
 * natives directement, tout passe par `src/services`.
 */
export { useKeepAwake } from 'expo-keep-awake';
