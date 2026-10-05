// biome-ignore-all lint/suspicious/noExplicitAny: types are generated from backend OpenAPI schemas
import {emptySplitApi as api} from "./betterAuthApi";
export const addTagTypes = [
  "users",
  "blocklists",
  "focussessions",
  "parkinglotitems",
  "unlockgrants",
  "devicesessions",
  "admin",
  "adminMigrations",
  "organizations",
] as const;
const injectedRtkApi = api
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (build) => ({
      adminMigrationsRun: build.mutation<AdminMigrationsRunRes, AdminMigrationsRunArgs>({
        invalidatesTags: ["adminMigrations"],
        query: (queryArg) => ({
          method: "POST",
          params: {
            wetRun: queryArg,
          },
          url: `/admin/migrations/run`,
        }),
      }),
      adminMigrationsStatus: build.query<AdminMigrationsStatusRes, AdminMigrationsStatusArgs>({
        providesTags: ["adminMigrations"],
        query: () => ({url: `/admin/migrations/status`}),
      }),
      blocklistsStarter: build.mutation<BlocklistsStarterRes, BlocklistsStarterArgs>({
        invalidatesTags: ["blocklists"],
        query: () => ({method: "POST", url: `/blocklists/starter`}),
      }),
      deleteAdminUsersById: build.mutation<DeleteAdminUsersByIdRes, DeleteAdminUsersByIdArgs>({
        invalidatesTags: ["users"],
        query: (queryArg) => ({
          method: "DELETE",
          url: `/admin/users/${queryArg}`,
        }),
      }),
      deleteBlocklistsById: build.mutation<DeleteBlocklistsByIdRes, DeleteBlocklistsByIdArgs>({
        invalidatesTags: ["blocklists"],
        query: (queryArg) => ({
          method: "DELETE",
          url: `/blocklists/${queryArg}`,
        }),
      }),
      deleteOrgsById: build.mutation<DeleteOrgsByIdRes, DeleteOrgsByIdArgs>({
        invalidatesTags: ["organizations"],
        query: (queryArg) => ({method: "DELETE", url: `/orgs/${queryArg}`}),
      }),
      deleteOrgsByIdMembersAndMemberId: build.mutation<
        DeleteOrgsByIdMembersAndMemberIdRes,
        DeleteOrgsByIdMembersAndMemberIdArgs
      >({
        invalidatesTags: ["organizations"],
        query: (queryArg) => ({
          method: "DELETE",
          url: `/orgs/${queryArg.id}/members/${queryArg.memberId}`,
        }),
      }),
      deleteUsersById: build.mutation<DeleteUsersByIdRes, DeleteUsersByIdArgs>({
        invalidatesTags: ["users"],
        query: (queryArg) => ({method: "DELETE", url: `/users/${queryArg}`}),
      }),
      devicesessionsIssue: build.mutation<DevicesessionsIssueRes, DevicesessionsIssueArgs>({
        invalidatesTags: ["devicesessions"],
        query: (queryArg) => ({
          body: queryArg,
          method: "POST",
          url: `/deviceSessions/issue`,
        }),
      }),
      devicesessionsRevoke: build.mutation<DevicesessionsRevokeRes, DevicesessionsRevokeArgs>({
        invalidatesTags: ["devicesessions"],
        query: (queryArg) => ({
          method: "POST",
          url: `/deviceSessions/${queryArg}/revoke`,
        }),
      }),
      focussessionsEnd: build.mutation<FocussessionsEndRes, FocussessionsEndArgs>({
        invalidatesTags: ["focussessions"],
        query: (queryArg) => ({
          method: "POST",
          url: `/focusSessions/${queryArg}/end`,
        }),
      }),
      focussessionsGrants: build.mutation<FocussessionsGrantsRes, FocussessionsGrantsArgs>({
        invalidatesTags: ["focussessions"],
        query: (queryArg) => ({
          body: queryArg.body,
          method: "POST",
          url: `/focusSessions/${queryArg.id}/grants`,
        }),
      }),
      focussessionsReview: build.mutation<FocussessionsReviewRes, FocussessionsReviewArgs>({
        invalidatesTags: ["focussessions"],
        query: (queryArg) => ({
          body: queryArg.body,
          method: "POST",
          url: `/focusSessions/${queryArg.id}/review`,
        }),
      }),
      getAdminConfig: build.query<GetAdminConfigRes, GetAdminConfigArgs>({
        providesTags: ["admin"],
        query: () => ({url: `/admin/config`}),
      }),
      getAdminUsers: build.query<GetAdminUsersRes, GetAdminUsersArgs>({
        providesTags: ["users"],
        query: (queryArg) => ({
          params: {
            _id: queryArg._id,
            admin: queryArg.admin,
            created: queryArg.created,
            email: queryArg.email,
            limit: queryArg.limit,
            name: queryArg.name,
            page: queryArg.page,
            q: queryArg.q,
            sort: queryArg.sort,
          },
          url: `/admin/users/`,
        }),
      }),
      getAdminUsersById: build.query<GetAdminUsersByIdRes, GetAdminUsersByIdArgs>({
        providesTags: ["users"],
        query: (queryArg) => ({url: `/admin/users/${queryArg}`}),
      }),
      getBlocklists: build.query<GetBlocklistsRes, GetBlocklistsArgs>({
        providesTags: ["blocklists"],
        query: (queryArg) => ({
          params: {
            _id: queryArg._id,
            limit: queryArg.limit,
            page: queryArg.page,
            sort: queryArg.sort,
            source: queryArg.source,
          },
          url: `/blocklists/`,
        }),
      }),
      getBlocklistsById: build.query<GetBlocklistsByIdRes, GetBlocklistsByIdArgs>({
        providesTags: ["blocklists"],
        query: (queryArg) => ({url: `/blocklists/${queryArg}`}),
      }),
      getDeviceSessions: build.query<GetDeviceSessionsRes, GetDeviceSessionsArgs>({
        providesTags: ["devicesessions"],
        query: (queryArg) => ({
          params: {
            _id: queryArg._id,
            limit: queryArg.limit,
            page: queryArg.page,
            sort: queryArg.sort,
          },
          url: `/deviceSessions/`,
        }),
      }),
      getDeviceSessionsById: build.query<GetDeviceSessionsByIdRes, GetDeviceSessionsByIdArgs>({
        providesTags: ["devicesessions"],
        query: (queryArg) => ({url: `/deviceSessions/${queryArg}`}),
      }),
      getFocusSessions: build.query<GetFocusSessionsRes, GetFocusSessionsArgs>({
        providesTags: ["focussessions"],
        query: (queryArg) => ({
          params: {
            _id: queryArg._id,
            limit: queryArg.limit,
            page: queryArg.page,
            sort: queryArg.sort,
            status: queryArg.status,
          },
          url: `/focusSessions/`,
        }),
      }),
      getFocusSessionsById: build.query<GetFocusSessionsByIdRes, GetFocusSessionsByIdArgs>({
        providesTags: ["focussessions"],
        query: (queryArg) => ({url: `/focusSessions/${queryArg}`}),
      }),
      getOrgs: build.query<GetOrgsRes, GetOrgsArgs>({
        providesTags: ["organizations"],
        query: () => ({url: `/orgs/`}),
      }),
      getOrgsById: build.query<GetOrgsByIdRes, GetOrgsByIdArgs>({
        providesTags: ["organizations"],
        query: (queryArg) => ({url: `/orgs/${queryArg}`}),
      }),
      getOrgsByIdMembers: build.query<GetOrgsByIdMembersRes, GetOrgsByIdMembersArgs>({
        providesTags: ["organizations"],
        query: (queryArg) => ({url: `/orgs/${queryArg}/members`}),
      }),
      getOrgsMine: build.query<GetOrgsMineRes, GetOrgsMineArgs>({
        providesTags: ["organizations"],
        query: () => ({url: `/orgs/mine`}),
      }),
      getParkingLotItems: build.query<GetParkingLotItemsRes, GetParkingLotItemsArgs>({
        providesTags: ["parkinglotitems"],
        query: (queryArg) => ({
          params: {
            _id: queryArg._id,
            limit: queryArg.limit,
            page: queryArg.page,
            sessionId: queryArg.sessionId,
            sort: queryArg.sort,
            status: queryArg.status,
          },
          url: `/parkingLotItems/`,
        }),
      }),
      getParkingLotItemsById: build.query<GetParkingLotItemsByIdRes, GetParkingLotItemsByIdArgs>({
        providesTags: ["parkinglotitems"],
        query: (queryArg) => ({url: `/parkingLotItems/${queryArg}`}),
      }),
      getUnlockGrants: build.query<GetUnlockGrantsRes, GetUnlockGrantsArgs>({
        providesTags: ["unlockgrants"],
        query: (queryArg) => ({
          params: {
            _id: queryArg._id,
            limit: queryArg.limit,
            page: queryArg.page,
            sessionId: queryArg.sessionId,
            sort: queryArg.sort,
          },
          url: `/unlockGrants/`,
        }),
      }),
      getUnlockGrantsById: build.query<GetUnlockGrantsByIdRes, GetUnlockGrantsByIdArgs>({
        providesTags: ["unlockgrants"],
        query: (queryArg) => ({url: `/unlockGrants/${queryArg}`}),
      }),
      getUsers: build.query<GetUsersRes, GetUsersArgs>({
        providesTags: ["users"],
        query: (queryArg) => ({
          params: {
            _id: queryArg._id,
            email: queryArg.email,
            limit: queryArg.limit,
            name: queryArg.name,
            page: queryArg.page,
            sort: queryArg.sort,
          },
          url: `/users/`,
        }),
      }),
      getUsersById: build.query<GetUsersByIdRes, GetUsersByIdArgs>({
        providesTags: ["users"],
        query: (queryArg) => ({url: `/users/${queryArg}`}),
      }),
      patchAdminUsersById: build.mutation<PatchAdminUsersByIdRes, PatchAdminUsersByIdArgs>({
        invalidatesTags: ["users"],
        query: (queryArg) => ({
          body: queryArg.body,
          method: "PATCH",
          url: `/admin/users/${queryArg.id}`,
        }),
      }),
      patchBlocklistsById: build.mutation<PatchBlocklistsByIdRes, PatchBlocklistsByIdArgs>({
        invalidatesTags: ["blocklists"],
        query: (queryArg) => ({
          body: queryArg.body,
          method: "PATCH",
          url: `/blocklists/${queryArg.id}`,
        }),
      }),
      patchFocusSessionsById: build.mutation<PatchFocusSessionsByIdRes, PatchFocusSessionsByIdArgs>(
        {
          invalidatesTags: ["focussessions"],
          query: (queryArg) => ({
            body: queryArg.body,
            method: "PATCH",
            url: `/focusSessions/${queryArg.id}`,
          }),
        }
      ),
      patchOrgsById: build.mutation<PatchOrgsByIdRes, PatchOrgsByIdArgs>({
        invalidatesTags: ["organizations"],
        query: (queryArg) => ({
          body: queryArg.body,
          method: "PATCH",
          url: `/orgs/${queryArg.id}`,
        }),
      }),
      patchOrgsByIdMembersAndMemberId: build.mutation<
        PatchOrgsByIdMembersAndMemberIdRes,
        PatchOrgsByIdMembersAndMemberIdArgs
      >({
        invalidatesTags: ["organizations"],
        query: (queryArg) => ({
          body: queryArg.body,
          method: "PATCH",
          url: `/orgs/${queryArg.id}/members/${queryArg.memberId}`,
        }),
      }),
      patchParkingLotItemsById: build.mutation<
        PatchParkingLotItemsByIdRes,
        PatchParkingLotItemsByIdArgs
      >({
        invalidatesTags: ["parkinglotitems"],
        query: (queryArg) => ({
          body: queryArg.body,
          method: "PATCH",
          url: `/parkingLotItems/${queryArg.id}`,
        }),
      }),
      patchUsersById: build.mutation<PatchUsersByIdRes, PatchUsersByIdArgs>({
        invalidatesTags: ["users"],
        query: (queryArg) => ({
          body: queryArg.body,
          method: "PATCH",
          url: `/users/${queryArg.id}`,
        }),
      }),
      postAdminBackgroundTasks: build.mutation<
        PostAdminBackgroundTasksRes,
        PostAdminBackgroundTasksArgs
      >({
        invalidatesTags: ["admin"],
        query: (queryArg) => ({
          body: queryArg,
          method: "POST",
          url: `/admin/background-tasks`,
        }),
      }),
      postAdminUsers: build.mutation<PostAdminUsersRes, PostAdminUsersArgs>({
        invalidatesTags: ["users"],
        query: (queryArg) => ({
          body: queryArg,
          method: "POST",
          url: `/admin/users/`,
        }),
      }),
      postAdminUsersBulkPatch: build.mutation<
        PostAdminUsersBulkPatchRes,
        PostAdminUsersBulkPatchArgs
      >({
        invalidatesTags: ["admin"],
        query: (queryArg) => ({
          body: queryArg,
          method: "POST",
          url: `/admin/users/bulk-patch`,
        }),
      }),
      postBlocklists: build.mutation<PostBlocklistsRes, PostBlocklistsArgs>({
        invalidatesTags: ["blocklists"],
        query: (queryArg) => ({
          body: queryArg,
          method: "POST",
          url: `/blocklists/`,
        }),
      }),
      postFocusSessions: build.mutation<PostFocusSessionsRes, PostFocusSessionsArgs>({
        invalidatesTags: ["focussessions"],
        query: (queryArg) => ({
          body: queryArg,
          method: "POST",
          url: `/focusSessions/`,
        }),
      }),
      postOrgs: build.mutation<PostOrgsRes, PostOrgsArgs>({
        invalidatesTags: ["organizations"],
        query: (queryArg) => ({
          body: queryArg,
          method: "POST",
          url: `/orgs/`,
        }),
      }),
      postOrgsByIdMembers: build.mutation<PostOrgsByIdMembersRes, PostOrgsByIdMembersArgs>({
        invalidatesTags: ["organizations"],
        query: (queryArg) => ({
          body: queryArg.body,
          method: "POST",
          url: `/orgs/${queryArg.id}/members`,
        }),
      }),
      postParkingLotItems: build.mutation<PostParkingLotItemsRes, PostParkingLotItemsArgs>({
        invalidatesTags: ["parkinglotitems"],
        query: (queryArg) => ({
          body: queryArg,
          method: "POST",
          url: `/parkingLotItems/`,
        }),
      }),
      postUsers: build.mutation<PostUsersRes, PostUsersArgs>({
        invalidatesTags: ["users"],
        query: (queryArg) => ({
          body: queryArg,
          method: "POST",
          url: `/users/`,
        }),
      }),
      unlockgrantsPublicKey: build.query<UnlockgrantsPublicKeyRes, UnlockgrantsPublicKeyArgs>({
        providesTags: ["unlockgrants"],
        query: () => ({url: `/unlockGrants/publicKey`}),
      }),
    }),
    overrideExisting: false,
  });

export {injectedRtkApi as openapi};
export type PostUsersRes = /** status 201 Successful create */ {
  /** Whether the user has administrator access */
  admin?: boolean;
  /** Identifier linking to the Better Auth session provider */
  betterAuthId?: string;
  /** The user's email address, used for authentication */
  email: string;
  /** The user's display name */
  name: string;
  /** When the user's starter blocklists were first seeded */
  starterBlocklistsSeededAt?: string;
  /** IANA timezone used for profile-local week boundaries */
  timezone?: string;
  /** Day that starts the user's focus week, Sunday = 0 */
  weekStartDay?: number;
  _id: string;
  hash?: string;
  salt?: string;
  /** When this document was last updated */
  updated: string;
  /** When this document was created */
  created: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
};
export type PostUsersArgs = {
  /** Whether the user has administrator access */
  admin?: boolean;
  /** Identifier linking to the Better Auth session provider */
  betterAuthId?: string;
  /** The user's email address, used for authentication */
  email?: string;
  /** The user's display name */
  name?: string;
  /** When the user's starter blocklists were first seeded */
  starterBlocklistsSeededAt?: string;
  /** IANA timezone used for profile-local week boundaries */
  timezone?: string;
  /** Day that starts the user's focus week, Sunday = 0 */
  weekStartDay?: number;
  _id?: string;
  hash?: string;
  salt?: string;
  /** When this document was last updated */
  updated?: string;
  /** When this document was created */
  created?: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
};
export type GetUsersRes = /** status 200 Successful list */ {
  data?: {
    /** Whether the user has administrator access */
    admin?: boolean;
    /** Identifier linking to the Better Auth session provider */
    betterAuthId?: string;
    /** The user's email address, used for authentication */
    email: string;
    /** The user's display name */
    name: string;
    /** When the user's starter blocklists were first seeded */
    starterBlocklistsSeededAt?: string;
    /** IANA timezone used for profile-local week boundaries */
    timezone?: string;
    /** Day that starts the user's focus week, Sunday = 0 */
    weekStartDay?: number;
    _id: string;
    hash?: string;
    salt?: string;
    /** When this document was last updated */
    updated: string;
    /** When this document was created */
    created: string;
    /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
    deleted?: boolean;
  }[];
  limit?: number;
  more?: boolean;
  page?: number;
  total?: number;
};
export type GetUsersArgs = {
  _id?: {
    $in?: string[];
  };
  email?:
    | string
    | {
        $in?: string[];
      };
  name?:
    | string
    | {
        $in?: string[];
      };
  page?: number;
  sort?: string;
  limit?: number;
};
export type GetUsersByIdRes = /** status 200 Successful read */ {
  /** Whether the user has administrator access */
  admin?: boolean;
  /** Identifier linking to the Better Auth session provider */
  betterAuthId?: string;
  /** The user's email address, used for authentication */
  email: string;
  /** The user's display name */
  name: string;
  /** When the user's starter blocklists were first seeded */
  starterBlocklistsSeededAt?: string;
  /** IANA timezone used for profile-local week boundaries */
  timezone?: string;
  /** Day that starts the user's focus week, Sunday = 0 */
  weekStartDay?: number;
  _id: string;
  hash?: string;
  salt?: string;
  /** When this document was last updated */
  updated: string;
  /** When this document was created */
  created: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
};
export type GetUsersByIdArgs = string;
export type PatchUsersByIdRes = /** status 200 Successful update */ {
  /** Whether the user has administrator access */
  admin?: boolean;
  /** Identifier linking to the Better Auth session provider */
  betterAuthId?: string;
  /** The user's email address, used for authentication */
  email: string;
  /** The user's display name */
  name: string;
  /** When the user's starter blocklists were first seeded */
  starterBlocklistsSeededAt?: string;
  /** IANA timezone used for profile-local week boundaries */
  timezone?: string;
  /** Day that starts the user's focus week, Sunday = 0 */
  weekStartDay?: number;
  _id: string;
  hash?: string;
  salt?: string;
  /** When this document was last updated */
  updated: string;
  /** When this document was created */
  created: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
};
export type PatchUsersByIdArgs = {
  id: string;
  body: {
    /** Whether the user has administrator access */
    admin?: boolean;
    /** Identifier linking to the Better Auth session provider */
    betterAuthId?: string;
    /** The user's email address, used for authentication */
    email?: string;
    /** The user's display name */
    name?: string;
    /** When the user's starter blocklists were first seeded */
    starterBlocklistsSeededAt?: string;
    /** IANA timezone used for profile-local week boundaries */
    timezone?: string;
    /** Day that starts the user's focus week, Sunday = 0 */
    weekStartDay?: number;
    _id?: string;
    hash?: string;
    salt?: string;
    /** When this document was last updated */
    updated?: string;
    /** When this document was created */
    created?: string;
    /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
    deleted?: boolean;
  };
};
export type DeleteUsersByIdRes = unknown;
export type DeleteUsersByIdArgs = string;
export type BlocklistsStarterRes = /** status 200 Successful response */ {
  data: {
    _id: string;
    created?: string;
    deleted?: boolean;
    domains: string[];
    name: string;
    ownerId: string;
    source: "starter" | "user";
    starterKey?: string;
    updated?: string;
  }[];
};
export type BlocklistsStarterArgs = undefined;
export type PostBlocklistsRes = /** status 201 Successful create */ {
  /** The document id (String so offline sync clients can mint ids) */
  _id: string;
  /** Normalized hostnames included in this blocklist */
  domains?: string[];
  /** The user-visible blocklist name */
  name: string;
  /** The user who owns this blocklist */
  ownerId: string;
  /** Whether this blocklist started from a preset or was created by the user */
  source: "starter" | "user";
  /** Stable preset key used to make starter blocklist seeding idempotent */
  starterKey?: string;
  /** When this document was last updated */
  updated: string;
  /** When this document was created */
  created: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
  /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
  _syncPrevStream?: string;
  /** Monotonic per-stream sequence stamped on every synced write */
  _syncSeq?: number;
};
export type PostBlocklistsArgs = {
  /** The document id (String so offline sync clients can mint ids) */
  _id?: string;
  /** Normalized hostnames included in this blocklist */
  domains?: string[];
  /** The user-visible blocklist name */
  name?: string;
  /** The user who owns this blocklist */
  ownerId?: string;
  /** Whether this blocklist started from a preset or was created by the user */
  source?: "starter" | "user";
  /** Stable preset key used to make starter blocklist seeding idempotent */
  starterKey?: string;
  /** When this document was last updated */
  updated?: string;
  /** When this document was created */
  created?: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
  /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
  _syncPrevStream?: string;
  /** Monotonic per-stream sequence stamped on every synced write */
  _syncSeq?: number;
};
export type GetBlocklistsRes = /** status 200 Successful list */ {
  data?: {
    /** The document id (String so offline sync clients can mint ids) */
    _id: string;
    /** Normalized hostnames included in this blocklist */
    domains?: string[];
    /** The user-visible blocklist name */
    name: string;
    /** The user who owns this blocklist */
    ownerId: string;
    /** Whether this blocklist started from a preset or was created by the user */
    source: "starter" | "user";
    /** Stable preset key used to make starter blocklist seeding idempotent */
    starterKey?: string;
    /** When this document was last updated */
    updated: string;
    /** When this document was created */
    created: string;
    /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
    deleted?: boolean;
    /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
    _syncPrevStream?: string;
    /** Monotonic per-stream sequence stamped on every synced write */
    _syncSeq?: number;
  }[];
  limit?: number;
  more?: boolean;
  page?: number;
  total?: number;
};
export type GetBlocklistsArgs = {
  _id?: {
    $in?: string[];
  };
  source?:
    | ("starter" | "user")
    | {
        $in?: string[];
      };
  page?: number;
  sort?: string;
  limit?: number;
};
export type GetBlocklistsByIdRes = /** status 200 Successful read */ {
  /** The document id (String so offline sync clients can mint ids) */
  _id: string;
  /** Normalized hostnames included in this blocklist */
  domains?: string[];
  /** The user-visible blocklist name */
  name: string;
  /** The user who owns this blocklist */
  ownerId: string;
  /** Whether this blocklist started from a preset or was created by the user */
  source: "starter" | "user";
  /** Stable preset key used to make starter blocklist seeding idempotent */
  starterKey?: string;
  /** When this document was last updated */
  updated: string;
  /** When this document was created */
  created: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
  /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
  _syncPrevStream?: string;
  /** Monotonic per-stream sequence stamped on every synced write */
  _syncSeq?: number;
};
export type GetBlocklistsByIdArgs = string;
export type PatchBlocklistsByIdRes = /** status 200 Successful update */ {
  /** The document id (String so offline sync clients can mint ids) */
  _id: string;
  /** Normalized hostnames included in this blocklist */
  domains?: string[];
  /** The user-visible blocklist name */
  name: string;
  /** The user who owns this blocklist */
  ownerId: string;
  /** Whether this blocklist started from a preset or was created by the user */
  source: "starter" | "user";
  /** Stable preset key used to make starter blocklist seeding idempotent */
  starterKey?: string;
  /** When this document was last updated */
  updated: string;
  /** When this document was created */
  created: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
  /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
  _syncPrevStream?: string;
  /** Monotonic per-stream sequence stamped on every synced write */
  _syncSeq?: number;
};
export type PatchBlocklistsByIdArgs = {
  id: string;
  body: {
    /** The document id (String so offline sync clients can mint ids) */
    _id?: string;
    /** Normalized hostnames included in this blocklist */
    domains?: string[];
    /** The user-visible blocklist name */
    name?: string;
    /** The user who owns this blocklist */
    ownerId?: string;
    /** Whether this blocklist started from a preset or was created by the user */
    source?: "starter" | "user";
    /** Stable preset key used to make starter blocklist seeding idempotent */
    starterKey?: string;
    /** When this document was last updated */
    updated?: string;
    /** When this document was created */
    created?: string;
    /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
    deleted?: boolean;
    /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
    _syncPrevStream?: string;
    /** Monotonic per-stream sequence stamped on every synced write */
    _syncSeq?: number;
  };
};
export type DeleteBlocklistsByIdRes = unknown;
export type DeleteBlocklistsByIdArgs = string;
export type FocussessionsEndRes = /** status 200 Successful response */ {
  data?: object;
};
export type FocussessionsEndArgs = string;
export type FocussessionsGrantsRes = /** status 200 Successful response */ {
  data?: object;
};
export type FocussessionsGrantsArgs = {
  id: string;
  body: {
    minutes: number;
    reason?: "peek";
  };
};
export type FocussessionsReviewRes = /** status 200 Successful response */ {
  data?: object;
};
export type FocussessionsReviewArgs = {
  id: string;
  body: {
    done?: string;
    items?: {
      id: string;
      status: "open" | "done" | "dismissed";
    }[];
    note?: string;
  };
};
export type PostFocusSessionsRes = /** status 201 Successful create */ {
  /** The document id (String so offline sync clients can mint ids) */
  _id: string;
  /** Normalized hostnames blocked while the session is active, e.g. youtube.com */
  blockedDomains?: string[];
  /** Blocklists selected when this session was started */
  blocklistIds?: string[];
  /** When the session was ended; unset while active */
  endedAt?: string;
  /** Optional planned end time for the session */
  endsAt?: string;
  /** What the user said they would work on, shown on block screens */
  intention?: string;
  /** The user who owns this session */
  ownerId: string;
  review?: {
    /** What got done during the session */
    done?: string;
    /** One-line end-of-block review note */
    note?: string;
    /** When the session review was submitted */
    reviewedAt?: string;
  };
  /** When the end-of-block review prompt was skipped */
  reviewSkippedAt?: string;
  /** When the session started */
  startedAt: string;
  /** Whether the session is currently blocking (active) or finished (ended) */
  status: "active" | "ended";
  /** When this document was last updated */
  updated: string;
  /** When this document was created */
  created: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
  /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
  _syncPrevStream?: string;
  /** Monotonic per-stream sequence stamped on every synced write */
  _syncSeq?: number;
};
export type PostFocusSessionsArgs = {
  /** The document id (String so offline sync clients can mint ids) */
  _id?: string;
  /** Normalized hostnames blocked while the session is active, e.g. youtube.com */
  blockedDomains?: string[];
  /** Blocklists selected when this session was started */
  blocklistIds?: string[];
  /** When the session was ended; unset while active */
  endedAt?: string;
  /** Optional planned end time for the session */
  endsAt?: string;
  /** What the user said they would work on, shown on block screens */
  intention?: string;
  /** The user who owns this session */
  ownerId?: string;
  review?: {
    /** What got done during the session */
    done?: string;
    /** One-line end-of-block review note */
    note?: string;
    /** When the session review was submitted */
    reviewedAt?: string;
  };
  /** When the end-of-block review prompt was skipped */
  reviewSkippedAt?: string;
  /** When the session started */
  startedAt?: string;
  /** Whether the session is currently blocking (active) or finished (ended) */
  status?: "active" | "ended";
  /** When this document was last updated */
  updated?: string;
  /** When this document was created */
  created?: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
  /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
  _syncPrevStream?: string;
  /** Monotonic per-stream sequence stamped on every synced write */
  _syncSeq?: number;
};
export type GetFocusSessionsRes = /** status 200 Successful list */ {
  data?: {
    /** The document id (String so offline sync clients can mint ids) */
    _id: string;
    /** Normalized hostnames blocked while the session is active, e.g. youtube.com */
    blockedDomains?: string[];
    /** Blocklists selected when this session was started */
    blocklistIds?: string[];
    /** When the session was ended; unset while active */
    endedAt?: string;
    /** Optional planned end time for the session */
    endsAt?: string;
    /** What the user said they would work on, shown on block screens */
    intention?: string;
    /** The user who owns this session */
    ownerId: string;
    review?: {
      /** What got done during the session */
      done?: string;
      /** One-line end-of-block review note */
      note?: string;
      /** When the session review was submitted */
      reviewedAt?: string;
    };
    /** When the end-of-block review prompt was skipped */
    reviewSkippedAt?: string;
    /** When the session started */
    startedAt: string;
    /** Whether the session is currently blocking (active) or finished (ended) */
    status: "active" | "ended";
    /** When this document was last updated */
    updated: string;
    /** When this document was created */
    created: string;
    /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
    deleted?: boolean;
    /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
    _syncPrevStream?: string;
    /** Monotonic per-stream sequence stamped on every synced write */
    _syncSeq?: number;
  }[];
  limit?: number;
  more?: boolean;
  page?: number;
  total?: number;
};
export type GetFocusSessionsArgs = {
  _id?: {
    $in?: string[];
  };
  status?:
    | ("active" | "ended")
    | {
        $in?: string[];
      };
  page?: number;
  sort?: string;
  limit?: number;
};
export type GetFocusSessionsByIdRes = /** status 200 Successful read */ {
  /** The document id (String so offline sync clients can mint ids) */
  _id: string;
  /** Normalized hostnames blocked while the session is active, e.g. youtube.com */
  blockedDomains?: string[];
  /** Blocklists selected when this session was started */
  blocklistIds?: string[];
  /** When the session was ended; unset while active */
  endedAt?: string;
  /** Optional planned end time for the session */
  endsAt?: string;
  /** What the user said they would work on, shown on block screens */
  intention?: string;
  /** The user who owns this session */
  ownerId: string;
  review?: {
    /** What got done during the session */
    done?: string;
    /** One-line end-of-block review note */
    note?: string;
    /** When the session review was submitted */
    reviewedAt?: string;
  };
  /** When the end-of-block review prompt was skipped */
  reviewSkippedAt?: string;
  /** When the session started */
  startedAt: string;
  /** Whether the session is currently blocking (active) or finished (ended) */
  status: "active" | "ended";
  /** When this document was last updated */
  updated: string;
  /** When this document was created */
  created: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
  /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
  _syncPrevStream?: string;
  /** Monotonic per-stream sequence stamped on every synced write */
  _syncSeq?: number;
};
export type GetFocusSessionsByIdArgs = string;
export type PatchFocusSessionsByIdRes = /** status 200 Successful update */ {
  /** The document id (String so offline sync clients can mint ids) */
  _id: string;
  /** Normalized hostnames blocked while the session is active, e.g. youtube.com */
  blockedDomains?: string[];
  /** Blocklists selected when this session was started */
  blocklistIds?: string[];
  /** When the session was ended; unset while active */
  endedAt?: string;
  /** Optional planned end time for the session */
  endsAt?: string;
  /** What the user said they would work on, shown on block screens */
  intention?: string;
  /** The user who owns this session */
  ownerId: string;
  review?: {
    /** What got done during the session */
    done?: string;
    /** One-line end-of-block review note */
    note?: string;
    /** When the session review was submitted */
    reviewedAt?: string;
  };
  /** When the end-of-block review prompt was skipped */
  reviewSkippedAt?: string;
  /** When the session started */
  startedAt: string;
  /** Whether the session is currently blocking (active) or finished (ended) */
  status: "active" | "ended";
  /** When this document was last updated */
  updated: string;
  /** When this document was created */
  created: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
  /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
  _syncPrevStream?: string;
  /** Monotonic per-stream sequence stamped on every synced write */
  _syncSeq?: number;
};
export type PatchFocusSessionsByIdArgs = {
  id: string;
  body: {
    /** The document id (String so offline sync clients can mint ids) */
    _id?: string;
    /** Normalized hostnames blocked while the session is active, e.g. youtube.com */
    blockedDomains?: string[];
    /** Blocklists selected when this session was started */
    blocklistIds?: string[];
    /** When the session was ended; unset while active */
    endedAt?: string;
    /** Optional planned end time for the session */
    endsAt?: string;
    /** What the user said they would work on, shown on block screens */
    intention?: string;
    /** The user who owns this session */
    ownerId?: string;
    review?: {
      /** What got done during the session */
      done?: string;
      /** One-line end-of-block review note */
      note?: string;
      /** When the session review was submitted */
      reviewedAt?: string;
    };
    /** When the end-of-block review prompt was skipped */
    reviewSkippedAt?: string;
    /** When the session started */
    startedAt?: string;
    /** Whether the session is currently blocking (active) or finished (ended) */
    status?: "active" | "ended";
    /** When this document was last updated */
    updated?: string;
    /** When this document was created */
    created?: string;
    /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
    deleted?: boolean;
    /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
    _syncPrevStream?: string;
    /** Monotonic per-stream sequence stamped on every synced write */
    _syncSeq?: number;
  };
};
export type PostParkingLotItemsRes = /** status 201 Successful create */ {
  /** The document id (String so it can be synced) */
  _id: string;
  /** The user who owns this parking lot item */
  ownerId: string;
  /** When the item was resolved; unset while open */
  resolvedAt?: string;
  /** The focus session where the item was captured */
  sessionId: string;
  /** Whether the item is still open or was resolved during review */
  status: "open" | "done" | "dismissed";
  /** The stray thought captured during focus */
  text: string;
  /** When this document was last updated */
  updated: string;
  /** When this document was created */
  created: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
  /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
  _syncPrevStream?: string;
  /** Monotonic per-stream sequence stamped on every synced write */
  _syncSeq?: number;
};
export type PostParkingLotItemsArgs = {
  /** The document id (String so it can be synced) */
  _id?: string;
  /** The user who owns this parking lot item */
  ownerId?: string;
  /** When the item was resolved; unset while open */
  resolvedAt?: string;
  /** The focus session where the item was captured */
  sessionId?: string;
  /** Whether the item is still open or was resolved during review */
  status?: "open" | "done" | "dismissed";
  /** The stray thought captured during focus */
  text?: string;
  /** When this document was last updated */
  updated?: string;
  /** When this document was created */
  created?: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
  /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
  _syncPrevStream?: string;
  /** Monotonic per-stream sequence stamped on every synced write */
  _syncSeq?: number;
};
export type GetParkingLotItemsRes = /** status 200 Successful list */ {
  data?: {
    /** The document id (String so it can be synced) */
    _id: string;
    /** The user who owns this parking lot item */
    ownerId: string;
    /** When the item was resolved; unset while open */
    resolvedAt?: string;
    /** The focus session where the item was captured */
    sessionId: string;
    /** Whether the item is still open or was resolved during review */
    status: "open" | "done" | "dismissed";
    /** The stray thought captured during focus */
    text: string;
    /** When this document was last updated */
    updated: string;
    /** When this document was created */
    created: string;
    /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
    deleted?: boolean;
    /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
    _syncPrevStream?: string;
    /** Monotonic per-stream sequence stamped on every synced write */
    _syncSeq?: number;
  }[];
  limit?: number;
  more?: boolean;
  page?: number;
  total?: number;
};
export type GetParkingLotItemsArgs = {
  _id?: {
    $in?: string[];
  };
  sessionId?:
    | string
    | {
        $in?: string[];
      };
  status?:
    | ("open" | "done" | "dismissed")
    | {
        $in?: string[];
      };
  page?: number;
  sort?: string;
  limit?: number;
};
export type GetParkingLotItemsByIdRes = /** status 200 Successful read */ {
  /** The document id (String so it can be synced) */
  _id: string;
  /** The user who owns this parking lot item */
  ownerId: string;
  /** When the item was resolved; unset while open */
  resolvedAt?: string;
  /** The focus session where the item was captured */
  sessionId: string;
  /** Whether the item is still open or was resolved during review */
  status: "open" | "done" | "dismissed";
  /** The stray thought captured during focus */
  text: string;
  /** When this document was last updated */
  updated: string;
  /** When this document was created */
  created: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
  /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
  _syncPrevStream?: string;
  /** Monotonic per-stream sequence stamped on every synced write */
  _syncSeq?: number;
};
export type GetParkingLotItemsByIdArgs = string;
export type PatchParkingLotItemsByIdRes = /** status 200 Successful update */ {
  /** The document id (String so it can be synced) */
  _id: string;
  /** The user who owns this parking lot item */
  ownerId: string;
  /** When the item was resolved; unset while open */
  resolvedAt?: string;
  /** The focus session where the item was captured */
  sessionId: string;
  /** Whether the item is still open or was resolved during review */
  status: "open" | "done" | "dismissed";
  /** The stray thought captured during focus */
  text: string;
  /** When this document was last updated */
  updated: string;
  /** When this document was created */
  created: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
  /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
  _syncPrevStream?: string;
  /** Monotonic per-stream sequence stamped on every synced write */
  _syncSeq?: number;
};
export type PatchParkingLotItemsByIdArgs = {
  id: string;
  body: {
    /** The document id (String so it can be synced) */
    _id?: string;
    /** The user who owns this parking lot item */
    ownerId?: string;
    /** When the item was resolved; unset while open */
    resolvedAt?: string;
    /** The focus session where the item was captured */
    sessionId?: string;
    /** Whether the item is still open or was resolved during review */
    status?: "open" | "done" | "dismissed";
    /** The stray thought captured during focus */
    text?: string;
    /** When this document was last updated */
    updated?: string;
    /** When this document was created */
    created?: string;
    /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
    deleted?: boolean;
    /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
    _syncPrevStream?: string;
    /** Monotonic per-stream sequence stamped on every synced write */
    _syncSeq?: number;
  };
};
export type UnlockgrantsPublicKeyRes = /** status 200 Successful response */ {
  data?: object;
};
export type UnlockgrantsPublicKeyArgs = undefined;
export type GetUnlockGrantsRes = /** status 200 Successful list */ {
  data?: {
    /** The document id (String so it can be synced) */
    _id: string;
    /** When the grant stops lifting the block; clients relock at this time */
    expiresAt: string;
    /** When the server issued and signed the grant */
    issuedAt: string;
    /** The user the grant was issued to */
    ownerId: string;
    /** Signed grant payload: base64url of the canonical JSON (contract version v) */
    payload: string;
    /** Why the grant was issued (peek = timed unlock) */
    reason: "peek";
    /** The focus session whose block this grant lifts */
    sessionId: string;
    /** Ed25519 signature over the payload bytes, base64url */
    signature: string;
    /** When this document was last updated */
    updated: string;
    /** When this document was created */
    created: string;
    /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
    deleted?: boolean;
    /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
    _syncPrevStream?: string;
    /** Monotonic per-stream sequence stamped on every synced write */
    _syncSeq?: number;
  }[];
  limit?: number;
  more?: boolean;
  page?: number;
  total?: number;
};
export type GetUnlockGrantsArgs = {
  _id?: {
    $in?: string[];
  };
  sessionId?:
    | string
    | {
        $in?: string[];
      };
  page?: number;
  sort?: string;
  limit?: number;
};
export type GetUnlockGrantsByIdRes = /** status 200 Successful read */ {
  /** The document id (String so it can be synced) */
  _id: string;
  /** When the grant stops lifting the block; clients relock at this time */
  expiresAt: string;
  /** When the server issued and signed the grant */
  issuedAt: string;
  /** The user the grant was issued to */
  ownerId: string;
  /** Signed grant payload: base64url of the canonical JSON (contract version v) */
  payload: string;
  /** Why the grant was issued (peek = timed unlock) */
  reason: "peek";
  /** The focus session whose block this grant lifts */
  sessionId: string;
  /** Ed25519 signature over the payload bytes, base64url */
  signature: string;
  /** When this document was last updated */
  updated: string;
  /** When this document was created */
  created: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
  /** The document's previous sync stream, set when a write moved it between scopes; null when the last write did not move it */
  _syncPrevStream?: string;
  /** Monotonic per-stream sequence stamped on every synced write */
  _syncSeq?: number;
};
export type GetUnlockGrantsByIdArgs = string;
export type DevicesessionsRevokeRes = /** status 200 Successful response */ {
  data?: object;
};
export type DevicesessionsRevokeArgs = string;
export type DevicesessionsIssueRes = /** status 200 Successful response */ {
  data?: object;
};
export type DevicesessionsIssueArgs = {
  client: "mac";
  name?: string;
  redirect: string;
  state: string;
};
export type GetDeviceSessionsRes = /** status 200 Successful list */ {
  data?: {
    /** Id of the Better Auth session issued to the device (not the token) */
    betterAuthSessionId: string;
    /** Which native client this is */
    client: "mac";
    /** Display name the device reported, e.g. the Mac's computer name */
    name?: string;
    /** The user the device is signed in as */
    ownerId: string;
    /** When the owner revoked the device; its token stops working immediately */
    revokedAt?: string;
    _id: string;
    /** When this document was last updated */
    updated: string;
    /** When this document was created */
    created: string;
    /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
    deleted?: boolean;
  }[];
  limit?: number;
  more?: boolean;
  page?: number;
  total?: number;
};
export type GetDeviceSessionsArgs = {
  _id?: {
    $in?: string[];
  };
  page?: number;
  sort?: string;
  limit?: number;
};
export type GetDeviceSessionsByIdRes = /** status 200 Successful read */ {
  /** Id of the Better Auth session issued to the device (not the token) */
  betterAuthSessionId: string;
  /** Which native client this is */
  client: "mac";
  /** Display name the device reported, e.g. the Mac's computer name */
  name?: string;
  /** The user the device is signed in as */
  ownerId: string;
  /** When the owner revoked the device; its token stops working immediately */
  revokedAt?: string;
  _id: string;
  /** When this document was last updated */
  updated: string;
  /** When this document was created */
  created: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
};
export type GetDeviceSessionsByIdArgs = string;
export type GetAdminConfigRes = /** status 200 Success */ {
  capabilities?: {
    actions?: boolean;
    fieldsets?: boolean;
    filters?: boolean;
    realtime?: boolean;
  };
  customScreens?: {
    description?: string;
    displayName?: string;
    group?: string;
    icon?: string;
    name?: string;
  }[];
  home?: object;
  models?: any;
  platformTools?: {
    configuration?: boolean;
    roles?: boolean;
    runScripts?: boolean;
    scripts?: boolean;
    version?: boolean;
    viewScripts?: boolean;
  };
  schemaVersion?: number;
  scripts?: {
    args?: any;
    description?: string;
    name?: string;
  }[];
  widgetIds?: string[];
};
export type GetAdminConfigArgs = undefined;
export type PostAdminBackgroundTasksRes = /** status 201 Success */ {
  taskId?: string;
};
export type PostAdminBackgroundTasksArgs = {
  /** Optional target document ids */
  ids?: string[];
  /** Task kind label persisted as taskType */
  kind: string;
  /** Opaque JSON metadata for workers */
  metadata?: object;
  /** Optional admin model route this task relates to */
  resourceRoute?: string;
};
export type PostAdminUsersBulkPatchRes = /** status 200 Success */ {
  failures?: any;
  updated?: number;
};
export type PostAdminUsersBulkPatchArgs = {
  /** Document ids to update */
  ids: string[];
  /** Partial document; keys must be allowlisted for this model */
  patch: object;
};
export type PostAdminUsersRes = /** status 201 Successful create */ {
  /** Whether the user has administrator access */
  admin?: boolean;
  /** Identifier linking to the Better Auth session provider */
  betterAuthId?: string;
  /** The user's email address, used for authentication */
  email: string;
  /** The user's display name */
  name: string;
  /** When the user's starter blocklists were first seeded */
  starterBlocklistsSeededAt?: string;
  /** IANA timezone used for profile-local week boundaries */
  timezone?: string;
  /** Day that starts the user's focus week, Sunday = 0 */
  weekStartDay?: number;
  _id: string;
  hash?: string;
  salt?: string;
  /** When this document was last updated */
  updated: string;
  /** When this document was created */
  created: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
};
export type PostAdminUsersArgs = {
  /** Whether the user has administrator access */
  admin?: boolean;
  /** Identifier linking to the Better Auth session provider */
  betterAuthId?: string;
  /** The user's email address, used for authentication */
  email?: string;
  /** The user's display name */
  name?: string;
  /** When the user's starter blocklists were first seeded */
  starterBlocklistsSeededAt?: string;
  /** IANA timezone used for profile-local week boundaries */
  timezone?: string;
  /** Day that starts the user's focus week, Sunday = 0 */
  weekStartDay?: number;
  _id?: string;
  hash?: string;
  salt?: string;
  /** When this document was last updated */
  updated?: string;
  /** When this document was created */
  created?: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
};
export type GetAdminUsersRes = /** status 200 Successful list */ {
  data?: {
    /** Whether the user has administrator access */
    admin?: boolean;
    /** Identifier linking to the Better Auth session provider */
    betterAuthId?: string;
    /** The user's email address, used for authentication */
    email: string;
    /** The user's display name */
    name: string;
    /** When the user's starter blocklists were first seeded */
    starterBlocklistsSeededAt?: string;
    /** IANA timezone used for profile-local week boundaries */
    timezone?: string;
    /** Day that starts the user's focus week, Sunday = 0 */
    weekStartDay?: number;
    _id: string;
    hash?: string;
    salt?: string;
    /** When this document was last updated */
    updated: string;
    /** When this document was created */
    created: string;
    /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
    deleted?: boolean;
  }[];
  limit?: number;
  more?: boolean;
  page?: number;
  total?: number;
};
export type GetAdminUsersArgs = {
  _id?: {
    $in?: string[];
  };
  q?:
    | any
    | {
        $in?: any[];
      };
  email?:
    | string
    | {
        $in?: string[];
      };
  name?:
    | string
    | {
        $in?: string[];
      };
  admin?:
    | boolean
    | {
        $in?: boolean[];
      };
  created?:
    | string
    | {
        /** When this document was created */
        $gt?: string;
        /** When this document was created */
        $gte?: string;
        /** When this document was created */
        $lt?: string;
        /** When this document was created */
        $lte?: string;
      };
  page?: number;
  sort?: string;
  limit?: number;
};
export type GetAdminUsersByIdRes = /** status 200 Successful read */ {
  /** Whether the user has administrator access */
  admin?: boolean;
  /** Identifier linking to the Better Auth session provider */
  betterAuthId?: string;
  /** The user's email address, used for authentication */
  email: string;
  /** The user's display name */
  name: string;
  /** When the user's starter blocklists were first seeded */
  starterBlocklistsSeededAt?: string;
  /** IANA timezone used for profile-local week boundaries */
  timezone?: string;
  /** Day that starts the user's focus week, Sunday = 0 */
  weekStartDay?: number;
  _id: string;
  hash?: string;
  salt?: string;
  /** When this document was last updated */
  updated: string;
  /** When this document was created */
  created: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
};
export type GetAdminUsersByIdArgs = string;
export type PatchAdminUsersByIdRes = /** status 200 Successful update */ {
  /** Whether the user has administrator access */
  admin?: boolean;
  /** Identifier linking to the Better Auth session provider */
  betterAuthId?: string;
  /** The user's email address, used for authentication */
  email: string;
  /** The user's display name */
  name: string;
  /** When the user's starter blocklists were first seeded */
  starterBlocklistsSeededAt?: string;
  /** IANA timezone used for profile-local week boundaries */
  timezone?: string;
  /** Day that starts the user's focus week, Sunday = 0 */
  weekStartDay?: number;
  _id: string;
  hash?: string;
  salt?: string;
  /** When this document was last updated */
  updated: string;
  /** When this document was created */
  created: string;
  /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
  deleted?: boolean;
};
export type PatchAdminUsersByIdArgs = {
  id: string;
  body: {
    /** Whether the user has administrator access */
    admin?: boolean;
    /** Identifier linking to the Better Auth session provider */
    betterAuthId?: string;
    /** The user's email address, used for authentication */
    email?: string;
    /** The user's display name */
    name?: string;
    /** When the user's starter blocklists were first seeded */
    starterBlocklistsSeededAt?: string;
    /** IANA timezone used for profile-local week boundaries */
    timezone?: string;
    /** Day that starts the user's focus week, Sunday = 0 */
    weekStartDay?: number;
    _id?: string;
    hash?: string;
    salt?: string;
    /** When this document was last updated */
    updated?: string;
    /** When this document was created */
    created?: string;
    /** Deleted objects are not returned in any find() or findOne() by default. Add {deleted: true} to find them. */
    deleted?: boolean;
  };
};
export type DeleteAdminUsersByIdRes = unknown;
export type DeleteAdminUsersByIdArgs = string;
export type AdminMigrationsRunRes = /** status 201 Successful response */ {
  data?: object;
};
export type AdminMigrationsRunArgs = ("true" | "false") | undefined;
export type AdminMigrationsStatusRes = /** status 200 Successful response */ {
  data?: object;
};
export type AdminMigrationsStatusArgs = undefined;
export type PostOrgsRes = unknown;
export type PostOrgsArgs = {
  /** Organization name */
  name: string;
  /** App-defined organization settings */
  settings?: object;
};
export type GetOrgsRes = unknown;
export type GetOrgsArgs = undefined;
export type GetOrgsMineRes = unknown;
export type GetOrgsMineArgs = undefined;
export type GetOrgsByIdRes = unknown;
export type GetOrgsByIdArgs = string;
export type PatchOrgsByIdRes = unknown;
export type PatchOrgsByIdArgs = {
  id: string;
  body: {
    /** Disable the organization */
    disabled?: boolean;
    /** Organization name */
    name?: string;
    /** App-defined organization settings */
    settings?: object;
  };
};
export type DeleteOrgsByIdRes = unknown;
export type DeleteOrgsByIdArgs = string;
export type GetOrgsByIdMembersRes = unknown;
export type GetOrgsByIdMembersArgs = string;
export type PostOrgsByIdMembersRes = unknown;
export type PostOrgsByIdMembersArgs = {
  id: string;
  body: {
    /** Existing user email */
    email?: string;
    /** Membership role */
    roleName?: string;
    /** Existing user id */
    userId?: string;
  };
};
export type PatchOrgsByIdMembersAndMemberIdRes = unknown;
export type PatchOrgsByIdMembersAndMemberIdArgs = {
  id: string;
  memberId: string;
  body: {
    /** Membership role */
    roleName?: string;
    /** Membership status */
    status?: string;
  };
};
export type DeleteOrgsByIdMembersAndMemberIdRes = unknown;
export type DeleteOrgsByIdMembersAndMemberIdArgs = {
  id: string;
  memberId: string;
};
export type ApiError = {
  /** An application-specific error code, expressed as a string value. */
  code?: string;
  /** A human-readable explanation specific to this occurrence of the problem. Like title, this field’s value can be localized. */
  detail?: string;
  /** A unique identifier for this particular occurrence of the problem. */
  id?: string;
  links?: {
    /** A link that leads to further details about this particular occurrence of the problem. When derefenced, this URI SHOULD return a human-readable description of the error. */
    about?: string;
    /** A link that identifies the type of error that this particular error is an instance of. This URI SHOULD be dereferencable to a human-readable explanation of the general error. */
    type?: string;
  };
  /** A meta object containing non-standard meta-information about the error. */
  meta?: object;
  source?: {
    /** A string indicating the name of a single request header which caused the error. */
    header?: string;
    /** A string indicating which URI query parameter caused the error. */
    parameter?: string;
    /** A JSON Pointer [RFC6901] to the associated entity in the request document [e.g. "/data" for a primary data object, or "/data/attributes/title" for a specific attribute]. */
    pointer?: string;
  };
  /** The HTTP status code applicable to this problem, expressed as a string value. */
  status?: number;
  /** The error message */
  title?: string;
};
export const {
  usePostUsersMutation,
  useGetUsersQuery,
  useGetUsersByIdQuery,
  usePatchUsersByIdMutation,
  useDeleteUsersByIdMutation,
  useBlocklistsStarterMutation,
  usePostBlocklistsMutation,
  useGetBlocklistsQuery,
  useGetBlocklistsByIdQuery,
  usePatchBlocklistsByIdMutation,
  useDeleteBlocklistsByIdMutation,
  useFocussessionsEndMutation,
  useFocussessionsGrantsMutation,
  useFocussessionsReviewMutation,
  usePostFocusSessionsMutation,
  useGetFocusSessionsQuery,
  useGetFocusSessionsByIdQuery,
  usePatchFocusSessionsByIdMutation,
  usePostParkingLotItemsMutation,
  useGetParkingLotItemsQuery,
  useGetParkingLotItemsByIdQuery,
  usePatchParkingLotItemsByIdMutation,
  useUnlockgrantsPublicKeyQuery,
  useGetUnlockGrantsQuery,
  useGetUnlockGrantsByIdQuery,
  useDevicesessionsRevokeMutation,
  useDevicesessionsIssueMutation,
  useGetDeviceSessionsQuery,
  useGetDeviceSessionsByIdQuery,
  useGetAdminConfigQuery,
  usePostAdminBackgroundTasksMutation,
  usePostAdminUsersBulkPatchMutation,
  usePostAdminUsersMutation,
  useGetAdminUsersQuery,
  useGetAdminUsersByIdQuery,
  usePatchAdminUsersByIdMutation,
  useDeleteAdminUsersByIdMutation,
  useAdminMigrationsRunMutation,
  useAdminMigrationsStatusQuery,
  usePostOrgsMutation,
  useGetOrgsQuery,
  useGetOrgsMineQuery,
  useGetOrgsByIdQuery,
  usePatchOrgsByIdMutation,
  useDeleteOrgsByIdMutation,
  useGetOrgsByIdMembersQuery,
  usePostOrgsByIdMembersMutation,
  usePatchOrgsByIdMembersAndMemberIdMutation,
  useDeleteOrgsByIdMembersAndMemberIdMutation,
} = injectedRtkApi;
