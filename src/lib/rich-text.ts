/**
 * A translated sentence split around its values, so the amounts can be coloured: "Her aktif arkadaşın
 * sana +{rate} Wago/saat ..." gives the plain parts and, marked, "+0,20 Wago/saat" and "+25 Wago".
 * A value takes the "+" before it and the unit word after it ("Wago" and, if present, "/saat" or "/h").
 */
export function highlighted(template: string, values: Record<string, string>): { text: string; value: boolean }[] {
  const parts: { text: string; value: boolean }[] = [];
  const re = /(\+?)\{(\w+)\}( Wago(?:\/\w+)?)?/g;
  let last = 0;
  for (let m = re.exec(template); m; m = re.exec(template)) {
    if (m.index > last) parts.push({ text: template.slice(last, m.index), value: false });
    parts.push({ text: `${m[1]}${values[m[2]] ?? ''}${m[3] ?? ''}`, value: true });
    last = m.index + m[0].length;
  }
  if (last < template.length) parts.push({ text: template.slice(last), value: false });
  return parts;
}
