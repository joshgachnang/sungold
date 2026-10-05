#!/usr/bin/env bash
# Proves the Mac app receives focus sessions live: launches a Debug build signed in with a
# fresh device token, starts and ends a session through the API, and times the app's logs.
# Usage: macos/scripts/probe-live-sync.sh [path/to/Sungold.app]
# Needs: backend on $API (default http://localhost:4093), the e2e user from frontend/e2e.
set -euo pipefail

API="${API:-http://localhost:4093}"
ORIGIN="${ORIGIN:-http://localhost:8093}"
EMAIL="${EMAIL:-e2e-focus@example.com}"
PASSWORD="${PASSWORD:-testpassword123}"
MACOS_DIR="$(cd "$(dirname "$0")/.." && pwd)"
# Build into its own folder by default so a developer's running copy in build/ is untouched.
if [[ -n "${1:-}" ]]; then
  APP="$1"
else
  xcodebuild -project "$MACOS_DIR/Sungold.xcodeproj" -scheme Sungold -destination 'platform=macOS' \
    -derivedDataPath "$MACOS_DIR/build-probe" build >/dev/null
  APP="$MACOS_DIR/build-probe/Build/Products/Debug/Sungold.app"
fi
# The probe's token lives in its own file, never the developer's Debug sign-in.
TOKEN_FILE=$(mktemp)

json() { python3 -c "import json,sys; print(json.load(sys.stdin)$1)"; }
now_ms() { python3 -c 'import time; print(int(time.time()*1000))'; }

web_token=$(curl -s -D - -o /dev/null -X POST "$API/api/auth/sign-in/email" \
  -H 'content-type: application/json' -H "origin: $ORIGIN" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | awk -F': ' 'tolower($1)=="set-auth-token"{print $2}' | tr -d '\r')
auth=(-H "authorization: Bearer $web_token" -H 'content-type: application/json')

# End any session left from a previous run.
for id in $(curl -s "${auth[@]}" "$API/focusSessions?status=active" | json "['data']" | python3 -c "import ast,sys; [print(s['_id']) for s in ast.literal_eval(sys.stdin.read())]"); do
  curl -s -o /dev/null -X POST "${auth[@]}" "$API/focusSessions/$id/end"
done

issued=$(curl -s -X POST "${auth[@]}" "$API/deviceSessions/issue" \
  -d '{"client":"mac","name":"probe-live-sync","redirect":"sungold-mac://auth","state":"probe"}')
device_id=$(echo "$issued" | json "['data']['deviceSession']['_id']")
device_token=$(echo "$issued" | json "['data']['redirectUrl']" | python3 -c "import sys,urllib.parse as u; print(u.parse_qs(u.urlparse(sys.stdin.read().strip()).query)['token'][0])")

logfile=$(mktemp)
log stream --level info --style compact --predicate 'subsystem == "app.sungold.mac"' > "$logfile" 2>&1 &
log_pid=$!
session_id=""
cleanup() {
  kill "$log_pid" 2>/dev/null || true
  [[ -n "${app_pid:-}" ]] && kill "$app_pid" 2>/dev/null || true
  [[ -n "$session_id" ]] && curl -s -o /dev/null -X POST "${auth[@]}" "$API/focusSessions/$session_id/end" || true
  curl -s -o /dev/null -X POST "${auth[@]}" "$API/deviceSessions/$device_id/revoke" || true
  curl -s -o /dev/null -X POST "${auth[@]}" -H "origin: $ORIGIN" "$API/api/auth/sign-out" -d '{}' || true
  rm -f "$logfile" "$TOKEN_FILE"
}
trap cleanup EXIT

wait_for() { # pattern timeout_seconds
  local deadline=$(( $(date +%s) + $2 ))
  until grep -q "$1" "$logfile"; do
    [[ $(date +%s) -ge $deadline ]] && { echo "TIMEOUT waiting for: $1"; tail -20 "$logfile"; exit 1; }
    sleep 0.05
  done
}

sleep 1
SUNGOLD_TOKEN_FILE="$TOKEN_FILE" SUNGOLD_DEV_TOKEN="$device_token" "$APP/Contents/MacOS/Sungold" >/dev/null 2>&1 &
app_pid=$!
wait_for "sync live" 20
echo "app connected and subscribed"

start=$(now_ms)
session_id=$(curl -s -X POST "${auth[@]}" "$API/focusSessions" -d '{"blockedDomains":["probe.example.com"],"intention":"live sync probe"}' | json "['data']['_id']")
wait_for "session active id=$session_id" 5
echo "session $session_id appeared on the Mac after $(( $(now_ms) - start )) ms"

start=$(now_ms)
grant_id=$(curl -s -X POST "${auth[@]}" "$API/focusSessions/$session_id/grants" -d '{"minutes":1}' | json "['data']['_id']")
wait_for "grant received id=$grant_id" 5
echo "grant appeared on the Mac after $(( $(now_ms) - start )) ms"

start=$(now_ms)
curl -s -o /dev/null -X POST "${auth[@]}" "$API/focusSessions/$session_id/end"
wait_for "no active session" 5
echo "session end appeared on the Mac after $(( $(now_ms) - start )) ms"
session_id=""
