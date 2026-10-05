# Tasks: platform-architecture

IP: [`2026-09-25-platform-architecture.md`](2026-09-25-platform-architecture.md)

Tracer: web **Start session** → sync → Mac menu-bar app → filter blocks the domain; **Peek** → signed grant → Mac unblocks until expiry → relocks.

Order: **T1** first. Then **T2** and **T5** in parallel. T3 needs T2. T4 needs T2 + T3. T6 needs T5 and H2. T7 needs T6. T8 needs T3 + T7.

| Task | Title | Blocked by | Criteria |
| --- | --- | --- | --- |
| T1 | Architecture docs + repo layout | — | A1 |
| T2 | `FocusSession` model + synced route | T1 | A2 |
| T3 | `UnlockGrant` model, Ed25519 signing, public key route | T2 | A3, A4 |
| T4 | Web focus screen: start, peek, countdown | T2, T3 | A5 |
| T5 | Device sign-in handoff (backend + web) | T1 | A6 (backend half) |
| T6 | Mac menu-bar app: sign-in, live state | T5, H2 | A4 (probe), A6, A10 |
| T7 | Mac filter system extension | T6 | A7 |
| T8 | Mac grant enforcement + relock | T3, T7 | A8, A9 |

---

## T1 — Architecture docs + repo layout

- **Files:** `docs/explanation/architecture.md`, `docs/decisions/0001-native-swiftui-mac-client.md` … `0010-apple-developer-team.md`, `README.md` (layout section), `macos/README.md` and `browser-extensions/README.md` placeholders.
- **Do:** One decision record per AD1–AD10 (context, decision, consequences). The architecture doc has a component diagram (backend, web/iOS Expo app, Mac app, filter extension, future iOS extensions and browser extensions), the grant flow, the privacy line, and the offline rule.
- **Acceptance:** A1.
- **Verify:** All links resolve; every AD in the IP maps to exactly one record.
- **Docs:** This task is the docs.
- **Skills:** `update-docs`.

## T2 — `FocusSession` model + synced route

- **Files:** `backend/src/models/focusSession.ts`, `backend/src/types/models/focusSessionTypes.ts`, `backend/src/api/focusSessions.ts`, `backend/src/server.ts`, `backend/src/api/focusSessions.test.ts`, `frontend/store/sdk.ts` (regenerated).
- **Do:** Fields: `ownerId`, `status` (`active` | `ended`), `startedAt`, `endsAt` (optional), `endedAt`, `blockedDomains: string[]` (normalized lowercase hostnames), `intention` (optional string). Add `syncPlugin`, `isDeletedPlugin`, a `modelRouter` with owner-scoped `sync` config, `IsOwner` permissions. Every field has a `description`. At most one active session per user (409 otherwise).
- **Acceptance:** A2.
- **Verify:** `cd backend && bun test`; `bun run compile`; `bun run lint`; `cd frontend && bun run sdk`.
- **Docs:** Add the model to `docs/explanation/architecture.md` data section.
- **Skills:** `terreno-backend-api`, `mongoose-schema-safety`, `backend-test-env`, `generate-sdk`.

## T3 — `UnlockGrant` model, Ed25519 signing, public key route

- **Files:** `backend/src/models/unlockGrant.ts`, `backend/src/utils/grantSigning.ts`, `backend/src/api/grants.ts`, `backend/src/api/grants.test.ts`, `backend/.env.example`, `backend/src/scripts/generateGrantKey.ts`.
- **Do:** `POST /focusSessions/:id/grants {minutes, reason: "peek"}` creates a grant for the owner's active session, computes `expiresAt`, signs canonical JSON `{v:1, grantId, userId, sessionId, scope:"all", issuedAt, expiresAt}`, and stores `payload` + `signature` (base64url). `GET /unlockGrants/publicKey` returns the raw Ed25519 public key (the plan's `/grants/public-key`, renamed to fit Terreno's `modelRouter` collection-action paths). Grants are an owner-scoped synced collection. Key from `GRANT_SIGNING_PRIVATE_KEY`; the dev script generates one into `backend/.env`. Minutes clamped to 1–30.
- **Acceptance:** A3, A4.
- **Verify:** `bun test` covering verify-ok, tampered payload, ended session, other user, clamp.
- **Docs:** Grant format section in `docs/explanation/architecture.md` (versioned contract) and decision record 0007.
- **Skills:** `terreno-backend-api`, `mongoose-schema-safety`, `backend-test-env`.

## T4 — Web focus screen: start, peek, countdown

- **Files:** `frontend/app/(tabs)/focus.tsx`, `frontend/app/(tabs)/_layout.tsx`, `e2e/focus-session.spec.ts`, `e2e/helpers/login.ts`, `e2e/fixtures/testUsers.ts`, `playwright.config.ts`.
- **Do:** A tab to enter domains and an optional intention, start/end a session, press **Peek 5 min**, and see the active grant's countdown. Use syncdb hooks to read sessions and grants, REST hooks to write (a local syncdb create keeps pre-normalization values; see the architecture doc), and `@terreno/ui` components. testIDs such as `focus-screen`, `focus-domain-input`, `focus-start-button`, `focus-peek-button`, `focus-grant-countdown`, `focus-end-button`.
- **Acceptance:** A5.
- **Verify:** `bunx playwright test e2e/focus-session.spec.ts`; `bun run compile`; `bun run lint`.
- **Docs:** User-facing how-to `docs/how-to/start-a-focus-session.md`.
- **Skills:** `terreno-ui`, `terreno-data-fetching`, `building-terreno-apps`, `verify-ui-changes`.

## T5 — Device sign-in handoff (backend + web)

- **Files:** `backend/src/api/deviceAuth.ts`, `backend/src/api/deviceAuth.test.ts`, `backend/src/utils/betterAuthConfig.ts`, `frontend/app/device-login.tsx`.
- **Do:** `/device-login?client=mac&redirect=sungold-mac://auth&state=…` in the web app. After sign-in, it calls a backend route that issues a Better Auth bearer session for a named device, then redirects to `redirect?token=…&state=…`. The redirect is allowlisted (`sungold-mac://auth` only). A device session can be revoked.
- **Acceptance:** A6 (backend half).
- **Verify:** `bun test` covering allowlist rejection, state echo, token usable on `/auth/me` and the sync snapshot.
- **Docs:** Auth section of `docs/explanation/architecture.md`.
- **Skills:** `terreno-backend-api`, `backend-test-env`.

## T6 — Mac menu-bar app: sign-in, live state

- **Files:** `macos/project.yml`, `macos/Sungold/` (App, `MenuBarExtra` view, `AuthClient`, `KeychainStore`, `SessionClient`, `Config.xcconfig`), `macos/SungoldTests/`, `docs/how-to/run-the-mac-app.md`.
- **Do:** Start with a spike to prove `GET /sync/snapshot` + Socket.IO `sync:subscribe`/`sync:delta` from Swift with a bearer token. If it fails, implement the fallback endpoint and record it. Then build the menu bar: the signed-in user, the active session with its domains and ends-at, the grant countdown, and sign-out. Team ID and bundle prefix come from `Config.xcconfig` (H2).
- **Acceptance:** A6, A10; A4 probe (snapshot shows grants).
- **Verify:** `xcodegen generate && xcodebuild -scheme Sungold build test`; a run log showing a session started on web appearing in the menu within 2 s.
- **Docs:** `docs/how-to/run-the-mac-app.md`; transport choice in the architecture doc.
- **Skills:** none in the repo; Apple docs.

## T7 — Mac filter system extension

- **Files:** `macos/SungoldFilter/` (`FilterDataProvider.swift`, `Info.plist`, entitlements), `macos/Sungold/FilterController.swift`, `macos/project.yml`, `macos/scripts/probe-block.sh`.
- **Do:** Install the extension with `OSSystemExtensionRequest` and enable it with `NEFilterManager`. Push the blocked hostnames to the provider through `vendorConfiguration`. Drop flows whose remote hostname or SNI matches (including subdomains). The app pushes an empty list when no session is active.
- **Acceptance:** A7.
- **Verify:** `systemextensionsctl list` output; `probe-block.sh` artifact showing blocked vs allowed domains.
- **Docs:** Developer-mode and approval steps in `run-the-mac-app.md`.
- **Skills:** none in the repo; Apple TN3134.

## T8 — Mac grant enforcement + relock

- **Files:** `macos/Shared/GrantVerifier.swift` (Ed25519 verification, contract v1 checks, caching), `macos/Shared/FilterRules.swift` (rules passed to the filter, `UnlockTracker` with the uptime guard), `macos/SungoldFilter/FilterDataProvider.swift`, `macos/Sungold/{FilterController,SessionStore,SungoldApp}.swift`, `macos/SungoldTests/GrantTests.swift`, `macos/scripts/probe-grant.sh`.
- **Design change from the original task:** enforcement lives in the **filter extension**, not the app (the plan named `macos/Sungold/GrantVerifier.swift` and `EnforcementState.swift`). The app passes the session's domains and signed grants to the filter; the sandboxed filter, which has no network access, verifies them against the pinned key and relocks on its own. Quitting the app mid-peek therefore cannot extend it. See decision record 0007.
- **Do:** Verify grant signatures with the public key pinned in the build. The block is lifted only while a verified grant for the active session and user is unexpired, measured on the wall clock and on uptime since the filter first saw it. Offline: keep the last known rules and never unlock without a verified grant. Never drop flows from the Apple-signed system DNS service.
- **Acceptance:** A8, A9.
- **Verify:** Swift tests (valid Node-signed fixture, tampered, wrong key, expired, wrong version/scope, clock rollback, other session/user); `probe-grant.sh` (blocked → peek → app quit → relock at expiry) and `probe-block.sh`, both requiring "connection refused" for blocked sites so DNS failures cannot pass as blocks.
- **Docs:** "Grant enforcement on the Mac" in the architecture doc; "Verify peeks" and "Updating the filter" in `run-the-mac-app.md`.
- **Skills:** none in the repo.
