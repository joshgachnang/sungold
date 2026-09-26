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

### `FocusSession`

Route: `/focusSessions` (`backend/src/api/focusSessions.ts`). Sync stream: `focusSessions|owner:{ownerId}`.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | string | String so offline sync clients can mint ids |
| `ownerId` | ObjectId | Set from the caller; clients cannot set it |
| `status` | `active` \| `ended` | Server-controlled; one active session per user (409 otherwise, backed by a partial unique index) |
| `blockedDomains` | string[] | At least one; normalized to bare lowercase hostnames (`https://www.YouTube.com/feed` → `youtube.com`), de-duplicated; invalid entries return 400 |
| `intention` | string | Optional, up to 280 characters |
| `startedAt` | Date | Set by the server on create |
| `endsAt` | Date | Optional planned end |
| `endedAt` | Date | Set by `POST /focusSessions/:id/end` |

Owners can read, list, update `blockedDomains`/`intention`/`endsAt`, and end their sessions. Other users cannot see them. Sessions cannot be deleted.

### `UnlockGrant`

Route: `/unlockGrants` (`backend/src/api/unlockGrants.ts`), read-only for the owner. Sync stream: `unlockGrants|owner:{ownerId}`. Grants are created only by `POST /focusSessions/:id/grants`; they cannot be created, edited or deleted directly, over REST or sync.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | string | Same value as `grantId` in the payload |
| `ownerId` | ObjectId | The session's owner |
| `sessionId` | string | The session whose block the grant lifts |
| `reason` | `peek` | Timed unlock; more reasons arrive with the strictness and NFC IPs |
| `issuedAt`, `expiresAt` | Date | Copies of the signed values, for queries and display |
| `payload` | string | Signed payload (see below), base64url |
| `signature` | string | Ed25519 signature over the payload bytes, base64url |

## Unlock grants

Every unlock — timed peek, NFC tap, cooldown, emergency escape — is an `UnlockGrant` the server creates and signs. Clients never decide to unlock on their own ([0007](../decisions/0007-server-signed-unlock-grants.md)).

1. A client asks the backend for a grant for its active session.
2. The backend signs a canonical payload with Ed25519 and stores it.
3. The grant syncs to every device the user is signed in on.
4. Each device verifies the signature against the public key pinned in its build, lifts the block until `expiresAt`, and relocks on its own at expiry.

**Offline rule:** a device that cannot reach the server keeps enforcing its last known session and never unlocks without a verified grant. The local typed-phrase escape (later IP) is the only offline way out.

### Issuing a grant

`POST /focusSessions/:id/grants` with `{"minutes": 5, "reason": "peek"}`. Owner only; the session must be active (409 otherwise). `minutes` must be a number and is rounded and clamped to 1–30. `reason` is optional and defaults to `peek`; unknown fields are rejected. The response is the stored `UnlockGrant`.

### Grant contract (v1)

`payload` is the base64url encoding of this UTF-8 JSON, with keys in this order:

```json
{"expiresAt":"2026-09-26T18:05:00.000Z","grantId":"66f…","issuedAt":"2026-09-26T18:00:00.000Z","scope":"all","sessionId":"66f…","userId":"66f…","v":1}
```

| Field | Meaning |
| --- | --- |
| `v` | Contract version; clients reject versions they do not know |
| `grantId`, `userId`, `sessionId` | What the grant belongs to; clients check `userId` and `sessionId` match their signed-in user and active session |
| `scope` | `all`: lifts the whole session block on every device |
| `issuedAt`, `expiresAt` | ISO 8601 UTC; the block is lifted only between these times |

Clients verify `signature` against the **exact payload bytes** before parsing, using the raw Ed25519 public key from `GET /unlockGrants/publicKey` (`{"algorithm":"Ed25519","publicKey":"<base64url 32 bytes>"}`, no sign-in needed), pinned in their build.

The backend signs with `GRANT_SIGNING_PRIVATE_KEY` (PKCS8 DER, base64url). `bun run grant-key` writes a development key to `backend/.env`; production keys are secrets. If the key is missing, unreadable or not an Ed25519 key, both issuing a grant and `GET /unlockGrants/publicKey` fail with 500.

## Web and iOS data path

The Expo app **reads** sessions and grants through syncdb (`focusSessions` and `unlockGrants` in `frontend/store/syncdb.ts`), so changes from any device appear live. It **writes** through REST: `POST /focusSessions`, `POST /focusSessions/:id/end` and `POST /focusSessions/:id/grants`, using the generated hooks.

Every write here is a server decision (domain normalization, one active session, ending, signing a grant). With syncdb 57.6.1, a session created locally over sync keeps the client's values even after the server normalizes them, so local syncdb writes are not used for these collections. Screens show a loading state until the sync client has started **and** finished its first pull (`start()` resolves before that pull completes), so an existing session is never shown as "no session" on a device's first load.

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
