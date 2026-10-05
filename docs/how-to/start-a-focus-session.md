# Start a focus session

Open the **Focus** tab in the Sungold app (web or iOS).

1. Optionally choose one or more **Blocklists**. New accounts get starter lists for Social, News and Video the first time the start form needs them.
2. Under **Extra sites to block**, add any one-off domains, one per line or comma-separated. Full URLs are fine: `https://www.youtube.com/feed` is saved as `youtube.com`, and `www.` is dropped.
3. Optionally add an **Intention**: what you plan to work on. It is shown when you hit a block.
4. Select **Start session**.

The session stores a copy of the selected blocklists' domains plus the extra domains you typed. Editing a blocklist later does not change a session that has already started.

While a session is active, the Focus tab shows your intention and the blocked domains, and every signed-in device enforces the block.

## Park a thought

1. During an active session, enter the thought in **Parking lot**.
2. Select **Park thought**.

The item appears in the parking-lot list after it syncs. Open items stay visible during later active sessions until the review flow marks them done or dismissed.

## Peek

Select **Peek 5 min** to unblock the session's domains for five minutes on every device. A countdown shows the time left. When it reaches zero, devices block again on their own, even offline.

## End a session

Select **End session**. Focus opens the review prompt after the session ends.

1. Enter what got done.
2. Add an optional one-line note.
3. Mark parked thoughts as **Done**, **Carry** or **Dismiss**.
4. Save the review, or select **Skip**.

Items marked **Carry** stay open for the next session. Items marked **Done** or **Dismiss** leave the parking lot. You can have one active session at a time, so end the current one before starting another.

## Errors

| Message | Meaning |
| --- | --- |
| Add at least one domain or choose a blocklist | No blocklist is selected and the extra domain list is empty |
| Invalid domains | An entry is not a hostname (for example `localhost` or text with spaces) |
| Invalid blocklists | A selected blocklist does not belong to your account |
| A focus session is already active | Another device started a session; it appears on this screen once it syncs |
