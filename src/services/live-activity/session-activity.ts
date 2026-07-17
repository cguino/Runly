/**
 * Live Activity iOS / notification riche Android (E5-7) — abstraction.
 *
 * Cible (plan §Lot 6) : target SwiftUI via **expo-apple-targets** avec
 * `Text(timerInterval:)` (timer auto-rafraîchi sans update réseau) côté
 * iOS ; notification riche adossée au foreground service côté Android.
 * Les updates ne partent **qu'aux transitions de blocs** (pas de tick).
 *
 * ⚠️ Implémentation no-op assumée (règle transverse n°10, signalée en PR) :
 * le module natif expo-apple-targets exige un prebuild + device et n'est ni
 * installable ni testable dans cet environnement. Le player appelle déjà ce
 * service à chaque transition — brancher le natif = remplacer la factory.
 */

export type SessionActivityInfo = {
  /** Titre de la séance (« Seuil 2 × 10 min »). */
  title: string;
  /** Bloc courant (« Série 1/2 · 10:00 @ 4:45–5:00 /km »). */
  stepLabel: string;
  /**
   * Fin prévue du bloc courant (epoch ms) pour `Text(timerInterval:)` —
   * undefined pour les blocs en distance ou en pause.
   */
  stepEndsAtMs?: number;
  /** Allure cible affichée (déjà formatée). */
  targetPaceLabel?: string;
  /** Prochain bloc (déjà formaté). */
  nextStepLabel?: string;
  paused: boolean;
};

export type SessionActivityService = {
  start: (info: SessionActivityInfo) => Promise<void>;
  update: (info: SessionActivityInfo) => Promise<void>;
  end: () => Promise<void>;
};

/** No-op documenté — remplacé par l'implémentation native sur device. */
export function createNoopSessionActivityService(): SessionActivityService {
  return {
    start: () => Promise.resolve(),
    update: () => Promise.resolve(),
    end: () => Promise.resolve(),
  };
}

/** Factory par défaut de l'app (no-op tant que le natif n'est pas branché). */
export function createDefaultSessionActivityService(): SessionActivityService {
  return createNoopSessionActivityService();
}
