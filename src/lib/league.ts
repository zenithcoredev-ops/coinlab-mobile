import type { TranslationKey } from '@/i18n';
import type { ResultType } from '@/services/league-api';

/** Bronze (0) to Diamond (9), in order. */
export const LEAGUE_ICONS = ['🥉', '🥈', '🥇', '🔷', '🔴', '🟢', '🟣', '⚪', '⚫', '💎'] as const;

export const LEAGUE_NAME_KEYS: readonly TranslationKey[] = [
  'league.name.0',
  'league.name.1',
  'league.name.2',
  'league.name.3',
  'league.name.4',
  'league.name.5',
  'league.name.6',
  'league.name.7',
  'league.name.8',
  'league.name.9',
];

export const RESULT_KEYS: Record<ResultType, TranslationKey> = {
  promote: 'league.result.promote',
  demote: 'league.result.demote',
  stay: 'league.result.stay',
};

export const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
