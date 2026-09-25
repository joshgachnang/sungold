# 0006: Privacy — server-visible data, no tracking

**Status:** Accepted (2026-09-25)

## Context

Terreno syncdb is local-first on devices, but the server is the authority and sees plaintext. Web local storage is encrypted with a server-provided key. Comms integrations and the re-entry brief need server-held OAuth tokens either way.

## Decision

- Use standard Terreno sync; the server can read user-created data.
- Collect only what users create: sessions, rules, plans.
- Never collect browsing history or activity tracking; no third-party analytics.
- Blocking is evaluated on the device and reports nothing about visited sites.
- Encrypt OAuth tokens at rest.
- No end-to-end encryption in v1.

## Consequences

- Product and marketing copy must not claim end-to-end encryption.
- Any future telemetry needs a new decision record.
