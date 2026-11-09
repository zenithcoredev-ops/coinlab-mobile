import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { NEON_CARD } from '@/lib/neon-frame';
import { NeonCard } from '../neon-card';

const layout = (width: number, height: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height } } });

describe('NeonCard', () => {
  it('draws its halo outside the card once it knows its size, without clipping it', () => {
    render(
      <NeonCard testID="card">
        <Text>Hi</Text>
      </NeonCard>
    );
    expect(screen.queryByTestId('neon-frame')).toBeNull();
    fireEvent(screen.getByTestId('card'), 'layout', layout(300, 120));

    const frame = screen.getByTestId('neon-frame');
    expect(frame.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ left: -NEON_CARD.halo, top: -NEON_CARD.halo, width: 300 + 2 * NEON_CARD.halo })])
    );
    // Drawn, not a shadow, so Android shows it too; cached while scrolling.
    expect(screen.getAllByTestId('neon-halo')).toHaveLength(NEON_CARD.haloLayers);
    expect(frame.props.renderToHardwareTextureAndroid).toBe(true);
    expect(screen.getByTestId('card')).toHaveStyle({ overflow: 'visible' });
    expect(screen.getByText('Hi')).toBeTruthy();
  });

  it('is a button when it can be pressed', () => {
    const onPress = jest.fn();
    render(
      <NeonCard testID="card" onPress={onPress} accessibilityLabel="Lig">
        <Text>Lig</Text>
      </NeonCard>
    );
    fireEvent.press(screen.getByLabelText('Lig'));
    expect(onPress).toHaveBeenCalled();
  });
});
