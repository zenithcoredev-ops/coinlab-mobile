import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { CollapsibleCard } from '../collapsible-card';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
const AsyncStorage = require('@react-native-async-storage/async-storage');

const card = () => (
  <CollapsibleCard id="league" title="Nasıl kazanılır?">
    <Text>adımlar</Text>
  </CollapsibleCard>
);
const settle = () => act(async () => {});

beforeEach(() => AsyncStorage.clear());

describe('CollapsibleCard', () => {
  it('is open the first time it is ever shown, then starts folded', async () => {
    render(card());
    await settle();
    expect(screen.getByText('adımlar')).toBeTruthy();

    screen.unmount();
    render(card());
    await settle();
    expect(screen.queryByText('adımlar')).toBeNull();
    expect(screen.getByText('Nasıl kazanılır?')).toBeTruthy();
  });

  it('opens and folds on tapping the title', async () => {
    await AsyncStorage.setItem('coinlab_howto_seen_league', '1');
    render(card());
    await settle();
    fireEvent.press(screen.getByRole('button'));
    expect(screen.getByText('adımlar')).toBeTruthy();
    fireEvent.press(screen.getByRole('button'));
    expect(screen.queryByText('adımlar')).toBeNull();
  });

  it('remembers each card on its own', async () => {
    await AsyncStorage.setItem('coinlab_howto_seen_league', '1');
    render(
      <CollapsibleCard id="tasks" title="Görevler">
        <Text>görev adımları</Text>
      </CollapsibleCard>
    );
    await settle();
    expect(screen.getByText('görev adımları')).toBeTruthy();
  });
});
