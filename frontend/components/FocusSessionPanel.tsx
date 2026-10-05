import {useQuery} from "@terreno/syncdb/react";
import {
  Box,
  Button,
  Card,
  CheckBox,
  Heading,
  Spinner,
  Text,
  TextArea,
  TextField,
} from "@terreno/ui";
import {DateTime} from "luxon";
import type React from "react";
import {useCallback, useEffect, useMemo, useState} from "react";
import {Pressable} from "react-native";
import {useSyncLoaded} from "@/hooks/useSyncLoaded";
import {
  useBlocklistsStarterMutation,
  useFocussessionsEndMutation,
  useFocussessionsGrantsMutation,
  usePostFocusSessionsMutation,
  usePostParkingLotItemsMutation,
} from "@/store/openApiSdk";
import {ReviewSheet} from "./ReviewSheet";

interface FocusSession {
  _id: string;
  status: "active" | "ended";
  blockedDomains: string[];
  blocklistIds?: string[];
  intention?: string;
  endedAt?: string;
  review?: {reviewedAt?: string};
  reviewSkippedAt?: string;
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

interface ParkingLotItem {
  _id: string;
  sessionId: string;
  text: string;
  status: "open" | "done" | "dismissed";
  created?: string;
  deleted?: boolean;
}

const PEEK_MINUTES = 5;
const GRANT_ARRIVAL_TIMEOUT_MS = 10_000;

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

const serverErrorMessage = (error: unknown): string | undefined => {
  const data = (
    error as {data?: {title?: string; meta?: {fields?: Record<string, string>}}} | undefined
  )?.data;
  return (
    data?.meta?.fields?.blockedDomains ??
    data?.meta?.fields?.blocklistIds ??
    data?.meta?.fields?.text ??
    data?.meta?.fields?.sessionId ??
    data?.title
  );
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
  testID: string;
}> = ({blocklists, isSeedingBlocklists, onSeedStarterBlocklists, testID}) => {
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
      <Box gap={3} testID={testID}>
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

const ActiveSession: React.FC<{
  onEnded: (sessionId: string) => void;
  parkingLotItems: ParkingLotItem[];
  session: FocusSession;
  testID: string;
}> = ({onEnded, parkingLotItems, session, testID}) => {
  const now = useNow();
  const [endSession, {isLoading: isEnding, error: endError}] = useFocussessionsEndMutation();
  const [requestGrant, {isLoading: isRequesting, error: grantError}] =
    useFocussessionsGrantsMutation();
  const [createParkingLotItem, {isLoading: isCapturingParkingLotItem}] =
    usePostParkingLotItemsMutation();
  const [parkingLotText, setParkingLotText] = useState<string>("");
  const [parkingLotError, setParkingLotError] = useState<string | undefined>(undefined);
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
  const [pendingGrantId, setPendingGrantId] = useState<string | undefined>(undefined);
  const grantArrived = pendingGrantId !== undefined && grants.some((g) => g._id === pendingGrantId);
  useEffect(() => {
    if (grantArrived) {
      setPendingGrantId(undefined);
    }
  }, [grantArrived]);
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
    const grantId = (result as {data?: {_id?: string}}).data?._id;
    if (grantId) {
      setPendingGrantId(grantId);
    }
  }, [requestGrant, session._id]);

  const handleEnd = useCallback(async (): Promise<void> => {
    const result = await endSession(session._id);
    if (!("error" in result) || !result.error) {
      onEnded(session._id);
    }
  }, [endSession, onEnded, session._id]);

  const handleCaptureParkingLotItem = useCallback(async (): Promise<void> => {
    const text = parkingLotText.trim();
    if (!text) {
      setParkingLotError("Add a thought before parking it.");
      return;
    }
    setParkingLotError(undefined);
    const result = await createParkingLotItem({
      sessionId: session._id,
      text,
    } as Parameters<typeof createParkingLotItem>[0] & {text: string});
    if ("error" in result && result.error) {
      setParkingLotError(
        serverErrorMessage(result.error) ?? "Could not park that thought. Try again."
      );
      return;
    }
    setParkingLotText("");
  }, [createParkingLotItem, parkingLotText, session._id]);

  const sortedParkingLotItems = useMemo(
    () => [...parkingLotItems].sort((a, b) => (a.created ?? "").localeCompare(b.created ?? "")),
    [parkingLotItems]
  );

  return (
    <Card>
      <Box gap={3} testID={testID}>
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
            <Text color="secondaryDark">Unlocking...</Text>
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
        <Box gap={2} testID="focus-parking-lot">
          <Heading color="primary" size="sm">
            Parking lot
          </Heading>
          <TextArea
            errorText={parkingLotError}
            helperText="Capture thoughts to revisit when the block ends."
            onChange={setParkingLotText}
            testIDs={{
              error: "focus-parking-lot-error",
              input: "focus-parking-lot-input",
            }}
            title="Thought"
            value={parkingLotText}
          />
          <Button
            disabled={isCapturingParkingLotItem}
            loading={isCapturingParkingLotItem}
            onClick={handleCaptureParkingLotItem}
            testID="focus-parking-lot-add-button"
            text="Park thought"
            variant="secondary"
          />
          {sortedParkingLotItems.length === 0 ? (
            <Box testID="focus-parking-lot-empty">
              <Text color="secondaryDark">No parked thoughts yet.</Text>
            </Box>
          ) : (
            <Box gap={2} testID="focus-parking-lot-list">
              {sortedParkingLotItems.map((item) => (
                <Box key={item._id} testID={`focus-parking-lot-item-${item._id}`}>
                  <Text skipLinking>{item.text}</Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>
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

export const FocusSessionPanel: React.FC<{testIDPrefix: "focus" | "today"}> = ({testIDPrefix}) => {
  const loaded = useSyncLoaded();
  const [seedStarterBlocklists, {isLoading: isSeedingBlocklists}] = useBlocklistsStarterMutation();
  const [seedAttempted, setSeedAttempted] = useState<boolean>(false);
  const sessions = useQuery<FocusSession>("focusSessions");
  const activeSessions = useMemo(
    () => sessions.filter((focusSession) => focusSession.status === "active"),
    [sessions]
  );
  const openParkingLotItems = useQuery<ParkingLotItem>("parkingLotItems", {
    filter: (item) => !item.deleted && item.status === "open",
  });
  const blocklists = useQuery<Blocklist>("blocklists", {
    filter: (blocklist) => !blocklist.deleted,
  });
  const session = activeSessions[0];
  const [localReviewSessionId, setLocalReviewSessionId] = useState<string | undefined>(undefined);
  const [selectedReviewSessionId, setSelectedReviewSessionId] = useState<string | undefined>(
    undefined
  );
  const [resolvedReviewSessionIds, setResolvedReviewSessionIds] = useState<string[]>([]);
  const reviewableSessions = useMemo(
    () =>
      sessions
        .filter(
          (focusSession) =>
            focusSession.status === "ended" &&
            focusSession.endedAt &&
            !focusSession.review?.reviewedAt &&
            !focusSession.reviewSkippedAt &&
            !resolvedReviewSessionIds.includes(focusSession._id)
        )
        .sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? "")),
    [resolvedReviewSessionIds, sessions]
  );
  const bannerSession = reviewableSessions[0];
  const selectedReviewSession = useMemo(
    () => reviewableSessions.find((focusSession) => focusSession._id === selectedReviewSessionId),
    [reviewableSessions, selectedReviewSessionId]
  );

  useEffect(() => {
    if (!localReviewSessionId || selectedReviewSessionId) {
      return;
    }
    if (reviewableSessions.some((focusSession) => focusSession._id === localReviewSessionId)) {
      setSelectedReviewSessionId(localReviewSessionId);
    }
  }, [localReviewSessionId, reviewableSessions, selectedReviewSessionId]);

  const handleSeedStarterBlocklists = useCallback((): void => {
    if (seedAttempted) {
      return;
    }
    setSeedAttempted(true);
    void seedStarterBlocklists(undefined);
  }, [seedAttempted, seedStarterBlocklists]);

  if (!loaded) {
    return (
      <Box alignItems="center" padding={4} testID={`${testIDPrefix}-loading`}>
        <Spinner />
      </Box>
    );
  }

  return (
    <Box gap={4}>
      {bannerSession && !selectedReviewSession ? (
        <Card>
          <Box gap={2} testID="review-banner">
            <Heading size="sm">Review your last session</Heading>
            <Text color="secondaryDark">
              Finish the block by saving what got done or carrying parked thoughts forward.
            </Text>
            <Button
              onClick={() => setSelectedReviewSessionId(bannerSession._id)}
              testID="review-banner-open-button"
              text="Review session"
            />
          </Box>
        </Card>
      ) : null}
      {selectedReviewSession ? (
        <ReviewSheet
          items={openParkingLotItems}
          onClose={() => {
            setResolvedReviewSessionIds((current) =>
              current.includes(selectedReviewSession._id)
                ? current
                : [...current, selectedReviewSession._id]
            );
            setSelectedReviewSessionId(undefined);
            setLocalReviewSessionId(undefined);
          }}
          session={selectedReviewSession}
        />
      ) : null}
      {session ? (
        <ActiveSession
          onEnded={setLocalReviewSessionId}
          parkingLotItems={openParkingLotItems}
          session={session}
          testID={`${testIDPrefix}-active-session`}
        />
      ) : (
        <StartSessionForm
          blocklists={blocklists}
          isSeedingBlocklists={isSeedingBlocklists}
          onSeedStarterBlocklists={handleSeedStarterBlocklists}
          testID={`${testIDPrefix}-start-session`}
        />
      )}
    </Box>
  );
};
