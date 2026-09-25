# 0009: All native code in this repo

**Status:** Accepted (2026-09-25)

## Context

The grant format, rule model and session model are shared by backend, web, Mac and iOS. Changing them across separate repos needs coordinated releases.

## Decision

Keep everything in this repository:

- `macos/`: Xcode project generated from `macos/project.yml` with XcodeGen (menu-bar app and filter extension)
- `browser-extensions/`: browser extensions (later)
- iOS app extensions inside `frontend/` via `@bacons/apple-targets` (later)

## Consequences

- One pull request can change a contract everywhere.
- The Xcode project is reviewable text (`project.yml`) instead of hand-edited `pbxproj` files.
