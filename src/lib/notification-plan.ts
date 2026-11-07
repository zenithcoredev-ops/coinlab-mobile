import { deviceClock, LocalClock, planStreakReminders, ReminderInput } from '@/lib/streak-reminder';

/**
 * Every local notification the app schedules, planned in one place so the rules hold across types:
 * quiet hours (22:00-09:00, moved to 09:00), at most two a local day by priority, and a text
 * variant that changes from day to day. Pure: no device APIs; the scheduler acts on the result.
 */

export type NotificationType = 'sessionEnd' | 'streak' | 'league' | 'steps' | 'boost' | 'comeback';
/** Highest first: when a day has more candidates than `DAILY_LIMIT`, the lower ones are dropped. */
export const PRIORITY: NotificationType[] = ['sessionEnd', 'streak', 'league', 'steps', 'boost', 'comeback'];
export const DAILY_LIMIT = 2;
export const QUIET_START_HOUR = 22;
export const QUIET_END_HOUR = 9;
export const COMEBACK_DAYS = [2, 4, 7] as const;
export const COMEBACK_HOUR = 19;
export const BOOST_HOUR = 14;
/** A boost nudge only once the session has run this long. */
export const BOOST_MIN_SESSION_MS = 2 * 60 * 60_000;
export const STEPS_HOUR = 19;
/** A steps nudge only when the next bonus level is this close. */
export const STEPS_NEAR_NEXT = 1500;
export const LEAGUE_HOUR = 20;
/** The league nudge leaves at least this long before the week ends. */
export const LEAGUE_MIN_LEAD_MS = 2 * 60 * 60_000;
/** Nothing is scheduled sooner than this from now. */
const MIN_LEAD_MS = 60_000;
const DAY_MS = 24 * 60 * 60_000;

export type ChannelKey = 'streak' | 'collect' | 'league' | 'reminders';
export const CHANNEL_OF: Record<NotificationType, ChannelKey> = {
  sessionEnd: 'collect',
  streak: 'streak',
  league: 'league',
  steps: 'collect',
  boost: 'collect',
  comeback: 'reminders',
};

export type NotificationRoute = '/(tabs)' | '/(tabs)/league' | '/(tabs)/tasks';
const ROUTE_OF: Record<NotificationType, NotificationRoute> = {
  sessionEnd: '/(tabs)',
  streak: '/(tabs)',
  league: '/(tabs)/league',
  steps: '/(tabs)/tasks',
  boost: '/(tabs)',
  comeback: '/(tabs)',
};

/** How many of each type can be pending at once; the scheduler cancels every one of these ids. */
export const MAX_PENDING: Record<NotificationType, number> = {
  sessionEnd: 1,
  streak: 3,
  league: 1,
  steps: 1,
  boost: 2,
  comeback: COMEBACK_DAYS.length,
};
export const ALL_NOTIFICATION_IDS = PRIORITY.flatMap((type) => Array.from({ length: MAX_PENDING[type] }, (_, i) => `notif-${type}-${i}`));

/** The text keys each type rotates through (variants of the same message). */
export const VARIANTS = {
  sessionEnd: ['notif.sessionEnd.1', 'notif.sessionEnd.2', 'notif.sessionEnd.3'],
  streak: ['notif.streak.1', 'notif.streak.2', 'notif.streak.3'],
  notStarted: ['notif.notStarted.1', 'notif.notStarted.2', 'notif.notStarted.3'],
  league: ['notif.league.1', 'notif.league.2', 'notif.league.3'],
  steps: ['notif.steps.1', 'notif.steps.2', 'notif.steps.3'],
  boost: ['notif.boost.1', 'notif.boost.2', 'notif.boost.3'],
  comeback: ['notif.comeback.1', 'notif.comeback.2', 'notif.comeback.3'],
} as const;
export type VariantGroup = keyof typeof VARIANTS;

export type PlanInput = {
  /** The server's streak state; null until the first status arrives. */
  streak: ReminderInput | null;
  /** The running session, if any. */
  session: { startedAt: string; endsAt: string } | null;
  /** Rewarded boost state; null when the rewarded ad isn't offered (off, ad-free/VIP, no consent...). */
  boost?: { usedToday: number; dailyLimit: number } | null;
  /** The running session's steps; null when Health Connect isn't ready. */
  steps?: { sessionSteps: number; perLevel: number; cap: number } | null;
  /** When the current league week ends; null when the user isn't in a league. */
  league?: { weekEndsAt: Date } | null;
};

/** Which types the user wants (all on unless switched off). */
export type TypePrefs = Record<NotificationType, boolean>;
export const ALL_TYPES_ON: TypePrefs = { sessionEnd: true, streak: true, league: true, steps: true, boost: true, comeback: true };

/** What was scheduled before; entries already due count toward today's limit. */
export type SentEntry = { type: NotificationType; fireAt: number };

export type PlannedNotification = {
  id: string;
  type: NotificationType;
  fireAt: Date;
  channel: ChannelKey;
  route: NotificationRoute;
  /** Translation key (a plural base for the streak text) and its params. */
  textKey: string;
  params?: Record<string, string | number>;
};

type Candidate = {
  type: NotificationType;
  fireAt: Date;
  group: VariantGroup;
  params?: Record<string, string | number>;
  /** Pointless at or after this (moved past it by quiet hours): dropped. */
  validUntil?: number;
};

const localDay = (at: Date, clock: LocalClock) => clock(at, 0, 0).getTime();

/** Moves a time inside 22:00-09:00 to the following 09:00. */
export function outOfQuietHours(at: Date, clock: LocalClock = deviceClock): Date {
  if (at.getTime() >= clock(at, 0, QUIET_START_HOUR).getTime()) return clock(at, 1, QUIET_END_HOUR);
  const morning = clock(at, 0, QUIET_END_HOUR);
  return at.getTime() < morning.getTime() ? morning : at;
}

/** The variant for a day: stays the same on a day's re-plans, moves on the next day. */
function variantKey(group: VariantGroup, fireAt: Date, clock: LocalClock): string {
  const keys = VARIANTS[group];
  const day = Math.round(localDay(fireAt, clock) / DAY_MS);
  const offset = Object.keys(VARIANTS).indexOf(group);
  return keys[(((day + offset) % keys.length) + keys.length) % keys.length];
}

function sessionEndCandidates(now: Date, input: PlanInput): Candidate[] {
  if (!input.session) return [];
  const endsAt = Date.parse(input.session.endsAt);
  if (!(endsAt - now.getTime() >= MIN_LEAD_MS)) return [];
  return [{ type: 'sessionEnd', fireAt: new Date(endsAt), group: 'sessionEnd' }];
}

function streakCandidates(now: Date, input: PlanInput, clock: LocalClock): Candidate[] {
  if (!input.streak) return [];
  const expiresAt = input.streak.streakExpiresAt ? Date.parse(input.streak.streakExpiresAt) : undefined;
  return planStreakReminders(now, input.streak, clock).map((r) =>
    r.kind === 'streak'
      ? { type: 'streak', fireAt: r.fireAt, group: 'streak', params: { count: r.streak, hours: r.hoursLeft }, validUntil: expiresAt }
      : { type: 'streak', fireAt: r.fireAt, group: 'notStarted' }
  );
}

/** At 19:00 on the 2nd, 4th and 7th day after now (the last time the app was open); then nothing. */
function comebackCandidates(now: Date, clock: LocalClock): Candidate[] {
  return COMEBACK_DAYS.map((days) => ({ type: 'comeback' as const, fireAt: clock(now, days, COMEBACK_HOUR), group: 'comeback' as const }));
}

/** 14:00 on the session's days, once the session has run 2 h, while views are left (today's count; later days start at 0). */
function boostCandidates(now: Date, input: PlanInput, clock: LocalClock): Candidate[] {
  const { session, boost } = input;
  if (!session || !boost || boost.dailyLimit <= 0) return [];
  const startedAt = Date.parse(session.startedAt);
  const endsAt = Date.parse(session.endsAt);
  const out: Candidate[] = [];
  for (let day = 0; day <= 1; day++) {
    const fireAt = clock(now, day, BOOST_HOUR);
    const t = fireAt.getTime();
    if (day === 0 && boost.usedToday >= boost.dailyLimit) continue;
    if (t < startedAt + BOOST_MIN_SESSION_MS || t >= endsAt) continue;
    out.push({ type: 'boost', fireAt, group: 'boost', validUntil: endsAt });
  }
  return out;
}

/** 19:00 today while the session runs, when the next step bonus level is within 1,500 steps. */
function stepsCandidates(now: Date, input: PlanInput, clock: LocalClock): Candidate[] {
  const { session, steps } = input;
  if (!session || !steps || steps.perLevel <= 0 || steps.sessionSteps >= steps.cap) return [];
  const toNext = steps.perLevel - (steps.sessionSteps % steps.perLevel);
  if (toNext > STEPS_NEAR_NEXT) return [];
  const endsAt = Date.parse(session.endsAt);
  const fireAt = clock(now, 0, STEPS_HOUR);
  if (fireAt.getTime() >= endsAt) return [];
  return [{ type: 'steps', fireAt, group: 'steps', params: { steps: toNext }, validUntil: endsAt }];
}

/** The last local 20:00 at least 2 h before the league week ends. */
export function leagueReminderTime(weekEndsAt: Date, clock: LocalClock = deviceClock): Date {
  const latest = new Date(weekEndsAt.getTime() - LEAGUE_MIN_LEAD_MS);
  const sameDay = clock(latest, 0, LEAGUE_HOUR);
  return sameDay.getTime() <= latest.getTime() ? sameDay : clock(latest, -1, LEAGUE_HOUR);
}

function leagueCandidates(input: PlanInput, clock: LocalClock): Candidate[] {
  if (!input.league) return [];
  const weekEnd = input.league.weekEndsAt.getTime();
  return [{ type: 'league', fireAt: leagueReminderTime(input.league.weekEndsAt, clock), group: 'league', validUntil: weekEnd }];
}

/**
 * Every notification that should be pending now; the caller replaces whatever was scheduled.
 * `sent` lists what was scheduled earlier: entries already due today use up today's limit.
 */
export function planNotifications(
  now: Date,
  input: PlanInput,
  prefs: TypePrefs = ALL_TYPES_ON,
  sent: SentEntry[] = [],
  clock: LocalClock = deviceClock
): PlannedNotification[] {
  const candidates = [
    ...sessionEndCandidates(now, input),
    ...streakCandidates(now, input, clock),
    ...leagueCandidates(input, clock),
    ...stepsCandidates(now, input, clock),
    ...boostCandidates(now, input, clock),
    ...comebackCandidates(now, clock),
  ]
    .filter((c) => prefs[c.type])
    .map((c) => ({ ...c, fireAt: outOfQuietHours(c.fireAt, clock) }))
    .filter((c) => c.fireAt.getTime() - now.getTime() >= MIN_LEAD_MS && (c.validUntil === undefined || c.fireAt.getTime() < c.validUntil));

  // Per local day: what was already due today counts first, then candidates by priority (then time).
  const used = new Map<number, number>();
  const today = localDay(now, clock);
  for (const entry of sent) {
    if (entry.fireAt <= now.getTime() && localDay(new Date(entry.fireAt), clock) === today) used.set(today, (used.get(today) ?? 0) + 1);
  }
  const rank = (c: Candidate) => PRIORITY.indexOf(c.type);
  const kept = [...candidates]
    .sort((a, b) => rank(a) - rank(b) || a.fireAt.getTime() - b.fireAt.getTime())
    .filter((c) => {
      const day = localDay(c.fireAt, clock);
      const count = used.get(day) ?? 0;
      if (count >= DAILY_LIMIT) return false;
      used.set(day, count + 1);
      return true;
    })
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());

  const next = new Map<NotificationType, number>();
  return kept.map((c) => {
    const index = next.get(c.type) ?? 0;
    next.set(c.type, index + 1);
    return {
      id: `notif-${c.type}-${index}`,
      type: c.type,
      fireAt: c.fireAt,
      channel: CHANNEL_OF[c.type],
      route: ROUTE_OF[c.type],
      textKey: variantKey(c.group, c.fireAt, clock),
      ...(c.params ? { params: c.params } : {}),
    };
  });
}
