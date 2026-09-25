import {Stack} from "expo-router";
import {DefaultTheme, ThemeProvider} from "expo-router/react-navigation";
import {useEffect} from "react";
import "react-native-reanimated";
import {baseUrl, selectBetterAuthIsLoading, selectBetterAuthUserId} from "@terreno/rtk";
import {SyncDbProvider} from "@terreno/syncdb/react";
import {Spinner, TerrenoProvider} from "@terreno/ui";
import {Provider, useSelector} from "react-redux";
import {PersistGate} from "redux-persist/integration/react";
import store, {persistor, syncBetterAuthSession} from "@/store/index";
import {setSyncDbReady, syncDb} from "@/store/syncdb";

export {ErrorBoundary} from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

// TerrenoProvider loads the Nunito/Titillium Web families @terreno/ui renders with, so this
// app ships no font assets of its own. Add `useFonts` here only for extra custom faces.
export default function RootLayout(): React.ReactElement | null {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <TerrenoProvider openAPISpecUrl={`${baseUrl}/openapi.json`}>
          <RootLayoutNav />
        </TerrenoProvider>
      </PersistGate>
    </Provider>
  );
}

function RootLayoutNav(): React.ReactElement {
  const userId = useSelector(selectBetterAuthUserId) ?? undefined;
  const isAuthLoading = useSelector(selectBetterAuthIsLoading);

  // Hydrate Better Auth session into Redux on startup.
  useEffect(() => {
    void syncBetterAuthSession(store.dispatch);
  }, []);

  // Start syncdb after login; stop on logout.
  useEffect(() => {
    if (!userId) {
      setSyncDbReady(false);
      return;
    }
    let stopped = false;
    void syncDb
      .start()
      .then(() => {
        if (!stopped) {
          setSyncDbReady(true);
        }
      })
      .catch((startError: unknown) => {
        console.error("[syncdb] start failed", startError);
        setSyncDbReady(false);
      });
    return () => {
      stopped = true;
      setSyncDbReady(false);
      void syncDb.stop();
    };
  }, [userId]);

  if (isAuthLoading) {
    return <Spinner />;
  }

  return (
    <SyncDbProvider client={syncDb}>
      <ThemeProvider value={DefaultTheme}>
        {/* Stack.Protected is the supported way to gate routes on auth state. Rendering
            Stack.Screen children behind a raw conditional (or a fragment) crashes the
            navigator, because Stack reads its screen config off the child elements. */}
        <Stack>
          <Stack.Protected guard={!userId}>
            <Stack.Screen name="login" options={{headerShown: false}} />
            <Stack.Screen name="signup" options={{headerShown: false}} />
          </Stack.Protected>
          <Stack.Protected guard={Boolean(userId)}>
            <Stack.Screen name="(tabs)" options={{headerShown: false}} />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </SyncDbProvider>
  );
}
