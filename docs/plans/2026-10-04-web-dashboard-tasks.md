# Tasks: web-dashboard

IP: [`2026-10-04-web-dashboard.md`](2026-10-04-web-dashboard.md)

Tracer: `Blocklist` model and synced route → start a session from lists on Focus → History focus hours.

Order: **T1** first. Then T2, T3, T4 in any order (T2 needs T1). T5 needs T4. T6 needs T3. T7 needs T6. T8 needs T5 and T7. T9 needs T3.

| Task | Title | Blocked by | Criteria |
| --- | --- | --- | --- |
| T1 | `Blocklist` model, synced route, starter presets | — | A2 (backend) |
| T2 | Focus: start from blocklists + extra domains | T1 | A3 |
| T3 | Navigation shell + Blocklists screen | — | A1, A2 (UI) |
| T4 | Profile: week start day and timezone | — | A4 |
| T5 | Focus-hours utility + History screen | T4 | A5, A6 |
| T6 | Parking lot: model, route, capture on Focus | T3 | A7 |
| T7 | End-of-block review: prompt, banner, from History | T6 | A8, A9 |
| T8 | Today overview | T5, T7 | A10 |
| T9 | Devices screen | T3 | A11 |

Every task: `cd backend && bun test`, `bun run compile`, `bun run lint`; `cd frontend && bun run sdk` after backend changes, `bun run compile`, `bun run lint`, `bunx playwright test`. Docs in `docs/how-to/use-the-dashboard.md` (created in T3, extended per task) and the architecture data model section.

---

## T1 — `Blocklist` model, synced route, starter presets

- **Files:** `backend/src/models/blocklist.ts`, `backend/src/types/models/blocklistTypes.ts`, `backend/src/api/blocklists.ts`, `backend/src/api/blocklists.test.ts`, `backend/src/models/user.ts` (`starterBlocklistsSeededAt`), `backend/src/server.ts`, `frontend/store/syncdb.ts`.
- **Do:** Fields `ownerId`, `name` (1–60), `domains` (normalized with `normalizeDomains`, 1–200), `source` (`starter` | `user`). Owner-scoped sync, allowlisted writes (mirroring `focusSessions`), delete allowed for the owner. `POST /blocklists/starter` seeds the three presets once per user (idempotent via the user flag).
- **Acceptance:** A2 (backend).
- **Docs:** Blocklist section in the architecture data model.

## T2 — Focus: start from blocklists + extra domains

- **Files:** `backend/src/models/focusSession.ts` (`blocklistIds`), `backend/src/api/focusSessions.ts`, its test, `frontend/app/(tabs)/focus.tsx`, `frontend/e2e/focus-from-blocklists.spec.ts`.
- **Do:** The start form offers a multi-select of the user's lists plus the existing domain field. The server accepts `blocklistIds` (must be the caller's), merges their domains with typed ones, normalizes and de-duplicates. Calls `POST /blocklists/starter` when the user has no lists and has never been seeded.
- **Acceptance:** A3.

## T3 — Navigation shell + Blocklists screen

- **Files:** `frontend/app/(tabs)/_layout.tsx` (or a new `(app)` group), `frontend/app/(tabs)/today.tsx` (placeholder until T8), `history.tsx` (placeholder until T5), `blocklists.tsx`, `devices.tsx` (placeholder until T9), `frontend/e2e/navigation.spec.ts`, `frontend/e2e/blocklists.spec.ts`, `docs/how-to/use-the-dashboard.md`.
- **Do:** `SidebarNavigation` above the `md` breakpoint, bottom tabs below, same routes and testIDs (`nav-today`, `nav-focus`, …). Blocklists screen: list, create, rename, edit domains, delete, with validation errors from the server.
- **Acceptance:** A1, A2 (UI).

## T4 — Profile: week start day and timezone

- **Files:** `backend/src/models/user.ts` (`weekStartDay` 0–6, `timezone` IANA), `backend/src/api/users.ts` (me patch validation), tests, `frontend/app/(tabs)/profile.tsx`, `frontend/e2e/profile.spec.ts`.
- **Do:** Validate the timezone with Luxon (`IANAZone.isValidZone`). Profile shows a week-start select and a timezone select. Defaults (device zone, Monday) are saved on first visit to History or Today if unset.
- **Acceptance:** A4.

## T5 — Focus-hours utility + History screen

- **Files:** `frontend/utils/focusHours.ts`, `frontend/utils/focusHours.test.ts`, `frontend/app/(tabs)/history.tsx`, `frontend/e2e/history.spec.ts`.
- **Do:** `focusHoursByWeek(sessions, grants, {weekStartDay, timezone, now, weeks})` returns per-week totals, subtracting grant intervals clipped to each session and splitting sessions across week boundaries. History renders `BarChart` (8 weeks) and a `DataTable` of sessions (date, duration, intention, domains, peeks, review status). Requires a frontend `bun test` setup.
- **Acceptance:** A5, A6.

## T6 — Parking lot: model, route, capture on Focus

- **Files:** `backend/src/models/parkingLotItem.ts`, types, `backend/src/api/parkingLotItems.ts` + test, `frontend/store/syncdb.ts`, `frontend/app/(tabs)/focus.tsx`, `frontend/e2e/parking-lot.spec.ts`.
- **Do:** Fields `ownerId`, `sessionId` (captured in), `text` (1–280), `status` (`open` | `done` | `dismissed`), `resolvedAt`. Owner-scoped sync; create via REST; open items from earlier sessions show on the active session too.
- **Acceptance:** A7.

## T7 — End-of-block review: prompt, banner, from History

- **Files:** `backend/src/models/focusSession.ts` (`review`, `reviewSkippedAt`), `backend/src/api/focusSessions.ts` (`POST /:id/review`, `POST /:id/review/skip`), tests, `frontend/components/ReviewSheet.tsx`, `focus.tsx`, `history.tsx`, `frontend/e2e/review.spec.ts`.
- **Do:** The review action takes `{done, note, items: [{id, status}]}`, only for the owner's ended session, once. Items set to `done` or `dismissed` resolve; `open` stays (carries forward). Ending on this device opens the sheet; the banner covers the most recent ended session that is neither reviewed nor skipped.
- **Acceptance:** A8, A9.

## T8 — Today overview

- **Files:** `frontend/app/(tabs)/today.tsx`, `frontend/e2e/today.spec.ts`.
- **Do:** `DashboardGrid` with the active session (or the start form), this week vs last week focus hours, and the review banner. Today becomes the default route.
- **Acceptance:** A10.

## T9 — Devices screen

- **Files:** `frontend/app/(tabs)/devices.tsx`, `frontend/e2e/devices.spec.ts`.
- **Do:** List device sessions (name, client, signed in, revoked) with a confirm-to-revoke action, using the existing generated hooks.
- **Acceptance:** A11.
