import {baseUrl} from "@terreno/rtk";
import {
  type BetterAuthClientLike,
  betterAuthAdapter,
  createSyncDb,
  type SyncDb,
} from "@terreno/syncdb";
import {betterAuthClient} from "@/lib/betterAuth";

export const SYNC_DB_NAME = "sungold";

/** Add synced collection names here as you register modelRouter sync scopes on the backend. */
export const SYNC_COLLECTIONS: string[] = ["focusSessions", "unlockGrants"];

/**
 * The Better Auth *react* client delivers session changes through a nanostore atom
 * (`$store.atoms.session`), but its `useSession` is a React hook without `.subscribe`.
 * betterAuthAdapter looks for `useSession.subscribe`; without it, it falls back to
 * polling `getSession()` every 5s (constant /api/auth/get-session traffic). Bridge the
 * atom to the shape the adapter expects so auth changes are event-driven instead.
 */
type SessionAtomLike = {subscribe: (listener: (value: unknown) => void) => () => void};
const sessionAtom = (
  betterAuthClient as unknown as {$store?: {atoms?: {session?: SessionAtomLike}}}
).$store?.atoms?.session;

const syncAuthClient: BetterAuthClientLike = {
  getSession: () => betterAuthClient.getSession(),
  ...(sessionAtom
    ? {useSession: {subscribe: (listener): (() => void) => sessionAtom.subscribe(listener)}}
    : {}),
};

// pollIntervalMs is only used as a fallback if the session atom bridge above is
// unavailable (e.g. a future Better Auth client shape change); keep it slow.
const authProvider = betterAuthAdapter(syncAuthClient, {pollIntervalMs: 60_000});

export const syncDb: SyncDb = createSyncDb({
  authProvider,
  baseUrl,
  collections: SYNC_COLLECTIONS,
  name: SYNC_DB_NAME,
});

let syncDbReady = false;
const syncDbReadyListeners = new Set<() => void>();

export const setSyncDbReady = (ready: boolean): void => {
  if (syncDbReady === ready) {
    return;
  }
  syncDbReady = ready;
  for (const listener of syncDbReadyListeners) {
    listener();
  }
};

export const subscribeSyncDbReady = (listener: () => void): (() => void) => {
  syncDbReadyListeners.add(listener);
  return () => {
    syncDbReadyListeners.delete(listener);
  };
};

export const getSyncDbReadySnapshot = (): boolean => syncDbReady;
