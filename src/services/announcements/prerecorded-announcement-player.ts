import type { Announcement, AnnouncementKey, AnnouncementPlayer } from './announcement-player';

/**
 * Plan B audio (E5-4, `stack-technique.md`) : annonces **pré-enregistrées**
 * si le TTS s'avère fragile en beta (bug connu : TTS qui s'estompe en
 * arrière-plan iOS). La clé d'annonce mappe un fichier audio ; les textes
 * dynamiques (allures) seront couverts par des variantes enregistrées.
 *
 * ⚠️ Squelette assumé (règle transverse n°10, signalé en PR) : la lecture
 * réelle passera par **expo-audio** (pas expo-av, déprécié) quand les
 * fichiers seront produits — la dépendance n'est pas encore installée pour
 * ne pas alourdir le build tant que le TTS tient. L'interface, elle, est
 * définitive : basculer = changer la factory injectée dans le player.
 */

/** Sources audio par clé d'annonce (assets `require(...)` côté app). */
export type AnnouncementAssetMap = Partial<Record<AnnouncementKey, unknown>>;

export function createPrerecordedAnnouncementPlayer(
  assets: AnnouncementAssetMap,
  /** Lecteur injecté (expo-audio) — à brancher à l'activation du plan B. */
  play?: (asset: unknown) => void,
): AnnouncementPlayer {
  return {
    announce: (announcement: Announcement) => {
      const asset = assets[announcement.key];
      if (asset !== undefined && play !== undefined) {
        play(asset);
      }
    },
    stop: () => undefined,
  };
}
