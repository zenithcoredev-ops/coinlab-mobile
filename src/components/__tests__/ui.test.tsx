import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { theme } from '@/theme';
import { EmptyState, ProgressBar } from '../ui';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const fill = () => StyleSheet.flatten(screen.getByTestId('progress-fill').props.style);

describe('ProgressBar', () => {
  it('fills green while going and turns gold once complete', () => {
    render(<ProgressBar progress={0.4} />);
    expect(fill()).toMatchObject({ width: '40%', backgroundColor: theme.colors.progressFill, height: 10 });
    screen.rerender(<ProgressBar progress={1} />);
    expect(fill()).toMatchObject({ width: '100%', backgroundColor: theme.colors.progressDone });
  });

  it('keeps the value between 0 and 100%', () => {
    render(<ProgressBar progress={1.7} />);
    expect(fill().width).toBe('100%');
    screen.rerender(<ProgressBar progress={-1} />);
    expect(fill().width).toBe('0%');
    screen.rerender(<ProgressBar progress={NaN} />);
    expect(fill().width).toBe('0%');
  });
});

describe('EmptyState', () => {
  it('shows the title and the line', () => {
    render(<EmptyState icon="people-outline" title="Henüz davet yok" body="Kodunu paylaş." />);
    expect(screen.getByText('Henüz davet yok')).toBeTruthy();
    expect(screen.getByText('Kodunu paylaş.')).toBeTruthy();
  });
});
