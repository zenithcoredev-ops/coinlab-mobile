import type { TranslationKey } from '@/i18n';
import { BADGE_META } from '@/lib/badges';
import { LEAGUE_ICONS, LEAGUE_NAME_KEYS } from '@/lib/league';
import type { BadgeId } from '@/services/badges-api';
import type { LeagueResult, TournamentResult } from '@/services/league-api';

/** What a share card shows. `title`/`subtitle` are translation keys with their params. */
export type ShareCard = {
  icon: string;
  title: { key: TranslationKey; params?: Record<string, string | number> };
  subtitle: { key: TranslationKey; params?: Record<string, string | number> };
};

const PLACE_TITLE: Record<number, TranslationKey> = {
  1: 'share.tournament.first',
  2: 'share.tournament.second',
  3: 'share.tournament.third',
};
const PLACE_ICON: Record<number, string> = { 1: '🏆', 2: '🥈', 3: '🥉' };

export function badgeCard(id: BadgeId): ShareCard {
  const meta = BADGE_META[id];
  return {
    icon: meta.icon,
    title: { key: 'share.badge.title', params: {} },
    subtitle: { key: meta.name },
  };
}

/** Only promotions are worth sharing; null for stays and demotions. */
export function promotionCard(result: LeagueResult): ShareCard | null {
  if (result.resultType !== 'promote') return null;
  return {
    icon: LEAGUE_ICONS[result.toLeague],
    title: { key: 'share.promoted.title' },
    subtitle: {
      key: 'share.promoted.sub',
      params: { rank: result.rank ?? '-', points: result.points.toFixed(2) },
    },
  };
}

/** Only rewarded Final placements (top 3) are shared; null otherwise. */
export function tournamentCard(result: TournamentResult): ShareCard | null {
  if (result.outcome !== 'final' || !result.reward || !PLACE_TITLE[result.rank]) return null;
  return {
    icon: PLACE_ICON[result.rank],
    title: { key: PLACE_TITLE[result.rank] },
    subtitle: { key: 'share.tournament.sub' },
  };
}

export function leagueNameKey(league: number): TranslationKey {
  return LEAGUE_NAME_KEYS[league];
}

/** Text sent through the system share sheet; the invite code makes every share an invite. */
export function shareMessage(title: string, subtitle: string, inviteCode: string | null, invite: (code: string) => string): string {
  const lines = [title, subtitle];
  if (inviteCode) lines.push('', invite(inviteCode));
  return lines.join('\n');
}
