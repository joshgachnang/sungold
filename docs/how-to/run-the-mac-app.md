# Run the Mac app

The Mac app lives in `macos/`: a SwiftUI menu-bar app (`Sungold`) plus unit tests. The Xcode project is generated from `macos/project.yml`, so it is not committed.

## Prerequisites

| Tool | Install |
| --- | --- |
| Xcode 26 or later | App Store |
| XcodeGen | `brew install xcodegen` |
| Backend and web app | `cd backend && bun run dev`, `cd frontend && bun run web` |

## Build, test and run

```bash
cd macos
xcodegen generate
xcodebuild -project Sungold.xcodeproj -scheme Sungold -destination 'platform=macOS' -derivedDataPath build test
open build/Build/Products/Debug/Sungold.app
```

A sun icon appears in the menu bar. Select it, then **Sign in…**: the Sungold web login opens in a system sheet, and after you approve, the app stores its device token. The icon fills in while a focus session is active.

## Where the device token is stored

| Build | Storage | Why |
| --- | --- | --- |
| Debug | `~/Library/Application Support/app.sungold.mac/dev-device-token`, permissions `0600` | Local builds are signed ad hoc, and an ad-hoc signature changes on every build. The Keychain treats each build as a new app and asks for access again, so Debug builds do not use it. |
| Release | Login Keychain, service `app.sungold.mac` | Shipped builds are signed with the team's Developer ID, so Keychain access stays granted across updates. Until `DEVELOPMENT_TEAM` is set, a local Release build is ad hoc and the Keychain asks again after each rebuild. |

To sign out a Debug build by hand, delete the file.

## Configuration

`macos/Config.xcconfig` holds the build settings:

| Setting | Default | Purpose |
| --- | --- | --- |
| `DEVELOPMENT_TEAM` | empty | Empty signs ad hoc ("Sign to Run Locally"), which is enough for the menu-bar app |
| `SUNGOLD_CODE_SIGN_IDENTITY` | `-` | `-` is ad hoc; set to `Apple Development` once `DEVELOPMENT_TEAM` is set |
| `SUNGOLD_BUNDLE_PREFIX` | `app.sungold` | Bundle ID prefix; the app is `app.sungold.mac` |
| `SUNGOLD_API_URL` | `http://localhost:4000` | Backend |
| `SUNGOLD_WEB_URL` | `http://localhost:8093` | Web app that runs `/device-login` |

Run `xcodegen generate` again after editing `project.yml` or `Config.xcconfig`.

## Verify live sync

`macos/scripts/probe-live-sync.sh` launches the Debug build signed in with a fresh device token for the e2e user, starts, peeks and ends a session through the API, and prints how long each change took to reach the app:

```bash
macos/scripts/probe-live-sync.sh
# app connected and subscribed
# session 6ab8… appeared on the Mac after 57 ms
# grant appeared on the Mac after 55 ms
# session end appeared on the Mac after 51 ms
```

It builds into `macos/build-probe/` and keeps its token in a temporary file (`SUNGOLD_TOKEN_FILE`, Debug only), so your own running app and sign-in are untouched. It ends its session, revokes its device and signs out its web session on exit.

Debug builds accept `SUNGOLD_DEV_TOKEN` in the environment as a stored token; Release builds ignore it.

## Logs

```bash
log stream --level info --predicate 'subsystem == "app.sungold.mac"'
```
