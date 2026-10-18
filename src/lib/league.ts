import type { TranslationKey } from '@/i18n';
import type { ResultType, TournamentStage } from '@/services/league-api';
import { theme } from '@/theme';

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

export const STAGE_NAME_KEYS: Record<TournamentStage, TranslationKey> = {
  qf: 'tournament.stage.qf',
  sf: 'tournament.stage.sf',
  final: 'tournament.stage.final',
};

/** Border color of each cosmetic frame the tournament can award. */
export const FRAME_COLORS: Record<string, string> = {
  champion: theme.colors.frameChampion,
  runner_up: theme.colors.frameRunnerUp,
  third_place: theme.colors.frameThirdPlace,
};

export const FRAME_NAME_KEYS: Record<string, TranslationKey> = {
  champion: 'frame.champion',
  runner_up: 'frame.runner_up',
  third_place: 'frame.third_place',
};
