# 0002: Layered Mac web blocking

**Status:** Accepted (2026-09-25)

## Context

A `NEFilterDataProvider` content filter sees only hostnames for HTTPS. Opal, RescueTime, Freedom, Focus and 1Focus detect page URLs by asking each browser for its active tab over Apple Events (one Automation prompt per browser), which covers Safari and Chromium browsers but not Firefox. Opal's redirect can be undone with the Back button.

## Decision

Three layers, each optional above the first:

1. **Network filter** (system extension): blocks whole domains in every app and browser.
2. **Apple Events URL watcher**: reads the active tab URL of Safari and Chromium browsers and applies path rules, redirecting with `location.replace` so Back cannot return to the blocked page.
3. **Browser extensions**: instant in-page rules where installed.

Firefox and unknown browsers are hidden during hard and nuclear sessions.

## Consequences

- The platform-architecture skeleton ships only layer 1. Layers 2 and 3 are later IPs that share one rule model.
- Rules are evaluated on the device; nothing about visited URLs is sent to the server ([0006](0006-privacy-server-visible-no-tracking.md)).
