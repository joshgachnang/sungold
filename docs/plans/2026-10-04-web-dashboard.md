# IP: Web dashboard v1

**Slug:** `web-dashboard`
**Tasks:** [`2026-10-04-web-dashboard-tasks.md`](2026-10-04-web-dashboard-tasks.md)
**Execution state:** `.terreno/pipeline/web-dashboard.json` (git-ignored)
**Depends on:** `platform-architecture` (T8 fixed, PR open). Branch from it.

## Destination

The Sungold Expo app (web and iOS) becomes a usable focus dashboard: a **Today** overview, the **Focus** screen with session start from saved **blocklists**, a **History** view with weekly focus hours, a **parking lot** for stray thoughts during a session, an **end-of-block review**, and a **Devices** page. On wide screens it uses a sidebar; on phones and narrow windows it keeps bottom tabs.

## Background

- The app today has a bottom tab bar (Home placeholder, Focus, Profile, Admin), plus the device sign-in page.
- Synced collections are `focusSessions` and `unlockGrants`. Screens **read through syncdb and write through REST** (architecture doc, "Web and iOS data path"), because syncdb 57.6.1 keeps the client's values after the server normalizes a local create. Every new collection here follows the same rule.
- The backend already lists and revokes device sessions (`/deviceSessions`), with generated hooks but no screen.
- No model exists for blocklists, parking-lot items or reviews, and nothing computes focus hours. `@terreno/api` has no aggregation helper. `User` has no timezone or week-start field.
- `@terreno/ui` provides `SidebarNavigation`, `DashboardGrid`, `DataTable`, `Card`, `BarChart` (single series of `{label, value}`), `SelectField`, `MultiselectField`, `TextField`, `Modal`, `Toast`, responsive `Box` props and `mediaQueryLargerThan`.

## Product decisions

| # | Decision |
| --- | --- |
| P1 | v1 covers Devices, Blocklists and presets, History with weekly focus hours, Review and parking lot, and a Today overview. |
| P2 | Sidebar navigation on wide screens; the same screens use bottom tabs on phones and narrow windows. |
| P3 | Focus hours = each session's time from start to end (or now, if active), minus the time covered by its unlock grants. |
| P4 | Weeks use a start day and IANA timezone saved on the user's profile, so every device agrees. |
| P5 | New accounts get editable starter blocklists (Social, News, Video) copied into their own lists. |
| P6 | Starting a session: pick one or more blocklists and optionally add extra domains; the session stores the combined, normalized domain list. |
| P7 | Ending a session opens a skippable review: what got done, a one-line note, and a decision for each parking-lot item. |
| P8 | Sessions ended elsewhere (another device) show a "Review your last session" banner on Today and Focus until reviewed or skipped. |
| P9 | Parking-lot capture is a field on the active-session Focus screen (web and iOS). Items marked "carries forward" stay open for the next session; done or dismissed items leave the lot. |
| P10 | Home becomes **Today**: active session or start form, this week's focus hours against last week, and any session awaiting review. |

### Recorded assumptions (low risk, chosen by convention)

- Starter presets: **Social** — x.com, facebook.com, instagram.com, tiktok.com, reddit.com; **News** — news.ycombinator.com, cnn.com, nytimes.com, theguardian.com; **Video** — youtube.com, netflix.com, twitch.tv. Seeded once per user, idempotently.
- Profile defaults: the device's timezone and Monday, saved the first time the user opens History or Today, until they change them.
- A session keeps its own copy of its domains; editing a blocklist later does not change past or active sessions. Sessions also record which blocklists they were started from, for display.
- Focus hours are computed on the client from synced sessions and grants (`frontend/utils/focusHours.ts`, a pure function with tests). History shows the current week plus the previous 7 weeks.
- Reviews are stored on the session (`review: {done, note, reviewedAt}` or `reviewSkippedAt`); parking-lot items are their own synced collection, owned by the user and linked to the session they were captured in.
- Admin stays reachable for admins only (sidebar bottom item), Profile moves into the sidebar's bottom section.

## Scope

**In**

- Navigation shell: Today, Focus, History, Blocklists, Devices, Profile (and Admin for admins).
- `Blocklist` model, synced route, starter presets, CRUD screen.
- Focus start from blocklists plus extra domains.
- Profile settings: week start day and timezone.
- Focus-hours utility and History screen (bar chart and session list).
- `ParkingLotItem` model, synced route, capture on Focus.
- Review on the session: prompt on end, banner for sessions ended elsewhere, review from History.
- Today overview.
- Devices screen (list and revoke).
- Docs for every user-visible area.

**Out (non-scope)**

- Day planning and calendar writing
- Mac global hotkey capture and any Mac UI changes
- Strictness levels and emergency escape
- Page-level rules (browser URL watcher, extensions)
- iOS blocking (its own IP)

## Risks

| Risk | Mitigation |
| --- | --- |
| Timezone and week-boundary bugs in focus hours | Pure utility with table-driven tests across DST changes and week-start days |
| syncdb local-write quirk | All writes go through REST; screens read via sync (existing rule) |
| Navigation rewrite breaks existing e2e specs | Keep testIDs; run the full Playwright suite in each task |
| `BarChart` is single-series | Show one bar per week; compare this week vs last on Today with text, not a stacked chart |

## Acceptance criteria → verification

| # | Criterion | Verification |
| --- | --- | --- |
| A1 | Wide screens show a sidebar with Today, Focus, History, Blocklists, Devices and Profile; narrow screens show bottom tabs with the same destinations. | Playwright at 1280 px and 390 px widths asserting `nav-*` testIDs |
| A2 | A user's blocklists are private; starter presets are created once per user and are editable and deletable. | Backend `bun test` (owner isolation, idempotent seeding, CRUD) + Playwright CRUD spec |
| A3 | Starting a session from two lists plus an extra domain creates a session with the combined, normalized domains and records the list ids. | Backend test + Playwright `focus-from-blocklists` spec |
| A4 | Week start day and timezone can be saved on the profile and drive week boundaries. | Backend test (me patch validation) + Playwright profile spec |
| A5 | Focus hours equal session time minus grant time, split correctly across week boundaries, timezones and DST. | `bun test` for `utils/focusHours.ts` with table-driven cases |
| A6 | History shows a bar chart of the last 8 weeks and a list of past sessions with duration, intention and domains. | Playwright history spec with seeded sessions |
| A7 | During a session the user can park thoughts; they appear immediately and persist across reload. | Playwright parking-lot spec |
| A8 | Ending a session opens a skippable review; submitting stores done/note and resolves parking-lot items (done, dismissed, carries forward); carried items appear in the next session. | Backend tests (review action, ownership, item transitions) + Playwright review spec |
| A9 | A session ended via the API (another device) shows the review banner on Today and Focus until reviewed or skipped. | Playwright spec ending the session through the API |
| A10 | Today shows the active session or start form, this week's and last week's focus hours, and any session awaiting review. | Playwright today spec |
| A11 | Devices lists the user's signed-in devices and revoking one removes its access. | Playwright devices spec + backend revoke test (exists) |
| A12 | Docs describe each area. | Review of `docs/how-to/use-the-dashboard.md` and architecture data sections |

## Supporting skills

`terreno-backend-api`, `mongoose-schema-safety`, `backend-test-env`, `generate-sdk`, `terreno-data-fetching`, `terreno-ui`, `building-terreno-apps`, `verify-ui-changes`, `update-docs`.

## Tasks

Details, files and verification for each task are in [`2026-10-04-web-dashboard-tasks.md`](2026-10-04-web-dashboard-tasks.md). Order: T1 first; T2 needs T1; T5 needs T4; T6 and T9 need T3; T7 needs T6; T8 needs T5 and T7.

- [x] **T1** — Add Blocklist model, synced route and starter presets
- [x] **T2** — Start focus sessions from blocklists plus extra domains
- [x] **T3** — Add sidebar/tab navigation shell and the Blocklists screen
- [x] **T4** — Add week start day and timezone to the profile
- [ ] **T5** — Add focus-hours calculation and the History screen
- [ ] **T6** — Add the parking lot with capture on the Focus screen
- [ ] **T7** — Add the end-of-block review prompt, banner and History review
- [ ] **T8** — Add the Today overview
- [ ] **T9** — Add the Devices screen

## Sign-off

Approved by the requester in chat on 2026-10-04 ("approve it and use brewery to build it").

Status: approved
