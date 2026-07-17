/**
 * Types du domaine notifications (Lot 9, E9-1) — TypeScript pur, zéro
 * import Expo : la planification est testable sans module natif.
 */

/** Les 4 types de notification du MVP (E9-1, E9-2) — préférence on/off par type. */
export const NOTIFICATION_TYPES = [
  'ta_semaine',
  'rappel_seance',
  'demande_rpe',
  'recap_hebdo',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Préférences par type (E9-1) : tout activé par défaut, désactivable un à un. */
export type NotificationPrefs = Record<NotificationType, boolean>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  ta_semaine: true,
  rappel_seance: true,
  demande_rpe: true,
  recap_hebdo: true,
};

/**
 * Instant local « mur » : date civile + heure locale de l'utilisateur.
 * La planification raisonne en heure locale (un lundi 8 h reste un lundi
 * 8 h quel que soit le fuseau) ; seule la conversion en `Date` — dans
 * l'adaptateur — touche au fuseau du device.
 */
export type LocalDateTime = {
  /** Date civile locale, ISO `YYYY-MM-DD`. */
  date: string;
  /** Heure locale 0–23. */
  hour: number;
  /** Minute locale 0–59. */
  minute: number;
};

export type NotificationContent = {
  title: string;
  body: string;
};

export type PlannedNotification = {
  /**
   * Identifiant stable `type:clé-temporelle` — clé de dédoublonnage :
   * replanifier deux fois la même notification produit le même id.
   */
  id: string;
  type: NotificationType;
  /** Instant de déclenchement, en heure locale. */
  fireAt: LocalDateTime;
  content: NotificationContent;
  /** Route expo-router à ouvrir au tap (ex. `/rpe-entry`). */
  url?: string;
};

/** Type d'une notification depuis son id (`type:...`), si reconnu. */
export function notificationTypeOfId(id: string): NotificationType | undefined {
  const prefix = id.split(':', 1)[0];
  return NOTIFICATION_TYPES.find((type) => type === prefix);
}
