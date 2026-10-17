import { PlaceholderScreen } from '@/components/placeholder-screen';
import { useI18n } from '@/i18n';

export default function Screen() {
  const { t } = useI18n();
  return <PlaceholderScreen title={t('tabs.friends')} />;
}
