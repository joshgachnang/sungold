import {APIError, modelRouter, OwnerQueryFilter, Permissions} from "@terreno/api";
import {FocusSession} from "../models/focusSession";
import type {FocusSessionDocument} from "../types/models/focusSessionTypes";
import type {UserDocument} from "../types/models/userTypes";
import {normalizeDomains} from "../utils/domains";

const cleanDomains = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new APIError({
      fields: {blockedDomains: "At least one domain is required"},
      status: 400,
      title: "At least one domain is required",
    });
  }
  const {domains, invalid} = normalizeDomains(value.map(String));
  if (invalid.length > 0) {
    throw new APIError({
      fields: {blockedDomains: `Invalid domains: ${invalid.join(", ")}`},
      status: 400,
      title: "Invalid domains",
    });
  }
  return domains;
};

export const focusSessionRouter = modelRouter("/focusSessions", FocusSession, {
  instanceActions: {
    end: {
      handler: async ({doc}) => {
        const session = doc as FocusSessionDocument;
        if (session.status !== "active") {
          throw new APIError({status: 409, title: "Session has already ended"});
        }
        session.status = "ended";
        session.endedAt = new Date();
        await session.save();
        return session;
      },
      method: "POST",
      permissions: [Permissions.IsOwner],
      summary: "End an active focus session",
    },
  },
  permissions: {
    create: [Permissions.IsAuthenticated],
    delete: [],
    list: [Permissions.IsAuthenticated],
    read: [Permissions.IsOwner],
    update: [Permissions.IsOwner],
  },
  preCreate: async (body, req) => {
    const ownerId = (req as unknown as {user?: UserDocument}).user?._id;
    const value = (body ?? {}) as Partial<FocusSessionDocument>;
    const blockedDomains = cleanDomains(value.blockedDomains);
    const active = await FocusSession.findOne({deleted: false, ownerId, status: "active"});
    if (active) {
      throw new APIError({status: 409, title: "A focus session is already active"});
    }
    // Build the document from an allowlist: everything else (status, deleted, endedAt,
    // sync metadata) is server-controlled, including when the write arrives over sync.
    return {
      ...(value._id ? {_id: value._id} : {}),
      blockedDomains,
      ...(value.endsAt !== undefined ? {endsAt: value.endsAt} : {}),
      ...(value.intention !== undefined ? {intention: value.intention} : {}),
      ownerId,
      startedAt: new Date(),
      status: "active",
    } as FocusSessionDocument;
  },
  preUpdate: (body) => {
    const value = (body ?? {}) as Partial<FocusSessionDocument>;
    // Owners may change only these fields. Ending goes through the `end` action, and
    // sessions cannot be deleted (including by setting `deleted`).
    const update: Partial<FocusSessionDocument> = {};
    if (value.blockedDomains !== undefined) {
      update.blockedDomains = cleanDomains(value.blockedDomains);
    }
    if (value.intention !== undefined) {
      update.intention = value.intention;
    }
    if (value.endsAt !== undefined) {
      update.endsAt = value.endsAt;
    }
    return update as FocusSessionDocument;
  },
  queryFields: ["status"],
  queryFilter: OwnerQueryFilter,
  sort: "-created",
  // Local-first sync (@terreno/syncdb): stream = focusSessions|owner:{ownerId}.
  sync: {scope: {type: "owner"}},
  validation: {
    excludeFromCreate: ["ownerId", "status", "startedAt", "endedAt"],
    excludeFromUpdate: ["ownerId", "status", "startedAt", "endedAt"],
    validateCreate: true,
    validateQuery: true,
    validateUpdate: true,
  },
});
