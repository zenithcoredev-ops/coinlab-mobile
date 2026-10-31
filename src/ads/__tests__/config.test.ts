jest.mock('react-native-google-mobile-ads', () => ({ TestIds: { INTERSTITIAL: 'test-interstitial', REWARDED: 'test-rewarded' } }));

declare const __dirname: string;
const { readFileSync } = require('fs') as { readFileSync: (f: string, e: 'utf8') => string };
const { join } = require('path') as { join: (...p: string[]) => string };

function load(os: string, adsConfig?: object) {
  let mod!: typeof import('../config');
  jest.isolateModules(() => {
    // The isolated registry has its own react-native, so set the platform on that one.
    Object.defineProperty(require('react-native').Platform, 'OS', { configurable: true, get: () => os });
    if (adsConfig) jest.doMock('../../../ads.config.json', () => adsConfig);
    else jest.dontMock('../../../ads.config.json');
    mod = require('../config');
  });
  return mod;
}

const realIds = {
  useTestIds: false,
  androidAppId: 'ca-app-pub-1~1',
  iosAppId: 'ca-app-pub-1~2',
  adUnits: { interstitialMiningStart: 'ca-app-pub-1/10', rewardedBoost: 'ca-app-pub-1/20' },
};

describe('ad config', () => {
  it('ships with Google test ids for now', () => {
    const config = JSON.parse(readFileSync(join(__dirname, '../../../ads.config.json'), 'utf8'));
    expect(config.useTestIds).toBe(true);
    expect(config.androidAppId).toBe('ca-app-pub-3940256099942544~3347511713'); // Google's sample app id
    const { adUnitId } = load('android');
    expect(adUnitId('interstitialMiningStart', { dev: false })).toBe('test-interstitial');
    expect(adUnitId('rewardedBoost', { dev: false })).toBe('test-rewarded');
  });

  it('uses the real unit ids from the one config file once test ids are off, but never in development', () => {
    const { adUnitId } = load('android', realIds);
    expect(adUnitId('interstitialMiningStart', { dev: false })).toBe('ca-app-pub-1/10');
    expect(adUnitId('rewardedBoost', { dev: false })).toBe('ca-app-pub-1/20');
    expect(adUnitId('rewardedBoost', { dev: true })).toBe('test-rewarded');
  });

  it('has no ads off Android, or for a placement without a unit id', () => {
    expect(load('ios').adUnitId('rewardedBoost', { dev: false })).toBeNull();
    const { adUnitId } = load('android', { ...realIds, adUnits: { ...realIds.adUnits, rewardedBoost: '' } });
    expect(adUnitId('rewardedBoost', { dev: false })).toBeNull();
  });

  it('passes the app ids from the same file to the AdMob plugin, with measurement delayed until consent', () => {
    jest.dontMock('../../../ads.config.json');
    let appConfig!: (ctx: { config: object }) => { plugins: any[] };
    jest.isolateModules(() => {
      appConfig = require('../../../app.config').default;
    });
    const appJson = JSON.parse(readFileSync(join(__dirname, '../../../app.json'), 'utf8'));
    const plugin = appConfig({ config: appJson.expo }).plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'react-native-google-mobile-ads');
    expect(plugin[1]).toEqual({
      androidAppId: 'ca-app-pub-3940256099942544~3347511713',
      iosAppId: 'ca-app-pub-3940256099942544~1458002511',
      delayAppMeasurementInit: true,
    });
    expect(readFileSync(join(__dirname, '../../../app.json'), 'utf8')).not.toContain('ca-app-pub-'); // no second copy
  });
});
