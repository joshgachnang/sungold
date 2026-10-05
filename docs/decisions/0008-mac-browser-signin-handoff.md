# 0008: Mac sign-in by browser handoff

**Status:** Accepted (2026-09-25)

## Context

The native Mac app needs a Better Auth session. A native password form would have to be rebuilt for every new sign-in method.

## Decision

The Mac app opens the Sungold web login in `ASWebAuthenticationSession`. After sign-in, the web app asks the backend for a device bearer session token and redirects to `sungold-mac://auth` with the token and the caller's `state`. The redirect target is allowlisted.

## Consequences

- No password UI in Swift; SSO and passkeys arrive for free.
- The token is stored in the Mac Keychain and can be revoked server-side.
