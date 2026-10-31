jest.mock('react-native-google-mobile-ads', () => ({
  AdEventType: { LOADED: 'loaded', ERROR: 'error', CLOSED: 'closed', PAID: 'paid' },
  InterstitialAd: { createForAdRequest: jest.fn() },
}));
jest.mock('../config', () => ({ adUnitId: () => 'unit-int' }));
jest.mock('../impressions', () => ({
  impressionFromPaidEvent: (e: any, unit: string, format: string) => ({ unit, format, value: e.value }),
  recordImpression: jest.fn().mockResolvedValue(undefined),
}));

type Fake = { listeners: Record<string, (e?: any) => void>; load: jest.Mock; show: jest.Mock; emit: (t: string, e?: any) => void };
let made: Fake[] = [];

function fakeAd(): Fake {
  const fake: Fake = {
    listeners: {},
    load: jest.fn(),
    show: jest.fn().mockResolvedValue(undefined),
    emit: (t, e) => fake.listeners[t]?.(e),
  };
  (fake as any).addAdEventListener = (t: string, fn: any) => (fake.listeners[t] = fn);
  made.push(fake);
  return fake;
}

/** A fresh copy of the module (it keeps the loaded ad in module state), with its own mocks. */
const load = () => {
  made = [];
  let mod!: typeof import('../interstitial') & { recorded: jest.Mock };
  jest.isolateModules(() => {
    require('react-native-google-mobile-ads').InterstitialAd.createForAdRequest.mockImplementation(fakeAd);
    mod = { ...require('../interstitial'), recorded: require('../impressions').recordImpression };
  });
  return mod;
};

describe('mining-start interstitial', () => {
  it('loads one ahead of time, and shows it only once loaded', () => {
    const { preloadMiningStartAd, showMiningStartAdIfReady } = load();
    preloadMiningStartAd();
    preloadMiningStartAd();
    expect(made).toHaveLength(1);
    expect(made[0].load).toHaveBeenCalledTimes(1);
    expect(showMiningStartAdIfReady()).toBe(false); // still loading: nothing, nobody waits
    made[0].emit('loaded');
    expect(showMiningStartAdIfReady()).toBe(true);
    expect(made[0].show).toHaveBeenCalledTimes(1);
    expect(showMiningStartAdIfReady()).toBe(false); // used up
  });

  it('drops a failed load, so the next preload tries again', () => {
    const { preloadMiningStartAd, showMiningStartAdIfReady } = load();
    preloadMiningStartAd();
    made[0].emit('error', new Error('no fill'));
    expect(showMiningStartAdIfReady()).toBe(false);
    preloadMiningStartAd();
    expect(made).toHaveLength(2);
  });

  it('records the impression revenue of the shown ad', () => {
    const { preloadMiningStartAd, recorded } = load();
    preloadMiningStartAd();
    made[0].emit('paid', { value: 0.01 });
    expect(recorded).toHaveBeenCalledWith({ unit: 'unit-int', format: 'interstitial', value: 0.01 });
  });
});
