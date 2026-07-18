import * as Speech from 'expo-speech';

import type { AnnouncementPlayer } from './announcement-player';

/**
 * Implémentation TTS par défaut (E5-4) : expo-speech + `UIBackgroundModes:
 * ["audio"]` (app.json) pour l'écran verrouillé iOS. Risque n°1 du MVP
 * (`stack-technique.md`) : TTS qui s'estompe en arrière-plan iOS — se
 * valide sur device en beta ; le plan B (fichiers pré-enregistrés) est prêt
 * derrière la même interface.
 */
export function createTtsAnnouncementPlayer(language = 'fr-FR'): AnnouncementPlayer {
  return {
    announce: ({ text }) => {
      // Une annonce chasse l'autre : en course, la plus récente prime.
      Speech.stop();
      Speech.speak(text, { language });
    },
    stop: () => {
      Speech.stop();
    },
  };
}
