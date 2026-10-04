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
| `SUNGOLD_API_URL` | `http://localhost:4093` | Backend |
| `SUNGOLD_WEB_URL` | `http://localhost:8093` | Web app that runs `/device-login` |

Run `xcodegen generate` again after editing `project.yml` or `Config.xcconfig`.

## Turn on website blocking

Website blocking is a network content filter (`macos/SungoldFilter/`) that runs as a system extension. It needs a signing team: `Config.xcconfig` uses the interim development team `ZKQE23T646`, whose App IDs `app.sungold.mac` and `app.sungold.mac.filter` have the **Network Extensions** capability (Content Filter).

1. Install the app in `/Applications`. With System Integrity Protection on, macOS only loads development system extensions from there:

   ```bash
   cd macos
   xcodebuild -project Sungold.xcodeproj -scheme Sungold -destination 'platform=macOS' \
     -derivedDataPath build-probe -allowProvisioningUpdates build
   rm -rf /Applications/Sungold.app && cp -R build-probe/Build/Products/Debug/Sungold.app /Applications/
   open /Applications/Sungold.app
   ```

2. In the menu, select **Turn on website blocking…**.
3. Select **Open Login Items & Extensions…**, then under **Network Extensions** switch on **Sungold Filter**. Dismissing the first alert with OK does not approve it.
4. When asked whether Sungold may filter network content, select **Allow**.

The menu shows **Website blocking on**. `systemextensionsctl list` shows `app.sungold.mac.filter` as `[activated enabled]`.

While a session is active, the filter drops connections whose hostname, TLS server name (SNI) or HTTP `Host` header matches a blocked domain or one of its subdomains. With no active session it blocks nothing.

The list lives in the filter's configuration, and the app only changes it after it has synced with the server:

- Quitting the app keeps the current block.
- Relaunching keeps it until the app has synced, including when the backend is unreachable.
- Signing out keeps it until the next sign-in has synced.
- If a session ends while the app is closed or offline, the block stays until the app syncs again.

### Verify blocking

```bash
macos/scripts/probe-block.sh
# 11:38:10 example.com: blocked (curl exit 7)
# 11:38:18 www.example.com: blocked (curl exit 28)
# 11:38:19 example.org: reachable (HTTP 200)
# 11:38:19 PASS
```

The script starts a session blocking `example.com` through the API, checks `example.com`, `www.example.com` and `example.org` with `curl`, ends the session and checks again. Filter logs: `log stream --level info --predicate 'subsystem == "app.sungold.mac.filter"'`.

### Verify peeks unlock and relock

```bash
macos/scripts/probe-grant.sh
# 12:19:35 example.com: blocked (curl exit 7)
# 12:19:35 peek granted until 2026-10-04T19:20:35.318Z
# 12:19:36 example.com: reachable (HTTP 200)
# 12:19:36 quit the Sungold app; the filter alone enforces from here
# 12:20:41 example.com: blocked (curl exit 7)
# 12:20:49 PASS
```

It starts a session, issues a 1-minute grant, quits the app, and checks that the filter relocks at expiry on its own. It reopens the app and ends the session when done.

### Updating the filter

macOS only replaces an installed system extension when its build number changes. After changing anything in `macos/SungoldFilter/` or `macos/Shared/`, bump `SUNGOLD_FILTER_BUILD` in `Config.xcconfig`. On launch the app re-submits activation and macOS swaps in the new filter without asking again. Replacing the filter resets existing network connections on the Mac.

### If activation fails

| Message or log | Cause |
| --- | --- |
| `Entitlement com.apple.developer.networkextension not found` | macOS uses the key `com.apple.developer.networking.networkextension`; the App ID also needs the Network Extensions capability |
| `invalid extension` / `package type not SYSX` | The extension's `CFBundlePackageType` must be `SYSX` (set in `project.yml`) |
| `extension category returned error` / `invalid NEMachServiceName` | `NEMachServiceName` must start with one of the extension's App Groups (`<team>.app.sungold.mac`) |
| Menu keeps asking for System Settings | The extension is `[activated waiting for user]`: switch it on under Network Extensions |

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
