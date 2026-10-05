# 0003: Mac app blocking by watching launches

**Status:** Accepted (2026-09-25)

## Context

Blocking apps on the Mac can use `NSWorkspace` launch and activation notifications (no special entitlement) or Endpoint Security `AUTH_EXEC` (separately requested entitlement, Full Disk Access, system extension).

## Decision

Watch app launches and activation, show a block overlay with the session intention, and hide or quit blocked apps. Do not use Endpoint Security.

## Consequences

- Built in a later IP, not in the platform-architecture skeleton.
- Quitting Sungold lifts app blocking. A later IP has the server flag a missing enforcement heartbeat.
- No additional Apple entitlement review.
