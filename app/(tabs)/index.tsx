import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/ui';

export default function HomeScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t('screens.home.title')}
      subtitle={t('screens.home.placeholder')}
    />
  );
}
