import { render, screen } from '@testing-library/react-native';

import { BACKGROUND_IMAGES, BACKGROUND_MAX_BYTES, HOME_BACKGROUND_FRAMING } from '../home/backgrounds';
import { ScanLight, ScreenBackground } from '../home/screen-background';

// Node's fs, typed just enough for this test (the app's tsconfig has no Node types). Paths are from
// the repo root, where jest runs.
const fs = require('fs') as {
  existsSync(file: string): boolean;
  statSync(file: string): { size: number };
  readFileSync(file: string, encoding: 'utf8'): string;
};
const TASKS_BG = 'assets/backgrounds/tasks-bg.webp';
const LEAGUE_BG = 'assets/backgrounds/league-bg.webp';
const registry = fs.readFileSync('src/components/home/backgrounds.ts', 'utf8');

describe('tab backgrounds', () => {
  it('the Tasks picture, once in the repo, is wired up in backgrounds.ts and at most 400 KB', () => {
    if (!fs.existsSync(TASKS_BG)) {
      // Not there yet: the tab falls back to the drawn background.
      expect(BACKGROUND_IMAGES.tasks).toBeNull();
      return;
    }
    expect(fs.statSync(TASKS_BG).size).toBeLessThanOrEqual(BACKGROUND_MAX_BYTES);
    expect(registry).toMatch(/require\('\.\.\/\.\.\/\.\.\/assets\/backgrounds\/tasks-bg\.webp'\)/);
  });

  it('the League picture, once in the repo, is wired up in backgrounds.ts and at most 400 KB', () => {
    if (!fs.existsSync(LEAGUE_BG)) {
      expect(BACKGROUND_IMAGES.league).toBeNull();
      return;
    }
    expect(fs.statSync(LEAGUE_BG).size).toBeLessThanOrEqual(BACKGROUND_MAX_BYTES);
    expect(registry).toMatch(/require\('\.\.\/\.\.\/\.\.\/assets\/backgrounds\/league-bg\.webp'\)/);
  });

  it('the Profile picture, once in the repo, is wired up in backgrounds.ts and at most 400 KB', () => {
    const file = 'assets/backgrounds/profile-bg.webp';
    if (!fs.existsSync(file)) {
      expect(BACKGROUND_IMAGES.profile).toBeNull();
      return;
    }
    expect(fs.statSync(file).size).toBeLessThanOrEqual(BACKGROUND_MAX_BYTES);
    expect(registry).toMatch(/require\('\.\.\/\.\.\/\.\.\/assets\/backgrounds\/profile-bg\.webp'\)/);
  });

  it('the Collect picture, once in the repo, is wired up in backgrounds.ts and at most 400 KB', () => {
    const file = 'assets/backgrounds/home-bg.webp';
    if (!fs.existsSync(file)) {
      // Not there yet: the Collect screen keeps its drawn background.
      expect(BACKGROUND_IMAGES.home).toBeNull();
      return;
    }
    expect(fs.statSync(file).size).toBeLessThanOrEqual(BACKGROUND_MAX_BYTES);
    expect(registry).toMatch(/require\('\.\.\/\.\.\/\.\.\/assets\/backgrounds\/home-bg\.webp'\)/);
  });

  it('places the Collect picture by its peak, fades its lower edge and keeps the lines faint on top', () => {
    const layout = { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 1400 } } };
    const view = render(
      <ScreenBackground
        variant="neon"
        image={{ uri: 'file:///home.webp' }}
        shade="centerLight"
        focus={{ x: 195, y: 420 }}
        focusRadius={118}
        framing={HOME_BACKGROUND_FRAMING}
      />
    );
    const { fireEvent } = require('@testing-library/react-native');
    fireEvent(view.root, 'layout', layout);
    const img = screen.getByTestId('background-image');
    const style = img.props.style;
    expect(style.position).toBe('absolute');
    expect(style.top + HOME_BACKGROUND_FRAMING.anchorY * style.height).toBeCloseTo(420);
    expect(screen.getByTestId('background-shade')).toBeTruthy();
    expect(screen.getByTestId('background-fade')).toBeTruthy();
  });

  it('dims the scan light over a picture', () => {
    render(<ScanLight animate faint />);
    expect(screen.getByTestId('scan-line').props.opacity).toBeCloseTo(0.5 * 0.45);
  });

  it('can let the top of a picture show through (Profile)', () => {
    render(<ScreenBackground variant="neon" image={{ uri: 'file:///bg.webp' }} shade="topReveal" />);
    expect(screen.getByTestId('background-shade')).toBeTruthy();
  });

  it('can shade a picture darker at the top and bottom', () => {
    render(<ScreenBackground variant="neon" image={{ uri: 'file:///bg.webp' }} shade="graded" />);
    expect(screen.getByTestId('background-shade')).toBeTruthy();
  });

  it('draws only the topographic lines without a picture, and the picture under a dark shade with one', () => {
    render(<ScreenBackground variant="neon" image={null} />);
    expect(screen.queryByTestId('background-image')).toBeNull();
    expect(screen.queryByTestId('background-shade')).toBeNull();

    render(<ScreenBackground variant="neon" image={{ uri: 'file:///bg.webp' }} />);
    expect(screen.getByTestId('background-image')).toBeTruthy();
    expect(screen.getByTestId('background-shade')).toBeTruthy();
  });
});
