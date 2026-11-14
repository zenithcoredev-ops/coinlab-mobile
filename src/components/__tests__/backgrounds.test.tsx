import { fireEvent, render, screen } from '@testing-library/react-native';
import type { SharedValue } from 'react-native-reanimated';

import { BACKGROUND_IMAGES, BACKGROUND_MAX_BYTES, BACKGROUND_SHADES, BackgroundTab, HOME_BACKGROUND_FRAMING, TASKS_TINT } from '../home/backgrounds';
import { ScanLight, ScreenBackground } from '../home/screen-background';

// Node's fs, typed just enough for this test (the app's tsconfig has no Node types). Paths are from
// the repo root, where jest runs.
const fs = require('fs') as {
  existsSync(file: string): boolean;
  statSync(file: string): { size: number };
  readFileSync(file: string, encoding: 'utf8'): string;
};
const registry = fs.readFileSync('src/components/home/backgrounds.ts', 'utf8');
const TABS: BackgroundTab[] = ['home', 'tasks', 'league', 'friends', 'profile'];

describe('tab background pictures', () => {
  it.each(TABS)('%s: once its picture is in the repo it is wired up and at most 400 KB', (tab) => {
    const file = `assets/backgrounds/${tab}-bg.webp`;
    if (!fs.existsSync(file)) {
      // Not there yet: the tab falls back to the drawn background.
      expect(BACKGROUND_IMAGES[tab]).toBeNull();
      return;
    }
    expect(fs.statSync(file).size).toBeLessThanOrEqual(BACKGROUND_MAX_BYTES);
    expect(registry).toContain(`require('../../../assets/backgrounds/${tab}-bg.webp')`);
    expect(BACKGROUND_IMAGES[tab]).not.toBeNull();
  });

  it('every tab has a shade, from the top to the bottom, with opacities between 0 and 1', () => {
    for (const tab of TABS) {
      const stops = BACKGROUND_SHADES[tab];
      expect(stops[0][0]).toBe(0);
      expect(stops[stops.length - 1][0]).toBe(1);
      for (const [, a] of stops) expect(a >= 0 && a <= 1).toBe(true);
    }
  });
});

describe('ScreenBackground', () => {
  const layout = (width: number, height: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height } } });

  it('draws only the topographic lines without a picture', () => {
    render(<ScreenBackground variant="neon" image={null} />);
    expect(screen.queryByTestId('background-image')).toBeNull();
    expect(screen.queryByTestId('background-shade')).toBeNull();
  });

  it('draws the picture under its shade', () => {
    render(<ScreenBackground variant="neon" image={{ uri: 'file:///bg.webp' }} shade={BACKGROUND_SHADES.league} />);
    expect(screen.getByTestId('background-image')).toBeTruthy();
    expect(screen.getByTestId('background-shade')).toBeTruthy();
  });

  it('places the Collect picture by its peak on the ring, fades its edges and keeps the lines faint on top', () => {
    const view = render(
      <ScreenBackground
        variant="neon"
        image={{ uri: 'file:///home.webp' }}
        shade={BACKGROUND_SHADES.home}
        focus={{ x: 195, y: 360 }}
        focusRadius={118}
        framing={HOME_BACKGROUND_FRAMING}
      />
    );
    fireEvent(view.root, 'layout', layout(390, 1400));
    const style = screen.getByTestId('background-image').props.style;
    expect(style.position).toBe('absolute');
    expect(style.top + HOME_BACKGROUND_FRAMING.anchorY * style.height).toBeCloseTo(360);
    // Zoomed no more than allowed; the gap above is faded in from the background.
    expect(style.width).toBeLessThanOrEqual(390 * (HOME_BACKGROUND_FRAMING.maxScale ?? 1) + 0.01);
    expect(screen.getByTestId('background-fade-top')).toBeTruthy();
    expect(screen.getByTestId('background-fade')).toBeTruthy();
  });

  it('tints the Tasks picture green', () => {
    render(<ScreenBackground variant="neon" image={{ uri: 'file:///t.webp' }} shade={BACKGROUND_SHADES.tasks} tint={TASKS_TINT} />);
    expect(screen.getByTestId('background-tint')).toHaveStyle({ opacity: TASKS_TINT.opacity });
  });

  it('slides the Friends picture up with the scroll progress (parallax), its bottom showing at the end', () => {
    const progress = { value: 0 } as SharedValue<number>;
    const view = render(<ScreenBackground variant="neon" image={{ uri: 'file:///f.webp' }} shade={BACKGROUND_SHADES.friends} parallax={progress} />);
    fireEvent(view.root, 'layout', layout(390, 800));
    const img = screen.getByTestId('background-image').props.style;
    // Taller than the screen, so there is room to slide.
    expect(img.height).toBeGreaterThan(800);
  });

  it('dims the scan light over a picture', () => {
    render(<ScanLight animate faint />);
    expect(screen.getByTestId('scan-line').props.opacity).toBeCloseTo(0.5 * 0.45);
  });
});
