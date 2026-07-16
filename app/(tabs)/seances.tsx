import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/ui';

export default function SessionsScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t('screens.sessions.title')}
      subtitle={t('screens.sessions.placeholder')}
    />
  );
}
