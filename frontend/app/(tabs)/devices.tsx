import {Box, Button, Card, Heading, Modal, Page, Spinner, Text} from "@terreno/ui";
import {DateTime} from "luxon";
import type React from "react";
import {useCallback, useMemo, useState} from "react";
import {
  type GetDeviceSessionsRes,
  useDevicesessionsRevokeMutation,
  useGetDeviceSessionsQuery,
} from "@/store/openApiSdk";

type DeviceSession = NonNullable<GetDeviceSessionsRes["data"]>[number];

const clientLabel = (client: DeviceSession["client"]): string => {
  switch (client) {
    case "mac":
      return "Mac";
    default:
      return client;
  }
};

const formatDate = (value: string): string =>
  DateTime.fromISO(value).toLocaleString(DateTime.DATETIME_MED);

const errorMessage = (error: unknown): string => {
  const title = (error as {data?: {title?: string}} | undefined)?.data?.title;
  return title ?? "Could not revoke this device. Try again.";
};

const DevicesScreen: React.FC = () => {
  const {data, error, isFetching, isLoading} = useGetDeviceSessionsQuery({sort: "-created"});
  const [revokeDevice, {isLoading: isRevoking}] = useDevicesessionsRevokeMutation();
  const [confirmDevice, setConfirmDevice] = useState<DeviceSession | undefined>(undefined);
  const [revokeError, setRevokeError] = useState<string | undefined>(undefined);
  const devices = useMemo(() => data?.data ?? [], [data?.data]);

  const handleRevoke = useCallback(async (): Promise<void> => {
    if (!confirmDevice) {
      return;
    }
    setRevokeError(undefined);
    const result = await revokeDevice(confirmDevice._id);
    if ("error" in result && result.error) {
      setRevokeError(errorMessage(result.error));
      return;
    }
    setConfirmDevice(undefined);
  }, [confirmDevice, revokeDevice]);

  return (
    <Page navigation={undefined} scroll title="Devices">
      <Box gap={4} padding={4} testID="devices-screen">
        <Heading>Devices</Heading>
        <Card>
          <Box gap={3}>
            <Heading size="sm">Signed-in devices</Heading>
            <Text color="secondaryDark">
              Revoke any device that should no longer enforce or read your focus state.
            </Text>
          </Box>
        </Card>
        {isLoading || isFetching ? (
          <Box alignItems="center" padding={4} testID="devices-loading">
            <Spinner />
          </Box>
        ) : error ? (
          <Card testID="devices-error">
            <Text color="error">Could not load devices. Try again.</Text>
          </Card>
        ) : devices.length === 0 ? (
          <Card testID="devices-empty">
            <Text color="secondaryDark">No devices are signed in.</Text>
          </Card>
        ) : (
          <Box gap={3} testID="devices-list">
            {devices.map((device) => {
              const revoked = Boolean(device.revokedAt);
              return (
                <Card key={device._id} testID={`devices-item-${device._id}`}>
                  <Box gap={3}>
                    <Box gap={1}>
                      <Box testID={`devices-item-name-${device._id}`}>
                        <Heading size="sm">{device.name || clientLabel(device.client)}</Heading>
                      </Box>
                      <Text color="secondaryDark" testID={`devices-item-client-${device._id}`}>
                        {clientLabel(device.client)}
                      </Text>
                    </Box>
                    <Box gap={1}>
                      <Box testID={`devices-item-status-${device._id}`}>
                        <Text color={revoked ? "secondaryDark" : "success"}>
                          {revoked ? "Revoked" : "Signed in"}
                        </Text>
                      </Box>
                      <Text color="secondaryDark" testID={`devices-item-created-${device._id}`}>
                        Signed in {formatDate(device.created)}
                      </Text>
                      {device.revokedAt ? (
                        <Text color="secondaryDark" testID={`devices-item-revoked-${device._id}`}>
                          Revoked {formatDate(device.revokedAt)}
                        </Text>
                      ) : null}
                    </Box>
                    {revoked ? null : (
                      <Box direction="row">
                        <Button
                          onClick={(): void => setConfirmDevice(device)}
                          testID={`devices-revoke-button-${device._id}`}
                          text="Revoke"
                          variant="destructive"
                        />
                      </Box>
                    )}
                  </Box>
                </Card>
              );
            })}
          </Box>
        )}
        {revokeError ? (
          <Card testID="devices-revoke-error">
            <Text color="error">{revokeError}</Text>
          </Card>
        ) : null}
        <Modal
          onDismiss={(): void => setConfirmDevice(undefined)}
          primaryButtonDisabled={isRevoking}
          primaryButtonOnClick={handleRevoke}
          primaryButtonText="Revoke device"
          secondaryButtonOnClick={(): void => setConfirmDevice(undefined)}
          secondaryButtonText="Cancel"
          testIDs={{
            primaryButton: confirmDevice
              ? `devices-confirm-revoke-button-${confirmDevice._id}`
              : undefined,
            root: confirmDevice ? `devices-confirm-${confirmDevice._id}` : undefined,
            secondaryButton: confirmDevice
              ? `devices-confirm-cancel-${confirmDevice._id}`
              : undefined,
          }}
          text={
            confirmDevice
              ? `${confirmDevice.name || clientLabel(confirmDevice.client)} will lose access immediately.`
              : undefined
          }
          title="Revoke this device?"
          visible={Boolean(confirmDevice)}
        />
      </Box>
    </Page>
  );
};

export default DevicesScreen;
