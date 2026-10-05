# 0005: Own Swift Screen Time extensions on iOS

**Status:** Accepted (2026-09-25)

## Context

The Expo iOS app needs three app extensions for Screen Time: ShieldConfiguration (custom block screen), ShieldAction (block-screen buttons) and DeviceActivityMonitor (schedules). `react-native-device-activity` is a community Expo plugin that wires them up.

## Decision

Write the three extensions and a small Expo native module ourselves, wired into the Expo project with `@bacons/apple-targets`.

## Consequences

- Built in a later IP, not in the platform-architecture skeleton.
- Full control of the block screen (intention line) and of grant verification and relock.
- Requires Expo dev builds, not Expo Go.
- Distribution needs the Family Controls entitlement for the app and each extension bundle ID ([0010](0010-apple-developer-team.md)).
