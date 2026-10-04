import type {AuthProvider, BetterAuthConfig} from "@terreno/api";

const DEFAULT_BETTER_AUTH_URL = "http://localhost:4093";
const DEFAULT_WEB_ORIGINS = ["http://localhost:8093", "http://127.0.0.1:8093"];
const APP_SCHEMES = ["sungold://", "exp://"];

export const getAuthProvider = (): AuthProvider => {
  const provider = process.env.AUTH_PROVIDER as AuthProvider | undefined;
  return provider ?? "better-auth";
};

export const getWebOrigins = (): string[] => {
  const origins = new Set<string>(DEFAULT_WEB_ORIGINS);
  const fromEnv = process.env.CORS_ORIGINS?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  for (const origin of fromEnv ?? []) {
    origins.add(origin);
  }
  return [...origins];
};

export const buildBetterAuthConfig = (): BetterAuthConfig | undefined => {
  if (getAuthProvider() !== "better-auth") {
    return undefined;
  }

  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is required when AUTH_PROVIDER=better-auth");
  }

  return {
    baseURL: process.env.BETTER_AUTH_URL ?? DEFAULT_BETTER_AUTH_URL,
    crossDomainCookies: process.env.CROSS_DOMAIN_AUTH_COOKIES === "true",
    enabled: true,
    secret,
    trustedOrigins: [...APP_SCHEMES, ...getWebOrigins()],
  };
};
