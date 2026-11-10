/**
 * Pure helpers for the League tab's look: which standings rows to show in the short list, where the
 * zone dividers go, what the "your rank" card says, and the short countdown. No React, so they can
 * be tested on their own.
 */

export type ZoneRow = { rank: number; isYou: boolean; zone: 'promote' | 'demote' | null };

/** An entry of the shown list: a standings row, a zone divider, or the "⋯" gap. */
export type ListItem<T> =
  | { kind: 'row'; row: T }
  | { kind: 'divider'; zone: 'promote' | 'demote' }
  | { kind: 'gap' };

/** Rows shown at the top of a long list. */
export const TOP_ROWS = 5;
/** Longer than this, the list starts short (top rows, ⋯, the user and their neighbours). */
export const SHORT_LIST_AFTER = 10;

/**
 * The list as it is drawn: in the short form the top rows, a "⋯" where rows are skipped and the
 * user with the rows just above and below; all rows otherwise. Dividers mark the end of the
 * promotion zone ("Terfi bölgesi ↑", under its last row) and the start of the demotion zone, wherever
 * that boundary falls between two shown rows.
 */
export function standingsList<T extends ZoneRow>(rows: T[], expanded: boolean): ListItem<T>[] {
  let shown = rows.map((_, i) => i);
  if (!expanded && rows.length > SHORT_LIST_AFTER) {
    const you = rows.findIndex((r) => r.isYou);
    const keep = new Set<number>();
    for (let i = 0; i < Math.min(TOP_ROWS, rows.length); i++) keep.add(i);
    if (you >= 0) for (const i of [you - 1, you, you + 1]) if (i >= 0 && i < rows.length) keep.add(i);
    shown = [...keep].sort((a, b) => a - b);
  }

  const items: ListItem<T>[] = [];
  shown.forEach((index, k) => {
    const prevIndex = k > 0 ? shown[k - 1] : -1;
    if (k > 0 && index !== prevIndex + 1) items.push({ kind: 'gap' });
    const nextIndex = k < shown.length - 1 ? shown[k + 1] : index + 1;
    // The demotion zone starts here, as far as the shown rows go (even if its first rows are skipped).
    if (rows[index].zone === 'demote' && (prevIndex < 0 || rows[prevIndex].zone !== 'demote')) items.push({ kind: 'divider', zone: 'demote' });
    items.push({ kind: 'row', row: rows[index] });
    // The promotion zone ends after this row, as far as the shown rows go.
    if (rows[index].zone === 'promote' && rows[nextIndex] && rows[nextIndex].zone !== 'promote') items.push({ kind: 'divider', zone: 'promote' });
  });
  if (!expanded && shown.length < rows.length && shown[shown.length - 1] < rows.length - 1) items.push({ kind: 'gap' });
  return items;
}

/** What the "your rank" card says under the rank. */
export type RankStatus =
  | { kind: 'inPromotion' }
  | { kind: 'toPromotion'; places: number }
  | { kind: 'inTournament' }
  | { kind: 'toTournament'; places: number }
  | { kind: 'inDemotion' }
  | { kind: 'noPromotion' };

export function rankStatus(
  you: { rank: number; zone: 'promote' | 'demote' | null } | null | undefined,
  bands: { promoteCount: number; tournamentCount: number } | null | undefined,
  isDiamond: boolean
): RankStatus | null {
  if (!you || !bands) return null;
  if (you.zone === 'demote') return { kind: 'inDemotion' };
  if (isDiamond) {
    const band = Math.max(1, bands.tournamentCount);
    return you.rank <= band ? { kind: 'inTournament' } : { kind: 'toTournament', places: you.rank - band };
  }
  if (bands.promoteCount <= 0) return { kind: 'noPromotion' };
  // The server marks the zone (it also needs points this week), so trust it when it says so.
  if (you.zone === 'promote') return { kind: 'inPromotion' };
  return { kind: 'toPromotion', places: Math.max(1, you.rank - bands.promoteCount) };
}

/** "2g 14s" with days, "5s 12d" within the last day: the parts for a short countdown. */
export function shortCountdown(ms: number): { days: number; hours: number; minutes: number; withDays: boolean } {
  const totalMinutes = Math.floor(Math.max(0, ms) / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  return { days, hours: Math.floor((totalMinutes % 1440) / 60), minutes: totalMinutes % 60, withDays: days > 0 };
}
