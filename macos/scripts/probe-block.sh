#!/usr/bin/env bash
# Proves the Mac filter blocks the active session's domains: starts a session through the
# API, checks a blocked and an allowed site with curl, ends the session, checks again.
# Needs: Sungold.app installed in /Applications, signed in as $EMAIL, with website blocking
# turned on (menu shows "Website blocking on"). Output lines are timestamped for the record.
set -euo pipefail

API="${API:-http://localhost:4000}"
ORIGIN="${ORIGIN:-http://localhost:8093}"
EMAIL="${EMAIL:-e2e-focus@example.com}"
PASSWORD="${PASSWORD:-testpassword123}"
BLOCKED="${BLOCKED:-example.com}"
ALLOWED="${ALLOWED:-example.org}"

stamp() { date '+%H:%M:%S'; }
json() { python3 -c "import json,sys; print(json.load(sys.stdin)$1)"; }
# Prints "reachable (HTTP 200)" or "blocked (curl exit N)".
check() {
  local code status
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "https://$1/") && status=0 || status=$?
  if [[ $status -eq 0 ]]; then echo "reachable (HTTP $code)"; else echo "blocked (curl exit $status)"; fi
}
expect() { # host expected-word
  local result; result=$(check "$1")
  echo "$(stamp) $1: $result"
  [[ "$result" == "$2"* ]] || { echo "$(stamp) FAIL: expected $1 to be $2"; exit 1; }
}
wait_filter() { # expected domain list (comma separated, empty for none)
  local deadline=$(( $(date +%s) + 15 ))
  until /usr/bin/log show --last 20s --info --style compact \
      --predicate 'subsystem == "app.sungold.mac" AND category == "filter"' 2>/dev/null \
      | grep -q "filter blocking domains=$1\$"; do
    [[ $(date +%s) -ge $deadline ]] && { echo "$(stamp) FAIL: filter never reported domains=$1"; exit 1; }
    sleep 0.5
  done
}

token=$(curl -s -D - -o /dev/null -X POST "$API/api/auth/sign-in/email" \
  -H 'content-type: application/json' -H "origin: $ORIGIN" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | awk -F': ' 'tolower($1)=="set-auth-token"{print $2}' | tr -d '\r')
auth=(-H "authorization: Bearer $token" -H 'content-type: application/json')
session_id=""
cleanup() {
  [[ -n "$session_id" ]] && curl -s -o /dev/null -X POST "${auth[@]}" "$API/focusSessions/$session_id/end" || true
  curl -s -o /dev/null -X POST "${auth[@]}" -H "origin: $ORIGIN" "$API/api/auth/sign-out" -d '{}' || true
}
trap cleanup EXIT

systemextensionsctl list 2>/dev/null | grep -i "app.sungold.mac.filter" || { echo "filter extension not installed"; exit 1; }

echo "$(stamp) before any session"
expect "$BLOCKED" reachable
expect "$ALLOWED" reachable

session_id=$(curl -s -X POST "${auth[@]}" "$API/focusSessions" \
  -d "{\"blockedDomains\":[\"$BLOCKED\"],\"intention\":\"block probe\"}" | json "['data']['_id']")
echo "$(stamp) started session $session_id blocking $BLOCKED"
wait_filter "$BLOCKED"
expect "$BLOCKED" blocked
expect "www.$BLOCKED" blocked
expect "$ALLOWED" reachable

curl -s -o /dev/null -X POST "${auth[@]}" "$API/focusSessions/$session_id/end"
session_id=""
echo "$(stamp) ended session"
wait_filter ""
expect "$BLOCKED" reachable
echo "$(stamp) PASS"
