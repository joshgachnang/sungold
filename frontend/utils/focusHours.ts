import {DateTime, type DateTimeOptions} from "luxon";

export interface FocusHoursSession {
  _id: string;
  endedAt?: string | null;
  startedAt: string;
  status?: "active" | "ended";
}

export interface FocusHoursGrant {
  _id: string;
  expiresAt: string;
  issuedAt: string;
  sessionId: string;
}

export interface FocusHoursOptions {
  now?: Date | string;
  timezone: string;
  weekStartDay: number;
  weeks?: number;
}

export interface FocusHoursWeek {
  hours: number;
  label: string;
  milliseconds: number;
  weekEnd: string;
  weekStart: string;
}

interface IntervalMs {
  end: number;
  start: number;
}

const DEFAULT_WEEKS = 8;
const MILLIS_PER_HOUR = 60 * 60 * 1000;

const parseDateTime = (value: Date | string, zone: string): DateTime => {
  const options: DateTimeOptions = {zone};
  return value instanceof Date
    ? DateTime.fromJSDate(value, options)
    : DateTime.fromISO(value, {setZone: true}).setZone(zone);
};

const startOfConfiguredWeek = (value: DateTime, weekStartDay: number): DateTime => {
  const normalizedStartDay = ((weekStartDay % 7) + 7) % 7;
  const currentDay = value.weekday % 7;
  const daysSinceStart = (currentDay - normalizedStartDay + 7) % 7;
  return value.startOf("day").minus({days: daysSinceStart});
};

const overlap = (left: IntervalMs, right: IntervalMs): IntervalMs | undefined => {
  const start = Math.max(left.start, right.start);
  const end = Math.min(left.end, right.end);
  return end > start ? {end, start} : undefined;
};

const mergeIntervals = (intervals: IntervalMs[]): IntervalMs[] => {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: IntervalMs[] = [];
  for (const interval of sorted) {
    const previous = merged.at(-1);
    if (!previous || interval.start > previous.end) {
      merged.push({...interval});
      continue;
    }
    previous.end = Math.max(previous.end, interval.end);
  }
  return merged;
};

const intervalDuration = (intervals: IntervalMs[]): number =>
  intervals.reduce((total, interval) => total + interval.end - interval.start, 0);

export const focusHoursByWeek = (
  sessions: FocusHoursSession[],
  grants: FocusHoursGrant[],
  options: FocusHoursOptions
): FocusHoursWeek[] => {
  const weeksToShow = options.weeks ?? DEFAULT_WEEKS;
  const now = parseDateTime(options.now ?? new Date(), options.timezone);
  const currentWeekStart = startOfConfiguredWeek(now, options.weekStartDay);
  const weekStarts = Array.from({length: weeksToShow}, (_, index) =>
    currentWeekStart.minus({weeks: weeksToShow - index - 1})
  );
  const weeks = weekStarts.map((weekStart) => {
    const weekEnd = weekStart.plus({weeks: 1});
    return {
      endMs: weekEnd.toMillis(),
      result: {
        hours: 0,
        label: weekStart.toFormat("LLL d"),
        milliseconds: 0,
        weekEnd: weekEnd.toISO() ?? weekEnd.toUTC().toISO() ?? "",
        weekStart: weekStart.toISO() ?? weekStart.toUTC().toISO() ?? "",
      },
      startMs: weekStart.toMillis(),
    };
  });
  const grantsBySessionId = new Map<string, FocusHoursGrant[]>();
  for (const grant of grants) {
    const sessionGrants = grantsBySessionId.get(grant.sessionId) ?? [];
    sessionGrants.push(grant);
    grantsBySessionId.set(grant.sessionId, sessionGrants);
  }

  for (const session of sessions) {
    const sessionStart = parseDateTime(session.startedAt, options.timezone).toMillis();
    const sessionEnd = session.endedAt
      ? parseDateTime(session.endedAt, options.timezone).toMillis()
      : now.toMillis();
    if (sessionEnd <= sessionStart) {
      continue;
    }
    const sessionInterval = {end: sessionEnd, start: sessionStart};
    const sessionGrantIntervals = (grantsBySessionId.get(session._id) ?? [])
      .map((grant) =>
        overlap(sessionInterval, {
          end: parseDateTime(grant.expiresAt, options.timezone).toMillis(),
          start: parseDateTime(grant.issuedAt, options.timezone).toMillis(),
        })
      )
      .filter((interval): interval is IntervalMs => interval !== undefined);

    for (const week of weeks) {
      const weekOverlap = overlap(sessionInterval, {end: week.endMs, start: week.startMs});
      if (!weekOverlap) {
        continue;
      }
      const clippedGrants = sessionGrantIntervals
        .map((grant) => overlap(grant, weekOverlap))
        .filter((interval): interval is IntervalMs => interval !== undefined);
      const grantDuration = intervalDuration(mergeIntervals(clippedGrants));
      week.result.milliseconds += Math.max(0, weekOverlap.end - weekOverlap.start - grantDuration);
    }
  }

  return weeks.map((week) => ({
    ...week.result,
    hours: Number((week.result.milliseconds / MILLIS_PER_HOUR).toFixed(2)),
  }));
};
