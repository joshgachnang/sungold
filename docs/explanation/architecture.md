# Sungold architecture

Sungold is a deep-work app: focus sessions that block distracting sites and apps on the Mac and iPhone, unlocked only by server-signed grants. This page is the source of truth for how the pieces fit. Each decision links to its record in [`docs/decisions/`](../decisions/).

## Components

```text
                ┌──────────────────────────── backend/ (Express + Mongoose, @terreno/api) ───────────────────────────┐
                │  Better Auth   FocusSession   UnlockGrant   grant signing (Ed25519)   SyncApp + RealtimeApp          │
                └───────▲──────────────────────────▲─────────────────────────────────────▲────────────────────────────┘
      sync + REST       │                          │  sync snapshot + deltas (pending T6) │  (later) sync
                        │                          │  bearer session token                │
   ┌────────────────────┴──────┐        ┌──────────┴─────────────────────┐     ┌──────────┴──────────────────────┐
   │ frontend/ (Expo)          │        │ macos/Sungold (SwiftUI menu    │     │ frontend/ iOS app extensions    │
   │ web + iOS app             │        │ bar app)                       │     │ (later): ShieldConfiguration,   │
   │ plan, start, peek, review │        │ sign-in, live state, grants    │     │ ShieldAction, DeviceActivity    │
   └───────────────────────────┘        │  └─ macos/SungoldFilter        │     └─────────────────────────────────┘
                                        │     NEFilterDataProvider       │
                                        │  (later) Apple Events watcher, │     ┌─────────────────────────────────┐
                                        │  app-launch blocker            │     │ browser-extensions/ (later)     │
                                        └────────────────────────────────┘     └─────────────────────────────────┘
```

| Component | Path | Role | Decision |
| --- | --- | --- | --- |
| Backend | `backend/` | Auth, data authority, grant signing, sync | [0007](../decisions/0007-server-signed-unlock-grants.md) |
| Expo app (web + iOS) | `frontend/` | Planning, starting sessions, peeks, reviews | [0001](../decisions/0001-native-swiftui-mac-client.md) |
| Mac menu-bar app | `macos/Sungold/` | Status, controls, permissions, enforcement | [0001](../decisions/0001-native-swiftui-mac-client.md) |
| Mac filter extension | `macos/SungoldFilter/` | Domain-level blocking | [0002](../decisions/0002-layered-mac-web-blocking.md) |
| iOS Screen Time extensions | `frontend/targets/` (later) | App and domain shields on iPhone | [0005](../decisions/0005-own-ios-screen-time-extensions.md) |
| Browser extensions | `browser-extensions/` (later) | Instant page-level rules | [0002](../decisions/0002-layered-mac-web-blocking.md) |

## Platform constraints

- Apple's Screen Time API (FamilyControls, ManagedSettings, DeviceActivity) is **iOS/iPadOS only**. The Mac has its own blocking stack and shares no blocking code with iOS.
- A Mac network content filter sees hostnames for HTTPS, never paths. Page-level rules need the Apple Events URL watcher or browser extensions.
- The Mac app ships outside the Mac App Store ([0004](../decisions/0004-mac-direct-distribution.md)).

## Data model

| Model | Owner | Synced | Purpose |
| --- | --- | --- | --- |
| `FocusSession` | user | yes, owner stream | An active or ended block: domains, intention, timing |
| `UnlockGrant` | user | yes, owner stream | A signed, expiring permission to lift a session's block |

Details land with each model's task and are listed here once shipped.

## Unlock grants

Every unlock — timed peek, NFC tap, cooldown, emergency escape — is an `UnlockGrant` the server creates and signs. Clients never decide to unlock on their own ([0007](../decisions/0007-server-signed-unlock-grants.md)).

1. A client asks the backend for a grant for its active session.
2. The backend signs a canonical payload with Ed25519 and stores it.
3. The grant syncs to every device the user is signed in on.
4. Each device verifies the signature against the public key pinned in its build, lifts the block until `expiresAt`, and relocks on its own at expiry.

**Offline rule:** a device that cannot reach the server keeps enforcing its last known session and never unlocks without a verified grant. The local typed-phrase escape (later IP) is the only offline way out.

The grant payload format is a versioned contract; its fields are documented here when the grant task ships.

## Authentication

- Web uses the standard Better Auth session.
- Native clients (Mac, iOS) use a Better Auth bearer session token.
- The Mac signs in by browser handoff: it opens the web login and receives a device token on `sungold-mac://auth` ([0008](../decisions/0008-mac-browser-signin-handoff.md)).

## Privacy line

Sungold stores what users create — sessions, rules, plans — on a server that can read it. It does not collect browsing history, activity tracking, or third-party analytics. Blocking decisions on devices are made locally and report nothing about visited sites. OAuth tokens for integrations are encrypted at rest. There is no end-to-end encryption in v1, and product copy must not claim it ([0006](../decisions/0006-privacy-server-visible-no-tracking.md)).

## Repository layout

| Path | Contents |
| --- | --- |
| `backend/` | API server |
| `frontend/` | Expo app (web + iOS), later iOS app extensions |
| `macos/` | Xcode project (generated from `project.yml`): menu-bar app and filter extension |
| `browser-extensions/` | Browser extensions for page-level rules (later) |
| `docs/` | Architecture, decisions, how-tos, plans |

See [0009](../decisions/0009-monorepo-layout.md) and [0010](../decisions/0010-apple-developer-team.md).

## Decision records

| # | Decision |
| --- | --- |
| [0001](../decisions/0001-native-swiftui-mac-client.md) | Native SwiftUI menu-bar app for the Mac |
| [0002](../decisions/0002-layered-mac-web-blocking.md) | Layered Mac web blocking: filter, URL watcher, extensions |
| [0003](../decisions/0003-mac-app-blocking-by-launch-watch.md) | Mac app blocking by watching launches |
| [0004](../decisions/0004-mac-direct-distribution.md) | Developer ID direct download for the Mac |
| [0005](../decisions/0005-own-ios-screen-time-extensions.md) | Own Swift Screen Time extensions on iOS |
| [0006](../decisions/0006-privacy-server-visible-no-tracking.md) | Privacy: server-visible data, no tracking |
| [0007](../decisions/0007-server-signed-unlock-grants.md) | Server-signed unlock grants; offline stays locked |
| [0008](../decisions/0008-mac-browser-signin-handoff.md) | Mac sign-in by browser handoff |
| [0009](../decisions/0009-monorepo-layout.md) | All native code in this repo |
| [0010](../decisions/0010-apple-developer-team.md) | Gachnang LLC Apple team; interim dev team |
