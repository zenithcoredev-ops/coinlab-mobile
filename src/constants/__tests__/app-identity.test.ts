import app from '../../../app.json';
import ads from '../../../ads.config.json';
import { APP_SCHEME } from '../config';

// The app ships as com.zenithcore.waligo. Nothing was published under the old id, so nothing keeps it.
const OLD_ID = /com\.zenithcore\.coinlab|coinlabmobile/;

const fs = require('fs') as {
  readdirSync(dir: string, options: { withFileTypes: true }): { name: string; isDirectory(): boolean }[];
  readFileSync(file: string, encoding: 'utf8'): string;
};
const files = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = `${dir}/${e.name}`;
    if (e.isDirectory()) return files(full);
    return /\.(ts|tsx|json|patch|js)$/.test(e.name) ? [full] : [];
  });

describe('app identity', () => {
  it('uses the Waligo package, bundle id and URL scheme', () => {
    expect(app.expo.android.package).toBe('com.zenithcore.waligo');
    expect(app.expo.ios.bundleIdentifier).toBe('com.zenithcore.waligo');
    expect(app.expo.scheme).toBe('waligo');
    expect(APP_SCHEME).toBe(app.expo.scheme);
  });

  it('keeps the Expo slug and project (the EAS project is linked to them) and the AdMob app ids', () => {
    expect(app.expo.slug).toBe('coinlab-mobile');
    expect(app.expo.extra.eas.projectId).toBe('a675391d-550c-412a-83c7-6d3150f1deb4');
    expect(ads.androidAppId).toBe('ca-app-pub-3940256099942544~3347511713');
  });

  it('nothing in the app, its config or its patches still names the old package or scheme', () => {
    const sources = [...files('src'), ...files('patches'), 'app.json', 'app.config.ts', 'eas.json'].filter(
      (f) => !f.endsWith('app-identity.test.ts')
    );
    const hits = sources.filter((f) => OLD_ID.test(fs.readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});
