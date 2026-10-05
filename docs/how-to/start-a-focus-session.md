# Start a focus session

Open the **Focus** tab in the Sungold app (web or iOS).

1. Under **Sites to block**, enter one or more domains, one per line or comma-separated. Full URLs are fine: `https://www.youtube.com/feed` is saved as `youtube.com`, and `www.` is dropped.
2. Optionally add an **Intention**: what you plan to work on. It is shown when you hit a block.
3. Select **Start session**.

While a session is active, the Focus tab shows your intention and the blocked domains, and every signed-in device enforces the block.

## Peek

Select **Peek 5 min** to unblock the session's domains for five minutes on every device. A countdown shows the time left. When it reaches zero, devices block again on their own, even offline.

## End a session

Select **End session**. You can have one active session at a time, so end the current one before starting another.

## Errors

| Message | Meaning |
| --- | --- |
| Add at least one domain to block | The domain list is empty |
| Invalid domains | An entry is not a hostname (for example `localhost` or text with spaces) |
| A focus session is already active | Another device started a session; it appears on this screen once it syncs |
