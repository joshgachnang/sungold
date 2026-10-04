# Use the Dashboard

Open the web app after signing in to use the dashboard screens.

| Area | What it does |
| --- | --- |
| Today | Shows the day view. The active-session summary and weekly focus comparison arrive in later dashboard slices. |
| Focus | Starts and manages a focus session from saved blocklists and one-off domains. |
| History | Shows weekly focus-hour bars and a table of past focus sessions. |
| Blocklists | Creates, edits and deletes saved sets of distracting domains. |
| Devices | Lists signed-in devices. Revoke controls arrive in a later slice. |
| Profile | Manages account settings, including the week start day and timezone used by dashboard charts. |

Wide browser windows use the left sidebar. Phones and narrow browser windows use bottom tabs with the same destinations.

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
