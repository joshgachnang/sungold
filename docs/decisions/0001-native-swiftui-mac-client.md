# 0001: Native SwiftUI menu-bar app for the Mac

**Status:** Accepted (2026-09-25)

## Context

Apple's Screen Time API is iOS/iPadOS only, so the Mac client is mostly a network filter system extension, permission flows and a menu-bar timer. The ai-watchdog project ran `@terreno/ui` on react-native-macos and needed a vendored fork, four patches and several Metro shims.

## Decision

Build the Mac client as a native SwiftUI app using `MenuBarExtra`. It talks to the backend over REST and Socket.IO with a bearer token.

## Consequences

- No UI code is shared with the Expo app. Planning, review and settings screens live in the Expo app on web and iOS.
- The Mac app owns status, controls, permission onboarding and enforcement.
- Avoids tracking react-native-macos releases against `@terreno/ui`.
