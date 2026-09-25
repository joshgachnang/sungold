# 0004: Developer ID direct download for the Mac

**Status:** Accepted (2026-09-25)

## Context

The network filter system extension ([0002](0002-layered-mac-web-blocking.md)) and Apple Events access to Chromium browsers push toward Developer ID distribution rather than the Mac App Store.

## Decision

Ship the Mac app signed with Developer ID, notarized, downloaded from sungoldapp.com, with Sparkle auto-updates. No Mac App Store build.

## Consequences

- The system extension and Chromium Apple Events are available.
- Notarization and Sparkle are out of scope for the skeleton; local dev builds are signed with a development team.
