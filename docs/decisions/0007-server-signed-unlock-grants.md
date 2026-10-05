# 0007: Server-signed unlock grants; offline stays locked

**Status:** Accepted (2026-09-25)

## Context

Unlocks (NFC tap, timed peek, cooldown, emergency escape) must not be bypassable by tampering with a device, changing its clock or cutting its network.

## Decision

- Every unlock is an `UnlockGrant` created and signed by the server with Ed25519, with an expiry.
- Clients verify the signature against a public key pinned in their build, lift the block until `expiresAt`, and relock on their own at expiry.
- Expiry is checked with a monotonic-clock guard so moving the system clock back does not extend a grant.
- A device that cannot reach the server stays locked. Only the local typed-phrase escape (later IP) works offline.

## Consequences

- The grant payload is a versioned contract shared by backend, Mac and iOS; its fields are documented in [architecture](../explanation/architecture.md#unlock-grants).
- The backend needs a signing key (`GRANT_SIGNING_PRIVATE_KEY`) managed as a secret.
- Grants sync to the owner's devices like any other owner-scoped collection.
- On the Mac the **filter extension** verifies grants and relocks, not the app (decided while building it, 2026-10-04): the app passes the session's domains and signed grants to the filter, so quitting the app or going offline cannot extend a peek.
