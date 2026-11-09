import { render, screen } from '@testing-library/react-native';

import { BACKGROUND_IMAGES, BACKGROUND_MAX_BYTES } from '../home/backgrounds';
import { ScreenBackground } from '../home/screen-background';

// Node's fs, typed just enough for this test (the app's tsconfig has no Node types). Paths are from
// the repo root, where jest runs.
const fs = require('fs') as {
  existsSync(file: string): boolean;
  statSync(file: string): { size: number };
  readFileSync(file: string, encoding: 'utf8'): string;
};
const TASKS_BG = 'assets/backgrounds/tasks-bg.webp';
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

  it('draws only the topographic lines without a picture, and the picture under a dark shade with one', () => {
    render(<ScreenBackground variant="neon" image={null} />);
    expect(screen.queryByTestId('background-image')).toBeNull();
    expect(screen.queryByTestId('background-shade')).toBeNull();

    render(<ScreenBackground variant="neon" image={{ uri: 'file:///bg.webp' }} />);
    expect(screen.getByTestId('background-image')).toBeTruthy();
    expect(screen.getByTestId('background-shade')).toBeTruthy();
  });
});
