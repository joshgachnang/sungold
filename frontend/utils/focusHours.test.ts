import {describe, expect, test} from "bun:test";
import {focusHoursByWeek} from "./focusHours";

describe("focusHoursByWeek", () => {
  const weekBoundaryCases = [
    {
      grants: [
        {
          _id: "grant-current-week",
          expiresAt: "2026-10-05T08:15:00.000Z",
          issuedAt: "2026-10-05T07:30:00.000Z",
          sessionId: "cross-week",
        },
      ],
      name: "Monday-start weeks split a session and subtract a grant only from its clipped week",
      options: {
        now: "2026-10-08T12:00:00.000Z",
        timezone: "America/Los_Angeles",
        weekStartDay: 1,
        weeks: 2,
      },
      sessions: [
        {
          _id: "cross-week",
          endedAt: "2026-10-05T08:30:00.000Z",
          startedAt: "2026-10-05T06:30:00.000Z",
          status: "ended" as const,
        },
      ],
      want: [
        {hours: 0.5, weekStart: "2026-09-28T00:00:00.000-07:00"},
        {hours: 0.75, weekStart: "2026-10-05T00:00:00.000-07:00"},
      ],
    },
    {
      grants: [],
      name: "Sunday-start weeks split at Sunday midnight",
      options: {
        now: "2026-10-08T12:00:00.000Z",
        timezone: "America/Los_Angeles",
        weekStartDay: 0,
        weeks: 2,
      },
      sessions: [
        {
          _id: "sunday-boundary",
          endedAt: "2026-10-04T08:30:00.000Z",
          startedAt: "2026-10-04T06:30:00.000Z",
          status: "ended" as const,
        },
      ],
      want: [
        {hours: 0.5, weekStart: "2026-09-27T00:00:00.000-07:00"},
        {hours: 1.5, weekStart: "2026-10-04T00:00:00.000-07:00"},
      ],
    },
    {
      grants: [],
      name: "Saturday-start weeks split at Saturday midnight",
      options: {
        now: "2026-10-08T12:00:00.000Z",
        timezone: "America/Los_Angeles",
        weekStartDay: 6,
        weeks: 2,
      },
      sessions: [
        {
          _id: "saturday-boundary",
          endedAt: "2026-10-03T08:30:00.000Z",
          startedAt: "2026-10-03T06:30:00.000Z",
          status: "ended" as const,
        },
      ],
      want: [
        {hours: 0.5, weekStart: "2026-09-26T00:00:00.000-07:00"},
        {hours: 1.5, weekStart: "2026-10-03T00:00:00.000-07:00"},
      ],
    },
    {
      grants: [],
      name: "Asia/Kolkata buckets an instant into the next configured week",
      options: {
        now: "2026-10-08T12:00:00.000Z",
        timezone: "Asia/Kolkata",
        weekStartDay: 1,
        weeks: 2,
      },
      sessions: [
        {
          _id: "kolkata-monday",
          endedAt: "2026-10-04T20:00:00.000Z",
          startedAt: "2026-10-04T19:00:00.000Z",
          status: "ended" as const,
        },
      ],
      want: [
        {hours: 0, weekStart: "2026-09-28T00:00:00.000+05:30"},
        {hours: 1, weekStart: "2026-10-05T00:00:00.000+05:30"},
      ],
    },
    {
      grants: [],
      name: "America/Los_Angeles buckets the same instant into the previous configured week",
      options: {
        now: "2026-10-08T12:00:00.000Z",
        timezone: "America/Los_Angeles",
        weekStartDay: 1,
        weeks: 2,
      },
      sessions: [
        {
          _id: "los-angeles-sunday",
          endedAt: "2026-10-04T20:00:00.000Z",
          startedAt: "2026-10-04T19:00:00.000Z",
          status: "ended" as const,
        },
      ],
      want: [
        {hours: 1, weekStart: "2026-09-28T00:00:00.000-07:00"},
        {hours: 0, weekStart: "2026-10-05T00:00:00.000-07:00"},
      ],
    },
    {
      grants: [
        {
          _id: "fall-back-grant",
          expiresAt: "2026-11-01T09:00:00.000Z",
          issuedAt: "2026-11-01T08:00:00.000Z",
          sessionId: "fall-back-day",
        },
      ],
      name: "fall-back DST day uses elapsed time for the 25-hour America/Los_Angeles day",
      options: {
        now: "2026-11-03T12:00:00.000Z",
        timezone: "America/Los_Angeles",
        weekStartDay: 0,
        weeks: 1,
      },
      sessions: [
        {
          _id: "fall-back-day",
          endedAt: "2026-11-02T08:00:00.000Z",
          startedAt: "2026-11-01T07:00:00.000Z",
          status: "ended" as const,
        },
      ],
      want: [{hours: 24, weekStart: "2026-11-01T00:00:00.000-07:00"}],
    },
  ];

  test.each(weekBoundaryCases)("$name", ({grants, options, sessions, want}) => {
    const weeks = focusHoursByWeek(sessions, grants, options);

    expect(weeks.map((week) => ({hours: week.hours, weekStart: week.weekStart}))).toEqual(want);
  });

  test("uses now for active sessions and does not double subtract overlapping grants", () => {
    const weeks = focusHoursByWeek(
      [
        {
          _id: "dst-active",
          startedAt: "2026-03-08T16:00:00.000Z",
          status: "active",
        },
      ],
      [
        {
          _id: "grant-one",
          expiresAt: "2026-03-08T17:15:00.000Z",
          issuedAt: "2026-03-08T16:30:00.000Z",
          sessionId: "dst-active",
        },
        {
          _id: "grant-two",
          expiresAt: "2026-03-08T17:45:00.000Z",
          issuedAt: "2026-03-08T17:00:00.000Z",
          sessionId: "dst-active",
        },
      ],
      {
        now: "2026-03-08T18:00:00.000Z",
        timezone: "America/Los_Angeles",
        weekStartDay: 1,
        weeks: 1,
      }
    );

    expect(weeks).toMatchObject([
      {
        hours: 0.75,
        label: "Mar 2",
        milliseconds: 45 * 60 * 1000,
        weekEnd: "2026-03-09T00:00:00.000-07:00",
        weekStart: "2026-03-02T00:00:00.000-08:00",
      },
    ]);
  });

  test("measures elapsed time across the spring-forward DST jump", () => {
    const weeks = focusHoursByWeek(
      [
        {
          _id: "spring-forward",
          endedAt: "2026-03-08T10:30:00.000Z",
          startedAt: "2026-03-08T09:30:00.000Z",
          status: "ended",
        },
      ],
      [
        {
          _id: "grant-across-jump",
          expiresAt: "2026-03-08T10:15:00.000Z",
          issuedAt: "2026-03-08T09:45:00.000Z",
          sessionId: "spring-forward",
        },
      ],
      {
        now: "2026-03-08T12:00:00.000Z",
        timezone: "America/Los_Angeles",
        weekStartDay: 1,
        weeks: 1,
      }
    );

    expect(weeks).toMatchObject([
      {
        hours: 0.5,
        label: "Mar 2",
        milliseconds: 30 * 60 * 1000,
        weekEnd: "2026-03-09T00:00:00.000-07:00",
        weekStart: "2026-03-02T00:00:00.000-08:00",
      },
    ]);
  });

  test("returns empty weeks when there are no sessions", () => {
    const weeks = focusHoursByWeek([], [], {
      now: "2026-10-08T12:00:00.000Z",
      timezone: "UTC",
      weekStartDay: 1,
      weeks: 3,
    });

    expect(weeks.map((week) => week.hours)).toEqual([0, 0, 0]);
  });
});
