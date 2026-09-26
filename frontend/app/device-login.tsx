import {selectBetterAuthUserId} from "@terreno/rtk";
import {Box, Button, Card, Heading, Page, Spinner, Text} from "@terreno/ui";
import {useLocalSearchParams, useRouter} from "expo-router";
import type React from "react";
import {useCallback, useState} from "react";
import {Linking, Platform} from "react-native";
import {useSelector} from "react-redux";
import {useDevicesessionsIssueMutation} from "@/store/openApiSdk";
import {useGetMeQuery} from "@/store/sdk";

// The Mac app opens this page in ASWebAuthenticationSession:
//   /device-login?client=mac&redirect=sungold-mac://auth&state=<random>&name=<computer name>
// After the user approves, the backend issues a device session and this page hands the
// token back through the allowlisted redirect. The backend rejects any other redirect.
const CLIENT_LABELS: Record<string, string> = {mac: "Sungold for Mac"};

const firstParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const openRedirect = async (url: string): Promise<void> => {
  if (Platform.OS === "web") {
    window.location.assign(url);
    return;
  }
  await Linking.openURL(url);
};

const ApproveDevice: React.FC<{
  client: string;
  name?: string;
  redirect: string;
  state: string;
}> = ({client, name, redirect, state}) => {
  const router = useRouter();
  const {data: me} = useGetMeQuery();
  const [issue, {isLoading}] = useDevicesessionsIssueMutation();
  const [error, setError] = useState<string | undefined>(undefined);
  const [redirectUrl, setRedirectUrl] = useState<string | undefined>(undefined);

  const handleApprove = useCallback(async (): Promise<void> => {
    setError(undefined);
    const result = await issue({client: client as "mac", name, redirect, state});
    // The generated API unwraps the server's {data} envelope.
    const url = (result as {data?: {redirectUrl?: string}}).data?.redirectUrl;
    if (!url) {
      const title = (result as {error?: {data?: {title?: string}}}).error?.data?.title;
      setError(title ?? "Could not sign in the device. Try again from the app.");
      return;
    }
    setRedirectUrl(url);
    await openRedirect(url);
  }, [client, issue, name, redirect, state]);

  const handleCancel = useCallback((): void => {
    router.replace("/(tabs)");
  }, [router]);

  if (redirectUrl) {
    return (
      <Box gap={3} testID="device-login-done">
        <Heading size="sm">You're signed in</Heading>
        <Text>Return to {CLIENT_LABELS[client] ?? "the app"}. You can close this window.</Text>
        <Button
          onClick={(): Promise<void> => openRedirect(redirectUrl)}
          testID="device-login-reopen-button"
          text="Open the app again"
          variant="outline"
        />
      </Box>
    );
  }

  return (
    <Box gap={3} testID="device-login-approve">
      <Heading size="sm">Sign in {CLIENT_LABELS[client] ?? "this device"}?</Heading>
      <Text>
        {name ? `${name} will` : "The device will"} be signed in as {me?.email ?? "your account"}.
        You can revoke it later.
      </Text>
      {error ? (
        <Box testID="device-login-error">
          <Text color="error">{error}</Text>
        </Box>
      ) : null}
      <Button
        loading={isLoading}
        onClick={handleApprove}
        testID="device-login-approve-button"
        text="Sign in"
      />
      <Button
        onClick={handleCancel}
        testID="device-login-cancel-button"
        text="Cancel"
        variant="muted"
      />
    </Box>
  );
};

const DeviceLoginScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{
    client?: string;
    name?: string;
    redirect?: string;
    state?: string;
  }>();
  const client = firstParam(params.client);
  const redirect = firstParam(params.redirect);
  const state = firstParam(params.state);
  const name = firstParam(params.name);
  const userId = useSelector(selectBetterAuthUserId);

  const handleSignIn = useCallback((): void => {
    const query = new URLSearchParams({
      client: client ?? "",
      redirect: redirect ?? "",
      state: state ?? "",
      ...(name ? {name} : {}),
    });
    router.push({params: {next: `/device-login?${query.toString()}`}, pathname: "/login"});
  }, [client, name, redirect, router, state]);

  const isValidRequest = Boolean(client && CLIENT_LABELS[client] && redirect && state);

  return (
    <Page navigation={undefined} title="Sign in a device">
      <Box alignSelf="center" maxWidth={480} padding={4} testID="device-login-screen" width="100%">
        <Card>
          {!isValidRequest ? (
            <Box testID="device-login-invalid">
              <Text>This sign-in link is incomplete. Start signing in again from the app.</Text>
            </Box>
          ) : userId === undefined ? (
            <Spinner />
          ) : !userId ? (
            <Box gap={3} testID="device-login-signed-out">
              <Heading size="sm">Sign in to continue</Heading>
              <Text>Sign in to Sungold to connect {CLIENT_LABELS[client ?? ""]}.</Text>
              <Button onClick={handleSignIn} testID="device-login-signin-button" text="Sign in" />
            </Box>
          ) : (
            <ApproveDevice
              client={client ?? ""}
              name={name}
              redirect={redirect ?? ""}
              state={state ?? ""}
            />
          )}
        </Card>
      </Box>
    </Page>
  );
};

export default DeviceLoginScreen;
