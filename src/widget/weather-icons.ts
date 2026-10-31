/**
 * MET Norway symbol codes (e.g. "clearsky_day", "lightrainshowers_night", "heavysnowandthunder") are a
 * condition plus an optional _day/_night/_polartwilight suffix. The widget draws one of these icons.
 */
export type WeatherIcon =
  | 'clear-day'
  | 'clear-night'
  | 'partly-day'
  | 'partly-night'
  | 'cloudy'
  | 'fog'
  | 'rain'
  | 'sleet'
  | 'snow'
  | 'thunder';

export function weatherIconFor(symbol: string, isDay: boolean): WeatherIcon {
  const [condition, variant] = symbol.toLowerCase().split('_');
  const day = variant === 'night' ? false : variant === 'day' || variant === 'polartwilight' ? true : isDay;
  if (condition.includes('thunder')) return 'thunder';
  if (condition.includes('snow')) return 'snow';
  if (condition.includes('sleet')) return 'sleet';
  if (condition.includes('rain')) return 'rain';
  if (condition === 'fog') return 'fog';
  if (condition === 'clearsky') return day ? 'clear-day' : 'clear-night';
  if (condition === 'fair' || condition === 'partlycloudy') return day ? 'partly-day' : 'partly-night';
  return 'cloudy';
}

const SUN = '#F5B942';
const MOON = '#E8ECF4';
const CLOUD = 'url(#cloud)';
const FOG = '#C9D1E0';
const WATER = '#6EA8FE';

const sun = (cx: number, cy: number, r: number) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${SUN}"/>` +
  [0, 45, 90, 135, 180, 225, 270, 315]
    .map((deg) => {
      const a = (deg * Math.PI) / 180;
      const p = (k: number) => `${(cx + Math.cos(a) * r * k).toFixed(1)} ${(cy + Math.sin(a) * r * k).toFixed(1)}`;
      return `<path d="M${p(1.45)}L${p(1.9)}" stroke="${SUN}" stroke-width="1.6" stroke-linecap="round"/>`;
    })
    .join('');
const moon = (cx: number, cy: number, r: number) =>
  `<path d="M${cx + r * 0.3} ${cy - r}a${r} ${r} 0 1 0 ${r * 0.7} ${r * 1.55}a${r * 0.8} ${r * 0.8} 0 0 1 -${r * 0.7} -${r * 1.55}z" fill="${MOON}"/>`;
// A soft light-blue cloud with a lighter rim, as in the widget design.
const cloud = (dy = 0) =>
  `<path d="M7 ${18 + dy}h10.5a3.5 3.5 0 0 0 0-7a5 5 0 0 0-9.6-1.2A4 4 0 0 0 7 ${18 + dy}z" fill="${CLOUD}" stroke="#E4F1FD" stroke-opacity="0.8" stroke-width="0.8"/>`;
const drops = (color: string, dash = false) =>
  [8, 12, 16]
    .map((x) => `<path d="M${x} 19.5l-1 2.5" stroke="${color}" stroke-width="1.6" stroke-linecap="round"${dash ? ' stroke-dasharray="0.5 2"' : ''}/>`)
    .join('');

const BODIES: Record<WeatherIcon, string> = {
  'clear-day': sun(12, 12, 4.5),
  'clear-night': moon(11, 12, 6.5),
  'partly-day': sun(9, 8.5, 3.2) + cloud(1),
  'partly-night': moon(8.5, 8.5, 4.5) + cloud(1),
  cloudy: cloud(-1),
  fog: [9, 13, 17].map((y) => `<path d="M4 ${y}h16" stroke="${FOG}" stroke-width="1.8" stroke-linecap="round"/>`).join(''),
  rain: cloud(-3) + drops(WATER),
  sleet: cloud(-3) + drops(WATER, true),
  snow: cloud(-3) + [8, 12, 16].map((x) => `<circle cx="${x - 0.5}" cy="20.5" r="1.1" fill="#FFFFFF"/>`).join(''),
  thunder: cloud(-3) + `<path d="M12.5 16l-2.5 4h2.5l-1.5 3.5l4-5h-2.5l1.5-2.5z" fill="${SUN}"/>`,
};

export function weatherIconSvg(icon: WeatherIcon): string {
  return (
    '<svg id="coinlab-weather" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
    '<defs><linearGradient id="cloud" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D8EAFB"/><stop offset="1" stop-color="#7FA9D3"/></linearGradient></defs>' +
    `${BODIES[icon]}</svg>`
  );
}
