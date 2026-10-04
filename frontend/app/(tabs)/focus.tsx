import {useQuery, useSyncStatus} from "@terreno/syncdb/react";
import {
  Box,
  Button,
  Card,
  CheckBox,
  Heading,
  Page,
  Spinner,
  Text,
  TextArea,
  TextField,
} from "@terreno/ui";
import {DateTime} from "luxon";
import type React from "react";
import {useCallback, useEffect, useMemo, useState, useSyncExternalStore} from "react";
import {Pressable} from "react-native";
import {
  useBlocklistsStarterMutation,
  useFocussessionsEndMutation,
  useFocussessionsGrantsMutation,
  usePostFocusSessionsMutation,
} from "@/store/openApiSdk";
import {getSyncDbReadySnapshot, subscribeSyncDbReady} from "@/store/syncdb";

interface FocusSession {
  _id: string;
  status: "active" | "ended";
  blockedDomains: string[];
  blocklistIds?: string[];
  intention?: string;
  startedAt: string;
}

interface Blocklist {
  _id: string;
  domains: string[];
  name: string;
  deleted?: boolean;
}

interface UnlockGrant {
  _id: string;
  sessionId: string;
  expiresAt: string;
}

const PEEK_MINUTES = 5;
const GRANT_ARRIVAL_TIMEOUT_MS = 10_000;

// Splits "youtube.com, x.com\nreddit.com" into entries; the server normalizes and validates them.
const parseDomains = (input: string): string[] =>
  input
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);

const formatRemaining = (expiresAt: string, now: DateTime): string => {
  const remaining = DateTime.fromISO(expiresAt).diff(now, ["minutes", "seconds"]);
  return remaining.toFormat("m:ss");
};

const useNow = (): DateTime => {
  const [now, setNow] = useState<DateTime>(DateTime.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(DateTime.now()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
};

// Writes go through REST so the server's normalization and one-active-session rule are
// what the user sees; the session then arrives through sync like on every other device.
const serverErrorMessage = (error: unknown): string | undefined => {
  const data = (
    error as {data?: {title?: string; meta?: {fields?: Record<string, string>}}} | undefined
  )?.data;
  return data?.meta?.fields?.blockedDomains ?? data?.meta?.fields?.blocklistIds ?? data?.title;
};

// True once the sync client has started and finished its first pull, so an existing session
// is never mistaken for "no session". start() resolves before that pull completes, while
// isSyncing is already true; later background pulls must not bring the spinner back.
const useSyncLoaded = (): boolean => {
  const syncReady = useSyncExternalStore(
    subscribeSyncDbReady,
    getSyncDbReadySnapshot,
    getSyncDbReadySnapshot
  );
  const {isSyncing} = useSyncStatus();
  const [loaded, setLoaded] = useState<boolean>(false);
  useEffect(() => {
    if (!syncReady) {
      setLoaded(false);
    } else if (!isSyncing) {
      setLoaded(true);
    }
  }, [isSyncing, syncReady]);
  return loaded;
};

const BlocklistSelector: React.FC<{
  blocklists: Blocklist[];
  onChange: (selected: string[]) => void;
  value: string[];
}> = ({blocklists, onChange, value}) => {
  const options = useMemo(
    () => [...blocklists].sort((a, b) => a.name.localeCompare(b.name)),
    [blocklists]
  );
  const toggle = useCallback(
    (id: string): void => {
      onChange(value.includes(id) ? value.filter((selected) => selected !== id) : [...value, id]);
    },
    [onChange, value]
  );

  if (options.length === 0) {
    return null;
  }

  return (
    <Box gap={2} testID="focus-blocklists-input">
      <Heading color="primary" size="sm">
        Blocklists
      </Heading>
      {options.map((blocklist) => {
        const selected = value.includes(blocklist._id);
        return (
          <Pressable
            accessibilityLabel={blocklist.name}
            accessibilityRole="checkbox"
            accessibilityState={{checked: selected}}
            key={blocklist._id}
            onPress={() => toggle(blocklist._id)}
            style={{
              alignItems: "center",
              flexDirection: "row",
              gap: 8,
              minHeight: 36,
            }}
            testID={`focus-blocklist-option-${blocklist._id}`}
          >
            <CheckBox selected={selected} testID={`focus-blocklist-checkbox-${blocklist._id}`} />
            <Text>{blocklist.name}</Text>
          </Pressable>
        );
      })}
      <Text color="secondaryDark">Choose saved lists, then add any one-off sites below.</Text>
    </Box>
  );
};

const StartSessionForm: React.FC<{
  blocklists: Blocklist[];
  isSeedingBlocklists: boolean;
  onSeedStarterBlocklists: () => void;
}> = ({blocklists, isSeedingBlocklists, onSeedStarterBlocklists}) => {
  const [startSession, {isLoading}] = usePostFocusSessionsMutation();
  const [domains, setDomains] = useState<string>("");
  const [intention, setIntention] = useState<string>("");
  const [selectedBlocklistIds, setSelectedBlocklistIds] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (blocklists.length === 0 && !isSeedingBlocklists) {
      onSeedStarterBlocklists();
    }
  }, [blocklists.length, isSeedingBlocklists, onSeedStarterBlocklists]);

  const handleStart = useCallback(async (): Promise<void> => {
    const blockedDomains = parseDomains(domains);
    if (blockedDomains.length === 0 && selectedBlocklistIds.length === 0) {
      setError("Add at least one domain or choose a blocklist");
      return;
    }
    setError(undefined);
    const result = await startSession({
      ...(blockedDomains.length > 0 ? {blockedDomains} : {}),
      ...(selectedBlocklistIds.length > 0 ? {blocklistIds: selectedBlocklistIds} : {}),
      ...(intention.trim() ? {intention: intention.trim()} : {}),
    });
    if ("error" in result && result.error) {
      setError(serverErrorMessage(result.error) ?? "Could not start the session. Try again.");
    }
  }, [domains, intention, selectedBlocklistIds, startSession]);

  return (
    <Card>
      <Box gap={3}>
        <Heading size="sm">Start a focus session</Heading>
        {isSeedingBlocklists ? (
          <Box testID="focus-blocklists-loading">
            <Text color="secondaryDark">Loading starter blocklists...</Text>
          </Box>
        ) : null}
        <BlocklistSelector
          blocklists={blocklists}
          onChange={setSelectedBlocklistIds}
          value={selectedBlocklistIds}
        />
        <TextArea
          errorText={error}
          helperText="One per line or comma-separated, e.g. youtube.com, x.com"
          onChange={setDomains}
          testIDs={{error: "focus-domain-error", input: "focus-domain-input"}}
          title="Extra sites to block"
          value={domains}
        />
        <TextField
          onChange={setIntention}
          testIDs={{input: "focus-intention-input"}}
          title="Intention (optional)"
          value={intention}
        />
        <Button
          loading={isLoading}
          onClick={handleStart}
          testID="focus-start-button"
          text="Start session"
        />
      </Box>
    </Card>
  );
};

const ActiveSession: React.FC<{session: FocusSession}> = ({session}) => {
  const now = useNow();
  const [endSession, {isLoading: isEnding, error: endError}] = useFocussessionsEndMutation();
  const [requestGrant, {isLoading: isRequesting, error: grantError}] =
    useFocussessionsGrantsMutation();
  const grants = useQuery<UnlockGrant>("unlockGrants", {
    filter: (grant) => grant.sessionId === session._id,
  });

  const activeGrant = useMemo(
    () =>
      grants
        .filter((grant) => DateTime.fromISO(grant.expiresAt) > now)
        .sort((a, b) => b.expiresAt.localeCompare(a.expiresAt))[0],
    [grants, now]
  );

  // The grant reaches this screen through sync a moment after the request succeeds; keep
  // Peek disabled until it does so it cannot be requested twice.
  const [pendingGrantId, setPendingGrantId] = useState<string | undefined>(undefined);
  const grantArrived = pendingGrantId !== undefined && grants.some((g) => g._id === pendingGrantId);
  useEffect(() => {
    if (grantArrived) {
      setPendingGrantId(undefined);
    }
  }, [grantArrived]);
  // If sync is down the grant may never arrive here; re-enable Peek rather than spin forever.
  useEffect(() => {
    if (!pendingGrantId) {
      return;
    }
    const timeout = setTimeout(() => setPendingGrantId(undefined), GRANT_ARRIVAL_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [pendingGrantId]);

  const handlePeek = useCallback(async (): Promise<void> => {
    const result = await requestGrant({
      body: {minutes: PEEK_MINUTES, reason: "peek"},
      id: session._id,
    });
    // The generated API unwraps the server's {data} envelope.
    const grantId = (result as {data?: {_id?: string}}).data?._id;
    if (grantId) {
      setPendingGrantId(grantId);
    }
  }, [requestGrant, session._id]);

  const handleEnd = useCallback(async (): Promise<void> => {
    await endSession(session._id);
  }, [endSession, session._id]);

  return (
    <Card>
      <Box gap={3} testID="focus-active-session">
        <Heading size="sm">Focusing</Heading>
        {session.intention ? (
          <Box testID="focus-intention">
            <Text>{session.intention}</Text>
          </Box>
        ) : null}
        <Box testID="focus-blocked-domains">
          <Text color="secondaryDark" skipLinking>
            Blocking: {session.blockedDomains.join(", ")}
          </Text>
        </Box>
        {activeGrant ? (
          <Box testID="focus-grant-countdown">
            <Text>Unblocked for {formatRemaining(activeGrant.expiresAt, now)}</Text>
          </Box>
        ) : (
          <Button
            disabled={isRequesting || pendingGrantId !== undefined}
            loading={isRequesting || pendingGrantId !== undefined}
            onClick={handlePeek}
            testID="focus-peek-button"
            text={`Peek ${PEEK_MINUTES} min`}
            variant="secondary"
          />
        )}
        {pendingGrantId ? (
          <Box testID="focus-peek-pending">
            <Text color="secondaryDark">Unlocking…</Text>
          </Box>
        ) : null}
        {grantError ? (
          <Box testID="focus-peek-error">
            <Text color="error">Could not unlock. Try again.</Text>
          </Box>
        ) : null}
        {endError ? (
          <Box testID="focus-end-error">
            <Text color="error">Could not end the session. Try again.</Text>
          </Box>
        ) : null}
        <Button
          loading={isEnding}
          onClick={handleEnd}
          testID="focus-end-button"
          text="End session"
          variant="destructive"
        />
      </Box>
    </Card>
  );
};

const FocusScreen: React.FC = () => {
  const loaded = useSyncLoaded();
  const [seedStarterBlocklists, {isLoading: isSeedingBlocklists}] = useBlocklistsStarterMutation();
  const [seedAttempted, setSeedAttempted] = useState<boolean>(false);
  const activeSessions = useQuery<FocusSession>("focusSessions", {
    filter: (session) => session.status === "active",
  });
  const blocklists = useQuery<Blocklist>("blocklists", {
    filter: (blocklist) => !blocklist.deleted,
  });
  const session = activeSessions[0];
  const handleSeedStarterBlocklists = useCallback((): void => {
    if (seedAttempted) {
      return;
    }
    setSeedAttempted(true);
    void seedStarterBlocklists(undefined);
  }, [seedAttempted, seedStarterBlocklists]);

  return (
    <Page navigation={undefined} title="Focus">
      <Box gap={4} padding={4} testID="focus-screen">
        {!loaded ? (
          <Box alignItems="center" padding={4} testID="focus-loading">
            <Spinner />
          </Box>
        ) : session ? (
          <ActiveSession session={session} />
        ) : (
          <StartSessionForm
            blocklists={blocklists}
            isSeedingBlocklists={isSeedingBlocklists}
            onSeedStarterBlocklists={handleSeedStarterBlocklists}
          />
        )}
      </Box>
    </Page>
  );
};

export default FocusScreen;
