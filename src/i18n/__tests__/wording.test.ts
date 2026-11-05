import app from '../../../app.json';
import en from '../en';
import tr from '../tr';

// Store review: no user-facing text may read like crypto mining. The server's fields keep their
// names (currentThs, thsBreakdown, /mining/*); only what users see changes.
const BANNED: RegExp[] = [
  /\bmin(e|es|ed|ing|er|ers)\b/i,
  /hash/i,
  /\bth\/s/i,
  /\bmaden/i,
  // "kaz…" as in kazım/kazı/kazma/kazıyor; "kazan…" (to earn/win) is fine.
  /(^|[^a-zA-ZçğıöşüÇĞİÖŞÜ])kaz(?!an)/i,
  /⛏/,
];

const offending = (text: string) => BANNED.filter((re) => re.test(text)).map(String);

// Node's fs, typed just enough for this test (the app's tsconfig has no Node types).
type Entry = { name: string; isDirectory(): boolean };
const fs = require('fs') as {
  readdirSync(dir: string, options: { withFileTypes: true }): Entry[];
  readFileSync(file: string, encoding: 'utf8'): string;
};
const SRC = 'src'; // Jest runs from the repository root.
const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = `${dir}/${e.name}`;
    if (e.isDirectory()) return e.name === '__tests__' ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(e.name) ? [full] : [];
  });

describe('user-facing wording', () => {
  it.each([
    ['tr', tr],
    ['en', en],
  ])('no %s text mentions mining, miners, hashes, Th/s or kazım', (_lang, dict) => {
    const hits = Object.entries(dict as Record<string, string>)
      .map(([key, text]) => [key, offending(text)] as const)
      .filter(([, found]) => found.length > 0);
    expect(hits).toEqual([]);
  });

  it('catches the words it is meant to catch', () => {
    for (const text of ['Kazımı başlat', 'KAZIMI\nBAŞLAT', 'Kazılıyor', 'daha hızlı kazı', 'Start mining', 'Miner', '1.00 Th/s', 'hashrate', 'Madenci', '⛏️ CoinLab']) {
      expect([text, offending(text).length > 0]).toEqual([text, true]);
    }
    for (const text of ['CLB kazan', 'kazandın', 'Kazanıldı', 'Toplamayı başlat', 'determine', 'Collecting · 9h', '0.10 CLB/h', 'Hafta bitimine']) {
      expect([text, offending(text)]).toEqual([text, []]);
    }
  });

  it('the home-screen widget picker names no mining', () => {
    const plugin = app.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'react-native-android-widget') as [
      string,
      { widgets: { label: string; description: string }[] },
    ];
    const shown = plugin[1].widgets.flatMap((w) => [w.label, w.description]);
    expect(shown.flatMap(offending)).toEqual([]);
  });

  it('no screen shows Th/s, a pickaxe or a hammer icon', () => {
    const hits: string[] = [];
    for (const file of sourceFiles(SRC)) {
      fs.readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          const code = line.trim();
          if (code.startsWith('//') || code.startsWith('*') || code.startsWith('/*')) return;
          if (/\bth\/s|⛏|['"]hammer(-outline|-sharp)?['"]/i.test(code)) hits.push(`${file}:${i + 1}: ${code}`);
        });
    }
    expect(hits).toEqual([]);
  });

  it('screens format decimals for the app language (comma in Turkish), never with a bare toFixed', () => {
    const hits = ['src/app', 'src/components']
      .flatMap(sourceFiles)
      .flatMap((file) =>
        fs
          .readFileSync(file, 'utf8')
          .split('\n')
          .map((line, i) => [`${file}:${i + 1}`, line] as const)
          .filter(([, line]) => /\.toFixed\(|toLocaleString\(\)/.test(line))
          .map(([where]) => where)
      );
    expect(hits).toEqual([]);
  });
});

// The app is Waligo and its points are Wago. Code names (formatClb, clbPerHour, coinlab_auth, the
// com.zenithcore.coinlab package) may keep the old words; nothing a user reads may.
const OLD_NAMES = /CoinLab|\bCLB\b/;

/** A source line without its comment, so only code (and the strings in it) is checked. */
const codeOf = (line: string) => {
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return '';
  return line.replace(/(^|\s)\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
};

describe('the app name and the points', () => {
  it.each([
    ['tr', tr],
    ['en', en],
  ])('no %s text says CoinLab or CLB', (_lang, dict) => {
    const hits = Object.entries(dict as Record<string, string>).filter(([, text]) => OLD_NAMES.test(text));
    expect(hits).toEqual([]);
  });

  it('calls the app Waligo and the points Wago', () => {
    expect([tr['app.name'], en['app.name']]).toEqual(['Waligo', 'Waligo']);
    expect([tr['unit.clb'], en['unit.clb']]).toEqual(['Wago', 'Wago']);
    expect([tr['unit.rate'], en['unit.rate']]).toEqual(['Wago/saat', 'Wago/h']);
  });

  it('the launcher name, permission texts and widget picker say Waligo', () => {
    expect(app.expo.name).toBe('Waligo');
    const shown = JSON.stringify(app.expo.plugins);
    expect(shown.match(/"(label|description|locationWhenInUsePermission)":"[^"]*"/g)?.filter((s) => OLD_NAMES.test(s))).toEqual([]);
  });

  it('no screen, widget or notification code writes CoinLab or CLB', () => {
    const hits = sourceFiles(SRC).flatMap((file) =>
      fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .map((line, i) => [`${file}:${i + 1}`, codeOf(line)] as const)
        .filter(([, code]) => OLD_NAMES.test(code))
        .map(([where, code]) => `${where}: ${code.trim()}`)
    );
    expect(hits).toEqual([]);
  });

  it('catches the old names and lets code names through', () => {
    for (const text of ['CoinLab', '12,40 CLB', '0,10 CLB/saat', 'CoinLab’e hoş geldin']) expect([text, OLD_NAMES.test(text)]).toEqual([text, true]);
    for (const text of ['formatClb(x)', 'clbPerHour', "'coinlab_auth'", 'com.zenithcore.coinlab', '12,40 Wago']) {
      expect([text, OLD_NAMES.test(text)]).toEqual([text, false]);
    }
  });
});
