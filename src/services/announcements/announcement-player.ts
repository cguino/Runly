/**
 * Annonces audio du player (E5-4) — abstraction `AnnouncementPlayer`.
 *
 * Les annonces sont **structurées** (clé stable + texte localisé) pour que
 * les deux implémentations coexistent derrière la même interface :
 * - TTS expo-speech (défaut, `tts-announcement-player.ts`) ;
 * - fichiers pré-enregistrés (plan B `stack-technique.md`, la clé mappe un
 *   asset audio — `prerecorded-announcement-player.ts`).
 * Le wording des textes vient de `src/i18n` (jamais de string en dur ici).
 */

export type AnnouncementKey =
  | 'session_started'
  | 'block_start'
  | 'block_recovery'
  | 'session_paused'
  | 'session_resumed'
  | 'session_completed';

export type Announcement = {
  key: AnnouncementKey;
  /** Texte parlé (déjà localisé par l'appelant). */
  text: string;
};

export type AnnouncementPlayer = {
  announce: (announcement: Announcement) => void;
  stop: () => void;
};

/** Implémentation silencieuse (tests, mode carte, préférence audio off). */
export function createSilentAnnouncementPlayer(): AnnouncementPlayer {
  return {
    announce: () => undefined,
    stop: () => undefined,
  };
}
