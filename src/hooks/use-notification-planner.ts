import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useAds } from '@/context/ads';
import { useMining } from '@/context/mining';
import { useNotifications } from '@/context/notifications';
import { useSession } from '@/context/session';
import { useSteps } from '@/context/steps';
import { useI18n } from '@/i18n';
import { getLeague } from '@/services/league-api';
import {
  LEAGUE_CACHE_MAX_AGE_MS,
  LeagueSnapshot,
  leagueWeekEndFor,
  loadLeagueSnapshot,
  onLeagueSnapshot,
  saveLeagueSnapshot,
} from '@/services/league-cache';
import { syncNotifications } from '@/services/notification-scheduler';
import { STEP_BONUS_CAP_STEPS, STEPS_PER_BONUS_UNIT } from '@/services/steps-api';

/**
 * Keeps the pending local notifications in step with the latest state: re-planned on opening the
 * app, on every return to it, when the session starts or ends, when the status changes, and when
 * the language or the user's choice changes. "Come back" reminders count from the last of these.
 */
export function useNotificationPlanner() {
  const { auth } = useSession();
  const token = auth?.token ?? null;
  const { status } = useMining();
  const { active, typePrefs } = useNotifications();
  const { language } = useI18n();
  const { availability, steps } = useSteps();
  const { rewardedOffered: boostOffered } = useAds();
  const [foregrounds, setForegrounds] = useState(0);
  const [league, setLeague] = useState<LeagueSnapshot | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setForegrounds((n) => n + 1));
    return () => sub.remove();
  }, []);

  // The league isn't in the mining status: the league screen saves what it loads, and on opening
  // the app a day-old (or missing) copy is refreshed quietly.
  useEffect(() => onLeagueSnapshot(setLeague), []);
  useEffect(() => {
    let cancelled = false;
    loadLeagueSnapshot().then((saved) => {
      if (cancelled) return;
      setLeague(saved);
      if (token && (!saved || Date.now() - saved.savedAt > LEAGUE_CACHE_MAX_AGE_MS)) {
        getLeague(token)
          .then((view) => saveLeagueSnapshot(view))
          .catch(() => {});
      }
    });
    return () => {
      cancelled = true;
    };
  }, [token, foregrounds]);

  const streak = status?.streak;
  const minedToday = status?.streakMinedToday;
  const streakExpiresAt = status?.streakExpiresAt;
  const streakAtExpiry = status?.streakAtExpiry;
  const startedAt = status?.session?.startedAt;
  const endsAt = status?.session?.endsAt;
  const usedToday = status?.ads?.usedToday;
  const dailyLimit = status?.ads?.dailyLimit;
  const stepsReady = availability === 'ready';
  const leagueEnd = league?.inLeague ? (league.weekEnd ?? 'next') : null;

  useEffect(() => {
    if (streak === undefined || minedToday === undefined) return;
    const now = new Date();
    const session = startedAt && endsAt ? { startedAt, endsAt } : null;
    const weekEndsAt = leagueWeekEndFor(league, now);
    syncNotifications(
      {
        streak: { streak, minedToday, streakExpiresAt, streakAtExpiry, session },
        session,
        boost: boostOffered && usedToday !== undefined && dailyLimit !== undefined ? { usedToday, dailyLimit } : null,
        steps: stepsReady ? { sessionSteps: steps, perLevel: STEPS_PER_BONUS_UNIT, cap: STEP_BONUS_CAP_STEPS } : null,
        league: weekEndsAt ? { weekEndsAt } : null,
      },
      { enabled: active, language, now, prefs: typePrefs }
    ).catch(() => {});
    // `league` is read through `leagueEnd`, which changes exactly when it matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    streak,
    minedToday,
    streakExpiresAt,
    streakAtExpiry,
    startedAt,
    endsAt,
    usedToday,
    dailyLimit,
    boostOffered,
    stepsReady,
    steps,
    leagueEnd,
    active,
    typePrefs,
    language,
    foregrounds,
  ]);
}
