import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/ui';

export default function ProfileScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t('screens.profile.title')}
      subtitle={t('screens.profile.placeholder')}
    />
  );
}
