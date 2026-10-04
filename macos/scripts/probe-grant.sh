#!/usr/bin/env bash
# Proves peeks unlock and relock on their own: starts a session blocking $BLOCKED, issues a
# 1-minute grant, checks the site opens, quits the Sungold app, and checks the filter relocks
# at the grant's expiry with no app running. Relaunches the app and ends the session after.
# Needs: Sungold.app in /Applications, signed in as $EMAIL, website blocking on.
set -euo pipefail

API="${API:-http://localhost:4093}"
ORIGIN="${ORIGIN:-http://localhost:8093}"
EMAIL="${EMAIL:-e2e-focus@example.com}"
PASSWORD="${PASSWORD:-testpassword123}"
BLOCKED="${BLOCKED:-example.com}"
APP="${APP:-/Applications/Sungold.app}"

stamp() { date '+%H:%M:%S'; }
json() { python3 -c "import json,sys; print(json.load(sys.stdin)$1)"; }
check() {
  local code status
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "https://$1/") && status=0 || status=$?
  if [[ $status -eq 0 ]]; then echo "reachable (HTTP $code)"; else echo "blocked (curl exit $status)"; fi
}
expect() {
  local result; result=$(check "$1")
  echo "$(stamp) $1: $result"
  [[ "$result" == "$2"* ]] || { echo "$(stamp) FAIL: expected $1 to be $2"; exit 1; }
}
RUN_START=$(date '+%Y-%m-%d %H:%M:%S')
wait_log() { # pattern
  local deadline=$(( $(date +%s) + 15 ))
  until /usr/bin/log show --start "$RUN_START" --info --style compact \
      --predicate 'subsystem == "app.sungold.mac" AND category == "filter"' 2>/dev/null | grep -q "$1"; do
    [[ $(date +%s) -ge $deadline ]] && { echo "$(stamp) FAIL: no filter log matching $1"; exit 1; }
    sleep 0.5
  done
}

token=$(curl -s -D - -o /dev/null -X POST "$API/api/auth/sign-in/email" \
  -H 'content-type: application/json' -H "origin: $ORIGIN" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | awk -F': ' 'tolower($1)=="set-auth-token"{print $2}' | tr -d '\r')
auth=(-H "authorization: Bearer $token" -H 'content-type: application/json')
session_id=""
cleanup() {
  pgrep -xq Sungold || open "$APP"
  [[ -n "$session_id" ]] && curl -s -o /dev/null -X POST "${auth[@]}" "$API/focusSessions/$session_id/end" || true
  curl -s -o /dev/null -X POST "${auth[@]}" -H "origin: $ORIGIN" "$API/api/auth/sign-out" -d '{}' || true
}
trap cleanup EXIT

pgrep -xq Sungold || { open "$APP"; sleep 5; }
session_id=$(curl -s -X POST "${auth[@]}" "$API/focusSessions" \
  -d "{\"blockedDomains\":[\"$BLOCKED\"],\"intention\":\"grant probe\"}" | json "['data']['_id']")
echo "$(stamp) started session $session_id"
wait_log "filter blocking domains=$BLOCKED grants=0"
expect "$BLOCKED" blocked

expires=$(curl -s -X POST "${auth[@]}" "$API/focusSessions/$session_id/grants" -d '{"minutes":1}' | json "['data']['expiresAt']")
echo "$(stamp) peek granted until $expires"
wait_log "filter blocking domains=$BLOCKED grants=1"
expect "$BLOCKED" reachable

pkill -x Sungold
echo "$(stamp) quit the Sungold app; the filter alone enforces from here"
expect "$BLOCKED" reachable

wait_seconds=$(python3 -c "
from datetime import datetime, timezone
end = datetime.fromisoformat('$expires'.replace('Z', '+00:00'))
print(max(0, int((end - datetime.now(timezone.utc)).total_seconds()) + 2))")
echo "$(stamp) waiting ${wait_seconds}s for the peek to expire"
sleep "$wait_seconds"
expect "$BLOCKED" blocked
expect "www.$BLOCKED" blocked
echo "$(stamp) PASS"
