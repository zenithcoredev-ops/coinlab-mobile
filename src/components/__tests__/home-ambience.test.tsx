import { fireEvent, render, screen } from '@testing-library/react-native';

import { HOME_BACKGROUND_FRAMING } from '../home/backgrounds';
import { HomeAmbience, RING_CLEARANCE } from '../home/home-ambience';
import { ScreenBackground } from '../home/screen-background';
import { starField } from '@/lib/home-ambience';

const rect = { left: -58, top: 120, width: 507, height: 1060 };
const ring = { x: 195, y: 360, radius: 118 };

describe('HomeAmbience', () => {
  it('draws the stars, the path light and the flag glow while motion is allowed', () => {
    render(<HomeAmbience rect={rect} ring={ring} animate />);
    // 15-25 stars stay in sight once those near the ring are left out.
    const n = screen.getAllByTestId('ambience-star').length;
    expect(n).toBeGreaterThanOrEqual(15);
    expect(n).toBeLessThanOrEqual(starField().length);
    expect(screen.getByTestId('ambience-path-light')).toBeTruthy();
    expect(screen.getByTestId('ambience-flag')).toBeTruthy();
  });

  it('leaves out stars close to the collecting ring, clear of its sparks', () => {
    // A ring placed over the sky: stars inside it (plus a margin) are not drawn.
    const skyRing = { x: 195, y: rect.top + 0.09 * rect.height, radius: 118 };
    render(<HomeAmbience rect={rect} ring={skyRing} animate />);
    const drawn = screen.getAllByTestId('ambience-star');
    expect(drawn.length).toBeLessThan(starField().length);
    for (const s of drawn) expect(Math.hypot(s.props.cx - skyRing.x, s.props.cy - skyRing.y)).toBeGreaterThan(skyRing.radius + RING_CLEARANCE);
  });

  it('draws nothing when motion is off (screen hidden, background, reduce motion, battery saver)', () => {
    render(<HomeAmbience rect={rect} ring={ring} animate={false} />);
    expect(screen.queryByTestId('home-ambience')).toBeNull();
  });

  it('is laid over the Collect picture only once it is framed', () => {
    const view = render(
      <ScreenBackground
        variant="neon"
        image={{ uri: 'file:///home.webp' }}
        focus={{ x: 195, y: 360 }}
        framing={HOME_BACKGROUND_FRAMING}
        ambience={(r) => <HomeAmbience rect={r} ring={ring} animate />}
      />
    );
    expect(screen.queryByTestId('home-ambience')).toBeNull();
    fireEvent(view.root, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 1400 } } });
    expect(screen.getByTestId('home-ambience')).toBeTruthy();
  });
});
