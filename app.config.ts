import type { ConfigContext, ExpoConfig } from 'expo/config';

import ads from './ads.config.json';

const ADS_PLUGIN = 'react-native-google-mobile-ads';

/**
 * app.json plus the AdMob app ids from ads.config.json, the one place where AdMob ids live (the ad
 * unit ids are read from it by src/ads/config.ts).
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: (config.plugins ?? []).map((plugin) =>
    plugin === ADS_PLUGIN || (Array.isArray(plugin) && plugin[0] === ADS_PLUGIN)
      ? [
          ADS_PLUGIN,
          {
            androidAppId: ads.androidAppId,
            iosAppId: ads.iosAppId,
            // Nothing is collected before the consent flow has run and the SDK is initialised.
            delayAppMeasurementInit: true,
          },
        ]
      : plugin
  ),
});
