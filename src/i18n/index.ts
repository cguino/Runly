/**
 * Module i18n (D7 : i18n-ready, FR seul au MVP).
 * Importer ce module initialise i18next ; les composants consomment
 * les strings via `useTranslation()` de react-i18next.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { fr } from './fr';

export const defaultNS = 'translation';

if (!i18n.isInitialized) {
  // eslint-disable-next-line import/no-named-as-default-member -- API i18next standard : chaînage sur l'instance globale
  void i18n.use(initReactI18next).init({
    lng: 'fr',
    fallbackLng: 'fr',
    defaultNS,
    resources: { fr: { [defaultNS]: fr } },
    interpolation: {
      // React échappe déjà les valeurs interpolées.
      escapeValue: false,
    },
    returnNull: false,
  });
}

export { fr } from './fr';
export type { FrResources } from './fr';
export {
  formatApprox,
  formatDecimal,
  formatDistanceKm,
  formatDuration,
  formatPace,
} from './format';

export default i18n;
