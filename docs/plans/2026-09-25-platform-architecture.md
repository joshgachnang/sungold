# IP: Sungold platform architecture + walking skeleton

**Status:** Draft — awaiting approval
**Slug:** `platform-architecture`
**Tasks:** [`2026-09-25-platform-architecture-tasks.md`](2026-09-25-platform-architecture-tasks.md)
**Execution state:** `.terreno/pipeline/platform-architecture.json` (git-ignored)

## Destination

Sungold's cross-platform architecture is written down, and a walking skeleton proves it end to end: a user starts a focus session in the web app, the native Mac menu-bar app receives it live and blocks one domain through a system network filter, and a server-signed timed grant unblocks that domain until the grant expires, after which the Mac relocks on its own.

Every later IP (iOS blocking, page-level rules, strictness ladder, NFC, comms, planning, re-entry) builds on the contracts this IP fixes: the session and grant models, the signed-grant format, how native clients authenticate and receive state, and where native code lives.

## Background

- The repo is a fresh `create-terreno-app` 57.6.1 scaffold: Express/Mongoose backend with Better Auth, `SyncApp` + `RealtimeApp`, and an Expo universal frontend on `@terreno/syncdb`.
- **Apple's Screen Time API (FamilyControls/ManagedSettings/DeviceActivity) is iOS/iPadOS-only.** It is not available to native macOS apps, including Developer ID apps. The Mac therefore needs its own blocking stack and shares no blocking code with iOS.
- **`ai-watchdog` contains no blocking code.** It is a react-native-macos menu-bar monitor. Its lasting lesson is the cost of `@terreno/ui` on react-native-macos: a vendored fork, four patches, Metro shims.
- **Mac blockers in market** (Opal, RescueTime, Freedom non-proxy, Focus, 1Focus) read the active tab URL over Apple Events (one Automation prompt per browser) and redirect. None do path-level blocking at the network layer; Firefox is unsupported by that technique everywhere.
- A `NEFilterDataProvider` content filter sees hostnames (and SNI) for HTTPS, never paths. It ships as a system extension under Developer ID; the user can disable it in System Settings.
- Terreno syncdb is local-first on the client, but the **server is the authority and sees plaintext**. Web local storage is encrypted with a server-provided key. There is no E2E mode.
- Native clients authenticate to Better Auth with a bearer session token (Terreno authentication docs).

## Architecture decisions

| # | Decision | Consequence |
| --- | --- | --- |
| AD1 | Mac client is a **native SwiftUI menu-bar app** (`MenuBarExtra`), not react-native-macos. | Heavy UI (planning, review, settings) lives in the Expo app on web/iOS; the Mac app is status, controls, permission flows and enforcement. |
| AD2 | Mac web blocking is layered: **NEFilterDataProvider system extension** for whole domains → **Apple Events URL watcher** for path rules in Safari/Chromium browsers (redirect via `location.replace` so Back cannot undo it) → **optional browser extensions** for instant in-page rules. Firefox/unknown browsers are hidden during hard/nuclear sessions. | This IP ships only the filter layer. The watcher and extensions are later IPs that plug into the same rule model. |
| AD3 | Mac app blocking watches `NSWorkspace` launch/activation and hides or quits blocked apps behind an intention overlay. No Endpoint Security. | Later IP. Quitting Sungold is the bypass; the server detects a missing heartbeat. |
| AD4 | Mac distribution is **Developer ID + notarization, direct download**, auto-update via Sparkle later. No Mac App Store. | System extension and Chromium Apple Events are available. Notarization/Sparkle are out of scope here. |
| AD5 | iOS Screen Time pieces are **our own Swift app extensions** (ShieldConfiguration, ShieldAction, DeviceActivityMonitor) + a small Expo native module, wired with `@bacons/apple-targets`. | Later IP. Needs dev builds, not Expo Go. |
| AD6 | **Privacy line: server-visible, no tracking.** Standard Terreno sync; OAuth tokens encrypted at rest; collect only what users create (sessions, rules, plans). No browsing history, no activity tracking, no third-party analytics. No E2E claim in v1. | Marketing copy must not claim E2E. Filter and URL watcher evaluate locally and report nothing about visited sites. |
| AD7 | **Unlocks are server-granted.** Every unlock (NFC tap, timed peek, cooldown, escape) is an `UnlockGrant` signed by the server (Ed25519) with an expiry. Clients verify the signature against a pinned public key and relock at expiry. **Offline devices stay locked**; only the local typed-phrase escape works offline (later IP). | Clients never decide to unlock on their own. Grant format is a versioned contract shared by backend, Mac and iOS. |
| AD8 | Mac signs in by **browser handoff**: `ASWebAuthenticationSession` opens the Sungold web login and returns a device bearer session token to `sungold-mac://auth`. | No password UI in Swift; SSO/passkeys arrive for free. |
| AD9 | **Monorepo.** `macos/` (Xcode project: app + filter extension), `browser-extensions/` (later), iOS extensions inside `frontend/` via apple-targets. | One PR can change the grant format across backend, web, Mac and iOS. |
| AD10 | Apple account: **Gachnang LLC organization team** for shipping and for the Family Controls entitlement. Until it exists, local dev builds sign with the existing paid team; bundle IDs are config values so switching is a config change. | Human gate H1. Nothing ships under the interim team. |

### Recorded assumptions (low-risk, chosen by convention)

- The Xcode project is generated from `macos/project.yml` with XcodeGen, so targets are reviewable text rather than pbxproj edits (avoids ai-watchdog's Ruby pbxproj scripts).
- The Mac receives state by speaking the Terreno sync protocol read-only: `GET /sync/snapshot` on connect, Socket.IO `sync:subscribe` + `sync:delta` for live updates, bearer auth. If the protocol proves impractical from Swift, fall back to a purpose-built `GET /devices/me/state` + a socket event. Record which one shipped in the architecture doc.
- The grant payload is canonical JSON `{v, grantId, userId, sessionId, scope, issuedAt, expiresAt}` signed with Ed25519. Backend uses Node `crypto`; Mac uses CryptoKit `Curve25519.Signing`. The signing key comes from `GRANT_SIGNING_PRIVATE_KEY`, and the public key is served at `GET /unlockGrants/publicKey` and pinned in the app build.
- Grant expiry on the Mac is checked against wall-clock time with a monotonic-clock guard, so moving the system clock back does not extend a grant.
- Bundle ID prefix is `app.sungold` (from sungoldapp.com).

## Scope

**In**

- Architecture docs: `docs/explanation/architecture.md`, `docs/decisions/0001`–`0010` (one record per AD above).
- Backend: `FocusSession` and `UnlockGrant` models (synced), grant signing + public key route, device sign-in handoff.
- Web: start/stop a session with a domain list; request a 5-minute peek; see grant countdown.
- Mac: SwiftUI menu-bar app with browser sign-in, live session state, a `NEFilterDataProvider` system extension blocking the session's domains, and signed-grant unblock + automatic relock.
- Developer docs for building and running the Mac app locally.

**Out (non-scope)**

- iOS Screen Time extensions (own IP, gated on the Family Controls entitlement)
- Apple Events URL watcher, browser extensions, page-level rules
- Mac app blocking
- NFC, strictness ladder beyond a single timed peek, emergency escape
- Comms integrations, planning, re-entry brief
- Notarization, Sparkle, public distribution

## Human gates

| ID | Gate | Blocks |
| --- | --- | --- |
| H1 | Enroll **Gachnang LLC** in the Apple Developer Program as an organization (D-U-N-S), then request the Family Controls distribution entitlement for the iOS app and each extension bundle ID. | Shipping anything; the iOS blocking IP beyond dev builds. Does **not** block this IP (interim dev team). |
| H2 | Provide the interim paid team ID for local signing and confirm the system-extension developer mode setup on the dev Mac. | T6–T8 |

## Risks

| Risk | Mitigation |
| --- | --- |
| Terreno sync protocol is undocumented for non-JS clients. | T6 spikes it first; fallback endpoint is pre-agreed (see assumptions). |
| Better Auth device-token handoff to a custom scheme may need a small plugin. | T5 owns it with tests; the trusted-origin list already includes app schemes. |
| System extension approval and filter enablement are user-driven and flaky in dev. | T7 documents `systemextensionsctl` dev flow and captures CLI evidence. |
| Users can disable the filter in System Settings. | Accepted for v1; the server flags a missing enforcement heartbeat in a later IP. |

## Acceptance criteria → verification

| # | Criterion | Verification |
| --- | --- | --- |
| A1 | Architecture doc and ten decision records exist and match AD1–AD10. | File review in Roast against this table; links resolve (`bun x markdown-link-check` or equivalent). |
| A2 | An authenticated user can create, read and end their own `FocusSession`; other users cannot read it. | Backend `bun test` covering owner and non-owner access. |
| A3 | `POST /focusSessions/:id/grants` returns a grant whose Ed25519 signature verifies against `GET /unlockGrants/publicKey`; grants for ended sessions or other users' sessions are rejected. | Backend `bun test`. |
| A4 | Grants are synced to the owner's devices through the same stream as sessions. | Backend test asserting the grant collection is registered for owner-scoped sync; T6 snapshot probe shows grant rows. |
| A5 | The web app can start a session with domains, request a 5-minute peek, and shows the grant countdown. | Playwright spec `e2e/focus-session.spec.ts` using `loginAs` and testIDs. |
| A6 | The Mac app signs in through the browser and stores the bearer token in the Keychain. | Swift unit test for callback parsing + token store; T5 backend test for the handoff route; recorded run log. |
| A7 | While a session is active, a request to a blocked domain from the Mac fails, and an unblocked domain succeeds. | Scripted probe `macos/scripts/probe-block.sh` (`curl` with timestamps), output saved as an artifact. |
| A8 | After a peek grant, the blocked domain loads until `expiresAt`, then fails again without any network call from the Mac. | Same probe script across the grant window; Swift unit tests for grant verification and relock timing, including clock rollback. |
| A9 | With the Mac offline, an active block stays in force and an unsigned or tampered grant is rejected. | Swift unit tests (tampered signature, wrong key, expired); probe run with the backend stopped. |
| A10 | A new developer can build and run the Mac app from docs alone. | `docs/how-to/run-the-mac-app.md` followed from a clean checkout in Taste; `xcodegen generate && xcodebuild build` succeeds in CI or locally with logged output. |

## Supporting skills

From the Terreno planning plugin (`~/src/terreno/plugins/terreno-planning/skills/`): `terreno-backend-api`, `mongoose-schema-safety`, `backend-test-env`, `generate-sdk`, `terreno-data-fetching`, `terreno-ui`, `building-terreno-apps`, `verify-ui-changes`, `update-docs`. Mac/Swift work has no repo skill; follow Apple TN3134 for system-extension deployment.

## Research sources

- Apple ManagedSettings docs (platform list), Apple forums thread 721295 (Screen Time API iOS/iPadOS only)
- Apple TN3134 (Network Extension provider deployment), WWDC25 session 234 (URL filter)
- Opal, RescueTime, Freedom, Focus, 1Focus help docs (Apple Events URL detection)
- `ai-watchdog` `docs/terreno-macos-findings.md` (react-native-macos cost)
- Terreno `docs/explanation/local-first-data.md`, `docs/reference/syncdb.md`, `docs/explanation/authentication.md`
