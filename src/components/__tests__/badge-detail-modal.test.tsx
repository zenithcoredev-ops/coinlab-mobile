import { fireEvent, render, screen } from '@testing-library/react-native';

import { translate } from '@/i18n/translate';
import { BADGE_META, BADGE_ORDER } from '@/lib/badges';
import { BadgeDetailModal } from '../badge-detail-modal';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/i18n', () => ({ useI18n: () => ({ language: 'tr', t: (k: string, p?: object) => require('@/i18n/translate').translate('tr', k, p) }) }));

describe('BadgeDetailModal', () => {
  it('says what an earned badge is for and when it was earned, and offers to share it', () => {
    const onShare = jest.fn();
    render(<BadgeDetailModal badge={{ id: 'week_streak', earnedAt: '2026-11-03T10:00:00Z' }} onClose={jest.fn()} onShare={onShare} />);
    expect(screen.getByText('7 Günlük Seri')).toBeTruthy();
    expect(screen.getByText('7 gün üst üste toplama yaparak serini 7 güne çıkar.')).toBeTruthy();
    expect(screen.getByText(/^Kazanıldı: 3 Kasım 2026$/)).toBeTruthy();
    fireEvent.press(screen.getByText('Paylaş'));
    expect(onShare).toHaveBeenCalledWith('week_streak');
  });

  it('for a locked badge: how to earn it, "not yet", no share', () => {
    render(<BadgeDetailModal badge={{ id: 'champion', earnedAt: null }} onClose={jest.fn()} onShare={jest.fn()} />);
    expect(screen.getByText('Elmas Turnuvası Finali’nde birinci ol.')).toBeTruthy();
    expect(screen.getByText('Henüz kazanılmadı')).toBeTruthy();
    expect(screen.queryByText('Paylaş')).toBeNull();
  });

  it('draws nothing without a badge', () => {
    expect(render(<BadgeDetailModal badge={null} onClose={jest.fn()} onShare={jest.fn()} />).toJSON()).toBeNull();
  });

  it('every badge says how to earn it in both languages', () => {
    for (const id of BADGE_ORDER) {
      for (const lang of ['tr', 'en'] as const) {
        const text = translate(lang, BADGE_META[id].how);
        expect([id, text === BADGE_META[id].how]).toEqual([id, false]);
      }
    }
  });
});
