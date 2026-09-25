import AsyncStorage from "@react-native-async-storage/async-storage";
import {combineReducers, configureStore, type Store} from "@reduxjs/toolkit";
import {
  type BetterAuthClientInterface,
  generateBetterAuthSlice,
  registerTerrenoDevStore,
} from "@terreno/rtk";
import {DateTime} from "luxon";
import {useDispatch} from "react-redux";
import type {Storage} from "redux-persist";
import {persistReducer, persistStore} from "redux-persist";
import {betterAuthClient} from "@/lib/betterAuth";

import appState from "./appState";
import {rtkQueryErrorMiddleware} from "./errors";
import {terrenoApi} from "./sdk";

const betterAuth = generateBetterAuthSlice({
  authClient: betterAuthClient as unknown as BetterAuthClientInterface,
});

export const logout = betterAuth.actions.logout;
export const syncBetterAuthSession = betterAuth.syncSession;

const createSafeStorage = (): Storage => {
  return {
    getItem: async (key: string): Promise<string | null> => {
      if (typeof window !== "undefined") {
        return AsyncStorage.getItem(key);
      }
      return null;
    },
    removeItem: async (key: string): Promise<void> => {
      if (typeof window !== "undefined") {
        return AsyncStorage.removeItem(key);
      }
    },
    setItem: async (key: string, value: string): Promise<void> => {
      if (typeof window !== "undefined") {
        return AsyncStorage.setItem(key, value);
      }
    },
  };
};

const persistConfig = {
  blacklist: ["terreno-rtk", "betterAuth"],
  key: "root",
  storage: createSafeStorage(),
  timeout: 0,
  version: 1,
};

const rootReducer = combineReducers({
  appState,
  betterAuth: betterAuth.reducer,
  "terreno-rtk": terrenoApi.reducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  devTools: process.env.NODE_ENV !== "production" && {
    name: `App-${
      typeof window !== "undefined"
        ? // biome-ignore lint/suspicious/noAssignInExpressions: Window name assignment
          window.name || ((window.name = `Window-${DateTime.now().toFormat("HH:mm:ss")}`))
        : "Unknown"
    }`,
  },
  middleware: (getDefaultMiddleware) => {
    return getDefaultMiddleware({
      immutableCheck: false,
      serializableCheck: false,
      thunk: true,
    }).concat([
      ...betterAuth.middleware,
      // noExplicitAny: RTK Query middleware typing
      terrenoApi.middleware as any,
      rtkQueryErrorMiddleware,
      // noExplicitAny: Middleware array typing
    ]) as any;
  },
  reducer: persistedReducer,
});

registerTerrenoDevStore(store as unknown as Store<Record<string, unknown>>);

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;

export default store;
