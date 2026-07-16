import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/ui';

export default function PlanScreen() {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen title={t('screens.plan.title')} subtitle={t('screens.plan.placeholder')} />
  );
}
