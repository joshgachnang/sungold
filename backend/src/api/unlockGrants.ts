import {modelRouter, OwnerQueryFilter, Permissions} from "@terreno/api";
import {UnlockGrant} from "../models/unlockGrant";
import {getGrantPublicKey} from "../utils/grantSigning";

// Grants are created only by POST /focusSessions/:id/grants. This router exposes them
// read-only to their owner and syncs them to the owner's devices.
export const unlockGrantRouter = modelRouter("/unlockGrants", UnlockGrant, {
  // Lets the public key be fetched without signing in; every other route still requires
  // an authenticated owner through its permissions below.
  allowAnonymous: true,
  collectionActions: {
    publicKey: {
      handler: () => ({algorithm: "Ed25519", publicKey: getGrantPublicKey()}),
      method: "GET",
      permissions: [Permissions.IsAny],
      summary: "Ed25519 public key clients use to verify unlock grants",
    },
  },
  permissions: {
    create: [],
    delete: [],
    list: [Permissions.IsAuthenticated],
    read: [Permissions.IsOwner],
    update: [],
  },
  queryFields: ["sessionId"],
  queryFilter: OwnerQueryFilter,
  sort: "-created",
  // Local-first sync (@terreno/syncdb): stream = unlockGrants|owner:{ownerId}.
  sync: {scope: {type: "owner"}},
});
