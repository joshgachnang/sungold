# Sungold architecture

Sungold is a deep-work app: focus sessions that block distracting sites and apps on the Mac and iPhone, unlocked only by server-signed grants. This page is the source of truth for how the pieces fit. Each decision links to its record in [`docs/decisions/`](../decisions/).

## Components

```text
                ┌──────────────────────────── backend/ (Express + Mongoose, @terreno/api) ───────────────────────────┐
                │  Better Auth   FocusSession   UnlockGrant   grant signing (Ed25519)   SyncApp + RealtimeApp          │
                └───────▲──────────────────────────▲─────────────────────────────────────▲────────────────────────────┘
      sync + REST       │                          │  sync snapshot + socket deltas       │  (later) sync
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
| `Blocklist` | user | yes, owner stream | Saved sets of distracting domains used to start focus sessions |
| `FocusSession` | user | yes, owner stream | An active or ended block: domains, intention, timing |
| `UnlockGrant` | user | yes, owner stream | A signed, expiring permission to lift a session's block |

### `Blocklist`

Route: `/blocklists` (`backend/src/api/blocklists.ts`). Sync stream: `blocklists|owner:{ownerId}`.

| Field | Type | Notes |
| --- | --- | --- |
| `_id` | string | String so offline sync clients can mint ids |
| `ownerId` | ObjectId | Set from the caller; clients cannot set it |
| `name` | string | User-visible name, 1-60 characters |
| `domains` | string[] | 1-200 normalized bare lowercase hostnames, de-duplicated |
| `source` | `starter` \| `user` | Starter presets are editable copies owned by the user |

Owners can create, list, read, update and delete their own blocklists. Other users cannot see them. `POST /blocklists/starter` copies the Social, News and Video starter presets once per user and returns that user's starter lists; the seed flag prevents recreating deleted or renamed starters.

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

## Mac data path

The Mac app speaks the Terreno sync protocol read-only with its device bearer token (`macos/Sungold/SessionStore.swift`):

1. `GET /auth/me` for the user id, then `GET /sync/snapshot` for `focusSessions|owner:{userId}` and `unlockGrants|owner:{userId}` (`macos/Sungold/SnapshotPager.swift`), following the same rules as `@terreno/syncdb`: echo `legacyCursor` while the server returns one, never move the cursor past `frontierSeq`, restart the stream from 0 once if the stored cursor is below `oldestRetainedSeq`, and stop when `hasMore` is false or a page makes no progress.
2. A Socket.IO connection (`/socket.io/`, WebSocket transport, `auth: {token: "Bearer …"}`) sends `sync:subscribe {collections: ["focusSessions", "unlockGrants"]}`. Once both collections are confirmed (`sync:subscribed`), it catches up once more so nothing between snapshot and subscription is missed. It applies each `sync:delta`, moving the cursor to `min(seq, frontierSeq)`, and runs a catch-up on `sync:resync-required`.
3. Each entity is guarded by its own `seq` (legacy seq-0 rows always apply), so replays and out-of-order deltas do not overwrite newer data.
4. If nothing arrives for the server's `pingInterval + pingTimeout`, the connection is treated as dead. Reconnects back off 1, 2, 4, 8, 16, then 30 s. A 401 or socket auth rejection signs the Mac out.
5. Work from a previous sign-in is discarded: every async step checks that it still belongs to the current sign-in before touching state.

The app never writes through sync. Syncing starts at launch, not when the menu is opened.

## Mac website blocking

`macos/SungoldFilter/` is an `NEFilterDataProvider` system extension (decision [0002](../decisions/0002-layered-mac-web-blocking.md), layer 1).

| Piece | Behavior |
| --- | --- |
| What it blocks | The active session's `blockedDomains` and their subdomains (`DomainMatcher`), unless a verified, unexpired grant for that session is present. No active session: nothing. |
| How it sees the site | `remoteHostname` or the flow URL; for connections made by IP, the TLS ClientHello server name or HTTP `Host` header from the first outbound bytes (`TLSClientHello`). Paths are never visible. |
| Where the rules come from | The app writes `FilterRules` (domains, session id, user id and the session's signed grants) to the filter configuration's `vendorConfiguration` whenever they change (`FilterController`). The system keeps them when the app quits. |
| DNS | Flows from the system DNS service (`com.apple.mDNSResponder`) are never dropped: they are long-lived and shared across lookups, so dropping one would keep lookups failing after a peek or session end. Blocking applies to the connection to the site. |
| When the list changes | Only after the app has synced the current sign-in. Launching, going offline or signing out never clears it; a session that ends while the app is closed stays blocked until the next sync. |
| What it reports | Nothing leaves the device; blocked hosts are only written to the local system log. |
| Known gaps | UDP flows with no hostname (an app that resolves DNS itself and connects by IP, or uses DNS over HTTPS) are allowed, and for TCP connections by IP the server name must be in the first 2048 bytes. Chrome's QUIC traffic carries a hostname and is blocked. |

### Grant enforcement on the Mac

The filter extension enforces grants itself (`Shared/GrantVerifier.swift`, `Shared/FilterRules.swift`), so a peek ends on time even if the app has quit or the Mac is offline:

1. Each grant's signature is verified against the Ed25519 public key pinned in the build (`SUNGOLD_GRANT_PUBLIC_KEY` in `macos/Config.xcconfig`, copied into both Info.plists). The payload must be contract `v: 1`, scope `all`, for the rules' user and session, with `expiresAt` after `issuedAt`.
2. A verified grant lifts the block while the wall clock is before `expiresAt` and no more than 5 minutes before `issuedAt`.
3. Clock guard: when the filter first sees a grant it records the remaining time and the monotonic uptime. The grant ends when either the wall clock reaches `expiresAt` or that much uptime has passed, so setting the clock back does not extend it. After a reboot the uptime baseline restarts, so a grant seen again after rebooting with the clock set back would get its remaining time again.
4. New connections are checked as they open; connections opened during a peek are not cut when it ends.

The menu-bar countdown uses the same verification, so it never shows an unlock the filter would refuse.

## Authentication

- Web uses the standard Better Auth session.
- Native clients (Mac, iOS) use a Better Auth bearer session token.
- The Mac signs in by browser handoff: it opens the web login and receives a device token on `sungold-mac://auth` ([0008](../decisions/0008-mac-browser-signin-handoff.md)).

### Device sign-in (browser handoff)

1. The Mac opens `https://<web app>/device-login?client=mac&redirect=sungold-mac://auth&state=<random>&name=<computer name>` in `ASWebAuthenticationSession`.
2. If the user is signed out, the page sends them to `/login` and back (`/login?next=/device-login?...`; only `/device-login` paths are accepted as `next`).
3. The user approves. The page calls `POST /deviceSessions/issue` with `{client, name, redirect, state}`.
4. The backend checks that `redirect` is exactly the client's allowlisted callback (`mac` → `sungold-mac://auth`) and that `state` is 1–256 URL-safe characters, creates a new Better Auth session for the user, records a `DeviceSession`, and returns `redirectUrl` = `sungold-mac://auth?state=<state>&token=<session token>`.
5. The page opens `redirectUrl`; the Mac checks `state` and stores the token in the Keychain. It sends `Authorization: Bearer <token>` on REST, sync and socket requests.

`DeviceSession` (`/deviceSessions`, not synced) lists a user's signed-in devices (`client`, `name`, `revokedAt`) without the token. `POST /deviceSessions/:id/revoke` deletes the Better Auth session, so the device's token stops working immediately; other sessions are unaffected. Device sessions cannot be created, edited or deleted directly.

- **Only a web sign-in can add a device.** `issue` returns 403 when the caller is itself a device session, so a stolen device token cannot mint new tokens that would survive its revocation.
- **Tokens expire like any Better Auth session.** When a device token stops working (expiry, revocation, password reset), requests return 401 and the device must run the sign-in handoff again. The `DeviceSession` record is not updated for expiry, so the device list can show an expired device as active until it is revoked.

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
