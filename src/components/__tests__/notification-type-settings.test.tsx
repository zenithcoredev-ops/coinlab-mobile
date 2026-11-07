import { fireEvent, render, screen } from '@testing-library/react-native';

import { ALL_TYPES_ON } from '@/lib/notification-plan';
import { NotificationTypeSettings } from '../notification-type-settings';

jest.mock('@/i18n', () => ({ useI18n: () => ({ t: (k: string) => require('@/i18n/translate').translate('tr', k) }) }));
const mockSetType = jest.fn();
let mockState: { active: boolean; typePrefs: typeof ALL_TYPES_ON };
jest.mock('@/context/notifications', () => ({ useNotifications: () => ({ ...mockState, setTypeEnabled: mockSetType }) }));

beforeEach(() => {
  jest.clearAllMocks();
  mockState = { active: true, typePrefs: { ...ALL_TYPES_ON, boost: false } };
});

describe('NotificationTypeSettings', () => {
  it('has one switch per kind, in priority order, showing the saved choice', () => {
    render(<NotificationTypeSettings />);
    for (const label of ['Oturum bitti', 'Seri', 'Lig', 'Adım', 'Hız artırma', 'Geri dön']) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getByTestId('notif-type-boost').props.value).toBe(false);
    expect(screen.getByTestId('notif-type-league').props.value).toBe(true);
  });

  it('saves a change for that kind', () => {
    render(<NotificationTypeSettings />);
    fireEvent(screen.getByTestId('notif-type-comeback'), 'valueChange', false);
    expect(mockSetType).toHaveBeenCalledWith('comeback', false);
  });

  it('is disabled while the main switch is off', () => {
    mockState = { ...mockState, active: false };
    render(<NotificationTypeSettings />);
    expect(screen.getByTestId('notif-type-streak').props.disabled).toBe(true);
  });
});
