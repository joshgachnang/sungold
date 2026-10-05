import {
  APIError,
  type createBetterAuth,
  getBetterAuthSession,
  modelRouter,
  OwnerQueryFilter,
  Permissions,
  z,
} from "@terreno/api";
import {DeviceSession} from "../models/deviceSession";
import type {DeviceSessionDocument} from "../types/models/deviceSessionTypes";
import type {UserDocument} from "../types/models/userTypes";

type BetterAuthInstance = ReturnType<typeof createBetterAuth>;

interface SessionAdapter {
  createSession: (
    userId: string,
    dontRememberMe?: boolean,
    override?: Record<string, unknown>
  ) => Promise<{id: string; token: string}>;
  deleteSession: (token: string) => Promise<void>;
}

interface AuthContext {
  internalAdapter: SessionAdapter;
  adapter: {
    findOne: (args: {
      model: string;
      where: {field: string; value: string}[];
    }) => Promise<{token?: string} | null>;
  };
}

// Native clients and the exact callback each may receive a token on. The token is only
// ever placed in one of these URLs, never an arbitrary redirect.
const DEVICE_REDIRECTS: Record<string, string> = {mac: "sungold-mac://auth"};

let deviceAuth: BetterAuthInstance | undefined;

// The server passes its Better Auth instance at startup; device sessions are Better Auth
// sessions in the same database, so the bearer plugin accepts their tokens.
export const configureDeviceAuth = (auth: BetterAuthInstance | undefined): void => {
  deviceAuth = auth;
};

const getAuthContext = async (): Promise<AuthContext> => {
  if (!deviceAuth) {
    throw new APIError({status: 500, title: "Device sign-in is not configured"});
  }
  return (await deviceAuth.$context) as unknown as AuthContext;
};

const issueBodySchema = z
  .object({
    client: z.enum(["mac"]),
    name: z.string().trim().max(100).optional(),
    redirect: z.string(),
    // Echoed back so the device can match the callback to the request it started.
    state: z
      .string()
      .min(1)
      .max(256)
      .regex(/^[A-Za-z0-9._~-]+$/),
  })
  .strict();

export const deviceSessionRouter = modelRouter("/deviceSessions", DeviceSession, {
  collectionActions: {
    issue: {
      body: issueBodySchema,
      handler: async ({body, req, user}) => {
        const {client, name, redirect, state} = body as z.infer<typeof issueBodySchema>;
        // Only a person's own sign-in (web) may add devices. A device token minting more
        // device tokens would let a stolen token outlive its own revocation.
        const callerSessionId = getBetterAuthSession(req)?.session.id;
        if (
          callerSessionId &&
          (await DeviceSession.exists({betterAuthSessionId: callerSessionId}))
        ) {
          throw new APIError({status: 403, title: "Devices cannot sign in other devices"});
        }
        if (DEVICE_REDIRECTS[client] !== redirect) {
          throw new APIError({status: 400, title: "Redirect is not allowed for this client"});
        }
        const appUser = user as unknown as UserDocument;
        if (!appUser?.betterAuthId) {
          throw new APIError({status: 400, title: "Account cannot sign in devices"});
        }
        const context = await getAuthContext();
        const session = await context.internalAdapter.createSession(appUser.betterAuthId, false, {
          userAgent: `Sungold for ${client}`,
        });
        const deviceSession = await DeviceSession.create({
          betterAuthSessionId: session.id,
          client,
          name,
          ownerId: appUser._id,
        });
        const params = new URLSearchParams({state, token: session.token});
        return {deviceSession, redirectUrl: `${redirect}?${params.toString()}`};
      },
      method: "POST",
      permissions: [Permissions.IsAuthenticated],
      summary: "Issue a bearer session for a native client and return its callback URL",
    },
  },
  instanceActions: {
    revoke: {
      handler: async ({doc}) => {
        const deviceSession = doc as DeviceSessionDocument;
        if (!deviceSession.revokedAt) {
          const context = await getAuthContext();
          const session = await context.adapter.findOne({
            model: "session",
            where: [{field: "id", value: deviceSession.betterAuthSessionId}],
          });
          if (session?.token) {
            await context.internalAdapter.deleteSession(session.token);
          }
          deviceSession.revokedAt = new Date();
          await deviceSession.save();
        }
        return deviceSession;
      },
      method: "POST",
      permissions: [Permissions.IsOwner],
      summary: "Revoke a device; its token stops working immediately",
    },
  },
  permissions: {
    create: [],
    delete: [],
    list: [Permissions.IsAuthenticated],
    read: [Permissions.IsOwner],
    update: [],
  },
  queryFilter: OwnerQueryFilter,
  sort: "-created",
});
