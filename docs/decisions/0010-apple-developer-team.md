# 0010: Gachnang LLC Apple team; interim dev team

**Status:** Accepted (2026-09-25)

## Context

The Family Controls distribution entitlement requires an organization team, and Developer ID signing ties the Mac app to a team. Organization enrollment needs a D-U-N-S number and Apple review.

## Decision

- Ship under a **Gachnang LLC** organization team, and request the Family Controls entitlement for the iOS app and each extension bundle ID from it.
- Until that team exists, sign local development builds with the existing paid team. Nothing ships under the interim team.
- Team ID and bundle ID prefix (`app.sungold`) are build configuration values, so switching teams is a config change.

## Consequences

- Enrollment and the entitlement request are human steps outside the codebase.
- iOS blocking beyond dev builds waits for the entitlement.
