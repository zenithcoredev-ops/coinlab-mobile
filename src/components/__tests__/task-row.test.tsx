import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { TaskRow } from '@/components/task-row';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@/i18n', () => ({ useI18n: () => ({ language: 'tr', t: (k: string, p?: object) => require('@/i18n/translate').translate('tr', k, p) }) }));

const task = (id: string, over = {}) => ({ id, reward: 0.05, progress: 0, target: 1, isComplete: false, claimed: false, ...over });

describe('TaskRow', () => {
  it('a locked task says what opens it, and a tap explains it', () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    render(<TaskRow task={task('steps', { target: 5000, progress: 1240 })} busy={false} onClaim={jest.fn()} />);
    fireEvent.press(screen.getByText('5.000 adıma ulaşınca'));
    expect(alert).toHaveBeenCalledWith(expect.any(String), expect.stringMatching(/5\.000 olunca ödülünü alabilirsin/));
    expect(screen.queryByText('Kilitli')).toBeNull();
  });

  it('each kind of task names its own requirement', () => {
    render(<TaskRow task={task('mine')} busy={false} onClaim={jest.fn()} />);
    expect(screen.getByText('Toplamayı başlatınca açılır')).toBeTruthy();
    screen.rerender(<TaskRow task={task('friend')} busy={false} onClaim={jest.fn()} />);
    expect(screen.getByText('Arkadaşın katılınca')).toBeTruthy();
  });

  it('shows a progress bar for a counted task until it is claimed', () => {
    render(<TaskRow task={task('steps', { target: 5000, progress: 1240 })} busy={false} onClaim={jest.fn()} />);
    expect(screen.getByTestId('progress-fill')).toBeTruthy();
    screen.rerender(<TaskRow task={task('steps', { target: 5000, progress: 5000, isComplete: true, claimed: true })} busy={false} onClaim={jest.fn()} />);
    expect(screen.queryByTestId('progress-fill')).toBeNull();
  });

  it('a ready task can be claimed', () => {
    const onClaim = jest.fn();
    render(<TaskRow task={task('mine', { isComplete: true, progress: 1 })} busy={false} onClaim={onClaim} />);
    fireEvent.press(screen.getByText('Al'));
    expect(onClaim).toHaveBeenCalled();
  });
});
