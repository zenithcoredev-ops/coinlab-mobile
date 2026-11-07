import type { TranslationKey } from '@/i18n';
import type { BadgeId } from '@/services/badges-api';

/** `how`: what earns the badge, for its detail sheet. */
type BadgeMeta = { icon: string; name: TranslationKey; desc: TranslationKey; how: TranslationKey };

/** Display order of the badge grid. */
export const BADGE_ORDER: BadgeId[] = ['night_owl', 'week_streak', 'first_friend', 'diamond', 'tournament', 'champion'];

export const BADGE_META: Record<BadgeId, BadgeMeta> = {
  night_owl: { icon: '🦉', name: 'badge.night_owl.name', desc: 'badge.night_owl.desc', how: 'badge.night_owl.how' },
  week_streak: { icon: '🔥', name: 'badge.week_streak.name', desc: 'badge.week_streak.desc', how: 'badge.week_streak.how' },
  first_friend: { icon: '🤝', name: 'badge.first_friend.name', desc: 'badge.first_friend.desc', how: 'badge.first_friend.how' },
  diamond: { icon: '💎', name: 'badge.diamond.name', desc: 'badge.diamond.desc', how: 'badge.diamond.how' },
  tournament: { icon: '🏅', name: 'badge.tournament.name', desc: 'badge.tournament.desc', how: 'badge.tournament.how' },
  champion: { icon: '🏆', name: 'badge.champion.name', desc: 'badge.champion.desc', how: 'badge.champion.how' },
};
