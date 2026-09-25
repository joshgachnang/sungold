/**
 * RTK Query API base for Better Auth session cookies.
 *
 * Unlike `@terreno/rtk`'s JWT `emptySplitApi`, this base query reads the Better Auth
 * session token on every request and sends it as a Bearer header with credentials.
 */
import {createApi, fetchBaseQuery} from "@reduxjs/toolkit/query/react";
import {baseUrl, IsWeb, type VersionCheckResponse} from "@terreno/rtk";
import Constants from "expo-constants";
import {betterAuthClient} from "@/lib/betterAuth";

const readSessionToken = async (): Promise<string | null> => {
  try {
    const result = await betterAuthClient.getSession();
    const envelope = (result as {data?: {session?: {token?: string}}})?.data ?? result;
    const session = (envelope as {session?: {token?: string}})?.session;
    return session?.token ?? null;
  } catch {
    return null;
  }
};

const betterAuthBaseQuery = fetchBaseQuery({
  baseUrl,
  credentials: "include",
  prepareHeaders: async (headers) => {
    const token = await readSessionToken();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    const version = Constants.expoConfig?.version;
    if (version) {
      headers.set("App-Version", version);
    }
    headers.set("App-Platform", IsWeb ? "web" : "mobile");
    return headers;
  },
  responseHandler: async (response) => {
    if (response.status === 204) {
      return null;
    }
    const result = await response.json();
    if (result && typeof result === "object" && "more" in result) {
      return result;
    }
    if (result?.data) {
      return result.data;
    }
    return result;
  },
});

export const emptySplitApi = createApi({
  baseQuery: betterAuthBaseQuery,
  endpoints: (builder) => ({
    getVersionCheck: builder.query<VersionCheckResponse, {platform: string; version: number}>({
      query: ({platform, version}) => ({
        params: {platform, version},
        url: "/version-check",
      }),
    }),
  }),
  reducerPath: "terreno-rtk",
});

export const {useGetVersionCheckQuery, useLazyGetVersionCheckQuery} = emptySplitApi;
