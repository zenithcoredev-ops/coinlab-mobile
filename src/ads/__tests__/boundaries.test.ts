import en from '@/i18n/en';
import tr from '@/i18n/tr';

declare const __dirname: string;
const fs = require('fs') as { readFileSync: (f: string, e: 'utf8') => string; existsSync: (f: string) => boolean; readdirSync: (d: string) => string[] };
const path = require('path') as { join: (...p: string[]) => string; dirname: (p: string) => string; resolve: (...p: string[]) => string };

const SRC = path.resolve(__dirname, '../..');

/** Every app file a module pulls in (relative and @/ imports only), transitively. */
function importsOf(entry: string, seen = new Set<string>()): Set<string> {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  const code = fs.readFileSync(entry, 'utf8');
  for (const [, spec] of code.matchAll(/(?:from|import|require\()\s*['"]([^'"]+)['"]/g)) {
    const base = spec.startsWith('@/') ? path.join(SRC, spec.slice(2)) : spec.startsWith('.') ? path.join(path.dirname(entry), spec) : null;
    if (!base) continue;
    const file = ['.ts', '.tsx', '/index.ts', '/index.tsx', ''].map((ext) => base + ext).find((f) => fs.existsSync(f) && !f.endsWith('/'));
    if (file && /\.(ts|tsx)$/.test(file)) importsOf(file, seen);
  }
  return seen;
}

// The code that builds and shows ad requests. (context/ads.tsx only wires consent to the session;
// its own imports are checked separately below, since the session module reaches widget code.)
const AD_CODE = [
  ...fs.readdirSync(path.join(SRC, 'ads')).filter((f) => /\.tsx?$/.test(f)).map((f) => path.join(SRC, 'ads', f)),
  path.join(SRC, 'services/ads-api.ts'),
];
const directImports = (file: string) =>
  [...fs.readFileSync(file, 'utf8').matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)].map(([, spec]) => spec);

describe('ads boundaries', () => {
  it('ad code never reaches Health Connect or step data, so none of it can end up in an ad request', () => {
    const reached = new Set<string>();
    for (const file of AD_CODE) importsOf(file).forEach((f) => reached.add(f.replace(SRC + '/', '')));
    const forbidden = [...reached].filter((f) => /health-connect|health-steps|widget\/steps|context\/steps|steps-api/.test(f));
    expect(forbidden).toEqual([]);
  });

  it('the ads context takes only the session token from the rest of the app', () => {
    const allowed = /^(react|react-native|@\/ads\/[\w-]+|@\/context\/session)$/;
    expect(directImports(path.join(SRC, 'context/ads.tsx')).filter((spec) => !allowed.test(spec))).toEqual([]);
  });

  it('ad requests carry no targeting built from app data (no keywords, content URL or custom targeting)', () => {
    for (const file of AD_CODE) {
      expect(fs.readFileSync(file, 'utf8')).not.toMatch(/keywords|contentUrl|customTargeting|publisherProvidedId|neighboringContentUrls/);
    }
  });

  it('no ad text invites a click', () => {
    const adKeys = (dict: Record<string, string>) => Object.entries(dict).filter(([k]) => k.startsWith('ads.') || k === 'profile.privacyOptions');
    for (const [key, text] of [...adKeys(en), ...adKeys(tr)]) {
      expect([key, text]).not.toEqual([key, expect.stringMatching(/click|tap|press|tıkla|dokun|bas\b/i)]);
    }
  });
});
