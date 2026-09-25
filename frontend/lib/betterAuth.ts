import {baseUrl, createBetterAuthClient} from "@terreno/rtk";
import Constants from "expo-constants";

const getAppScheme = (): string => {
  const expoExtra = Constants.expoConfig?.extra;
  return expoExtra?.scheme ?? "sungold";
};

export const betterAuthClient = createBetterAuthClient({
  baseURL: baseUrl,
  scheme: getAppScheme(),
  storagePrefix: "sungold",
});

export const signOut = async (): Promise<void> => {
  await betterAuthClient.signOut();
};
