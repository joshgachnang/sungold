# Use the Dashboard

Open the web app after signing in to use the dashboard screens.

| Area | What it does |
| --- | --- |
| Today | Starts or resumes the current focus session, shows the weekly focus comparison, and prompts for any pending review. |
| Focus | Starts and manages a focus session from saved blocklists and one-off domains, with a parking lot for stray thoughts and the end-of-block review prompt. |
| History | Shows weekly focus-hour bars, pending reviews and a table of past focus sessions. |
| Blocklists | Creates, edits and deletes saved sets of distracting domains. |
| Devices | Lists signed-in devices and revokes device access. |
| Profile | Manages account settings, including the week start day and timezone used by dashboard charts. |

Wide browser windows use the left sidebar. Phones and narrow browser windows use bottom tabs with the same destinations.

## Use Today

1. Open **Today**.
2. Start a focus session from saved blocklists and any extra domains, or resume the active session shown on the page.
3. Check this week's focus hours against last week.
4. When **Review your last session** appears, open it to save or skip the review.

Today uses the same session controls as Focus. The weekly totals use the saved week start day and timezone from Profile, so they match History.

## Manage Blocklists

1. Open **Blocklists**.
2. Enter a name and one or more domains.
3. Save the blocklist.
4. Edit the name or domains inline, or delete the list when it is no longer useful.

Domains can be entered one per line or comma-separated:

```text
youtube.com
x.com, reddit.com
```

The server normalizes domains and returns validation messages for invalid entries. Starter presets are ordinary editable blocklists owned by the signed-in user; changing or deleting one does not affect any other user.

## Set Calendar Preferences

1. Open **Profile**.
2. Choose the day your week starts.
3. Choose your IANA timezone.
4. Save calendar settings.

These saved settings are the dashboard source for week boundaries, so the weekly History and Today summaries added in later slices use the same boundaries on every signed-in device.

## Review Focus History

1. Open **History**.
2. Read the focus-hours chart for the current week and the previous seven weeks.
3. Review past sessions in the table.

Focus hours count session time from start to end, or to now for an active session, minus any timed peeks from unlock grants. The session table shows the date, duration, intention, blocked domains, peek count, and review status for each past session.

## Review a Focus Block

1. End a session from **Focus**, or open **History** when a past session says it is not reviewed.
2. Enter what got done and an optional one-line note.
3. For each parked thought, choose **Done**, **Carry** or **Dismiss**.
4. Save the review, or skip it.

If a session ends on another device, Focus shows **Review your last session** until you save or skip the review. Parked thoughts marked **Carry** stay open and appear during the next active session. Thoughts marked **Done** or **Dismiss** leave the parking lot.

## Manage Devices

1. Open **Devices**.
2. Review each signed-in device's name, client and sign-in status.
3. Select **Revoke** for a device that should no longer access Sungold.
4. Confirm the revoke action.

Revoked devices lose access immediately and must run the device sign-in handoff again before they can sync focus state or enforce blocks. Revoking a native device does not sign out your current web session.

## Capture Stray Thoughts

1. Open **Focus** while a session is active.
2. Enter the thought in **Parking lot**.
3. Select **Park thought**.

Open parked thoughts remain visible on Focus across reloads and later active sessions until review marks them done or dismissed.
