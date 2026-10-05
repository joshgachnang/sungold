import {useQuery, useSyncStatus} from "@terreno/syncdb/react";
import {Box, Button, Card, Heading, Page, Spinner, Text, TextArea, TextField} from "@terreno/ui";
import type React from "react";
import {useCallback, useEffect, useMemo, useState, useSyncExternalStore} from "react";
import {
  useBlocklistsStarterMutation,
  useDeleteBlocklistsByIdMutation,
  usePatchBlocklistsByIdMutation,
  usePostBlocklistsMutation,
} from "@/store/openApiSdk";
import {getSyncDbReadySnapshot, subscribeSyncDbReady} from "@/store/syncdb";

interface Blocklist {
  _id: string;
  deleted?: boolean;
  domains?: string[];
  name: string;
  source: "starter" | "user";
}

const parseDomains = (input: string): string[] =>
  input
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);

const formatDomains = (domains: string[] | undefined): string => (domains ?? []).join(", ");

const serverErrorMessage = (error: unknown): string => {
  const data = (
    error as {data?: {title?: string; meta?: {fields?: Record<string, string>}}} | undefined
  )?.data;
  return data?.meta?.fields?.name ?? data?.meta?.fields?.domains ?? data?.title ?? "Try again.";
};

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

const BlocklistRow: React.FC<{blocklist: Blocklist}> = ({blocklist}) => {
  const [updateBlocklist, {isLoading: isSaving}] = usePatchBlocklistsByIdMutation();
  const [deleteBlocklist, {isLoading: isDeleting}] = useDeleteBlocklistsByIdMutation();
  const [name, setName] = useState<string>(blocklist.name);
  const [domains, setDomains] = useState<string>(formatDomains(blocklist.domains));
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    setName(blocklist.name);
    setDomains(formatDomains(blocklist.domains));
  }, [blocklist.domains, blocklist.name]);

  const handleSave = useCallback(async (): Promise<void> => {
    setError(undefined);
    const result = await updateBlocklist({
      body: {domains: parseDomains(domains), name},
      id: blocklist._id,
    });
    if ("error" in result && result.error) {
      setError(serverErrorMessage(result.error));
    }
  }, [blocklist._id, domains, name, updateBlocklist]);

  const handleDelete = useCallback(async (): Promise<void> => {
    setError(undefined);
    const result = await deleteBlocklist(blocklist._id);
    if ("error" in result && result.error) {
      setError(serverErrorMessage(result.error));
    }
  }, [blocklist._id, deleteBlocklist]);

  return (
    <Card testID={`blocklists-item-${blocklist._id}`}>
      <Box gap={3}>
        <Box gap={1}>
          <Box testID={`blocklists-item-name-${blocklist._id}`}>
            <Heading size="sm">{blocklist.name}</Heading>
          </Box>
          <Text color="secondaryDark" testID={`blocklists-item-domains-${blocklist._id}`}>
            {formatDomains(blocklist.domains)}
          </Text>
          {blocklist.source === "starter" ? (
            <Text color="secondaryDark">Starter preset</Text>
          ) : null}
        </Box>
        <TextField
          onChange={setName}
          testIDs={{input: `blocklists-edit-name-input-${blocklist._id}`}}
          title="Name"
          value={name}
        />
        <TextArea
          helperText="One per line or comma-separated"
          onChange={setDomains}
          testIDs={{input: `blocklists-edit-domains-input-${blocklist._id}`}}
          title="Domains"
          value={domains}
        />
        {error ? (
          <Box testID={`blocklists-error-${blocklist._id}`}>
            <Text color="error">{error}</Text>
          </Box>
        ) : null}
        <Box direction="row" gap={2}>
          <Button
            loading={isSaving}
            onClick={handleSave}
            testID={`blocklists-save-button-${blocklist._id}`}
            text="Save"
          />
          <Button
            loading={isDeleting}
            onClick={handleDelete}
            testID={`blocklists-delete-button-${blocklist._id}`}
            text="Delete"
            variant="destructive"
          />
        </Box>
      </Box>
    </Card>
  );
};

const BlocklistsScreen: React.FC = () => {
  const loaded = useSyncLoaded();
  const [seedStarterBlocklists, {isLoading: isSeedingBlocklists}] = useBlocklistsStarterMutation();
  const [createBlocklist, {isLoading: isCreating}] = usePostBlocklistsMutation();
  const blocklists = useQuery<Blocklist>("blocklists", {
    filter: (blocklist) => !blocklist.deleted,
  });
  const sortedBlocklists = useMemo(
    () => [...blocklists].sort((a, b) => a.name.localeCompare(b.name)),
    [blocklists]
  );
  const [name, setName] = useState<string>("");
  const [domains, setDomains] = useState<string>("");
  const [createError, setCreateError] = useState<string | undefined>(undefined);
  const [seedAttempted, setSeedAttempted] = useState<boolean>(false);

  useEffect(() => {
    if (!loaded || seedAttempted || sortedBlocklists.length > 0 || isSeedingBlocklists) {
      return;
    }
    setSeedAttempted(true);
    void seedStarterBlocklists(undefined);
  }, [isSeedingBlocklists, loaded, seedAttempted, seedStarterBlocklists, sortedBlocklists.length]);

  const handleCreate = useCallback(async (): Promise<void> => {
    setCreateError(undefined);
    const result = await createBlocklist({domains: parseDomains(domains), name});
    if ("error" in result && result.error) {
      setCreateError(serverErrorMessage(result.error));
      return;
    }
    setName("");
    setDomains("");
  }, [createBlocklist, domains, name]);

  return (
    <Page navigation={undefined} scroll title="Blocklists">
      <Box gap={4} padding={4} testID="blocklists-screen">
        <Heading>Blocklists</Heading>
        <Card>
          <Box gap={3}>
            <Heading size="sm">Create a blocklist</Heading>
            <TextField
              onChange={setName}
              testIDs={{input: "blocklists-name-input"}}
              title="Name"
              value={name}
            />
            <TextArea
              helperText="One per line or comma-separated, e.g. youtube.com, x.com"
              onChange={setDomains}
              testIDs={{input: "blocklists-domains-input"}}
              title="Domains"
              value={domains}
            />
            {createError ? (
              <Box testID="blocklists-create-error">
                <Text color="error">{createError}</Text>
              </Box>
            ) : null}
            <Button
              loading={isCreating}
              onClick={handleCreate}
              testID="blocklists-create-button"
              text="Create blocklist"
            />
          </Box>
        </Card>
        {!loaded ? (
          <Box alignItems="center" padding={4} testID="blocklists-loading">
            <Spinner />
          </Box>
        ) : isSeedingBlocklists ? (
          <Box alignItems="center" padding={4} testID="blocklists-starters-loading">
            <Spinner />
          </Box>
        ) : sortedBlocklists.length === 0 ? (
          <Card testID="blocklists-empty">
            <Text color="secondaryDark">No blocklists yet.</Text>
          </Card>
        ) : (
          <Box gap={3} testID="blocklists-list">
            {sortedBlocklists.map((blocklist) => (
              <BlocklistRow blocklist={blocklist} key={blocklist._id} />
            ))}
          </Box>
        )}
      </Box>
    </Page>
  );
};

export default BlocklistsScreen;
