import {
  APIError,
  asyncHandler,
  authenticateMiddleware,
  modelRouter,
  OwnerQueryFilter,
  Permissions,
  z,
} from "@terreno/api";
import mongoose from "mongoose";
import {Blocklist} from "../models/blocklist";
import {FocusSession} from "../models/focusSession";
import {ParkingLotItem} from "../models/parkingLotItem";
import {UnlockGrant} from "../models/unlockGrant";
import type {BlocklistDocument} from "../types/models/blocklistTypes";
import type {FocusSessionDocument} from "../types/models/focusSessionTypes";
import type {ParkingLotItemDocument} from "../types/models/parkingLotItemTypes";
import type {UserDocument} from "../types/models/userTypes";
import {normalizeDomains} from "../utils/domains";
import {signGrant} from "../utils/grantSigning";

const MIN_GRANT_MINUTES = 1;
const MAX_GRANT_MINUTES = 30;

const grantBodySchema = z
  .object({
    minutes: z.number(),
    reason: z.enum(["peek"]).optional(),
  })
  .strict();

const reviewItemSchema = z
  .object({
    id: z.string().min(1),
    status: z.enum(["open", "done", "dismissed"]),
  })
  .strict();

const reviewBodySchema = z
  .object({
    done: z.string().max(280).default(""),
    items: z.array(reviewItemSchema).default([]),
    note: z.string().max(280).default(""),
  })
  .strict();

type ReviewBody = z.infer<typeof reviewBodySchema>;

const ensureReviewable = (session: FocusSessionDocument): void => {
  if (session.status !== "ended") {
    throw new APIError({status: 409, title: "Session has not ended"});
  }
  if (session.review?.reviewedAt || session.reviewSkippedAt) {
    throw new APIError({status: 409, title: "Session review is already complete"});
  }
};

const applyReviewItems = async (
  session: FocusSessionDocument,
  items: ReviewBody["items"]
): Promise<void> => {
  if (items.length === 0) {
    return;
  }
  const uniqueIds = Array.from(new Set(items.map((item) => item.id)));
  if (uniqueIds.length !== items.length) {
    throw new APIError({
      fields: {items: "Each parking lot item can be reviewed once"},
      status: 400,
      title: "Invalid review items",
    });
  }
  const existingItems = await ParkingLotItem.find({
    _id: {$in: uniqueIds},
    deleted: false,
    ownerId: session.ownerId,
  }).exec();
  if (existingItems.length !== uniqueIds.length) {
    throw new APIError({
      fields: {items: "Choose parking lot items from your account"},
      status: 400,
      title: "Invalid review items",
    });
  }
  const byId = new Map(existingItems.map((item) => [item._id, item]));
  const now = new Date();
  await Promise.all(
    items.map(async (reviewItem) => {
      const item = byId.get(reviewItem.id) as ParkingLotItemDocument;
      item.status = reviewItem.status;
      item.resolvedAt = reviewItem.status === "open" ? undefined : now;
      await item.save();
    })
  );
};

const submitReview = async (
  session: FocusSessionDocument,
  body: ReviewBody
): Promise<FocusSessionDocument> => {
  ensureReviewable(session);
  await applyReviewItems(session, body.items);
  session.review = {
    done: body.done.trim(),
    note: body.note.trim(),
    reviewedAt: new Date(),
  };
  await session.save();
  return session;
};

const skipReview = async (session: FocusSessionDocument): Promise<FocusSessionDocument> => {
  ensureReviewable(session);
  session.reviewSkippedAt = new Date();
  await session.save();
  return session;
};

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

const cleanBlocklistIds = (value: unknown): string[] => {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new APIError({
      fields: {blocklistIds: "Blocklist ids must be an array"},
      status: 400,
      title: "Invalid blocklists",
    });
  }
  return Array.from(
    new Set(
      value.map((id) => {
        const blocklistId = typeof id === "string" ? id.trim() : "";
        if (!blocklistId) {
          throw new APIError({
            fields: {blocklistIds: "Blocklist ids must be non-empty strings"},
            status: 400,
            title: "Invalid blocklists",
          });
        }
        return blocklistId;
      })
    )
  );
};

const domainsFromSelectedBlocklists = async (
  blocklistIds: string[],
  ownerId: UserDocument["_id"] | undefined
): Promise<string[]> => {
  if (blocklistIds.length === 0) {
    return [];
  }
  const blocklists = await Blocklist.find({
    _id: {$in: blocklistIds},
    deleted: false,
    ownerId,
  }).exec();
  if (blocklists.length !== blocklistIds.length) {
    throw new APIError({
      fields: {blocklistIds: "Choose blocklists from your account"},
      status: 400,
      title: "Invalid blocklists",
    });
  }
  const byId = new Map(blocklists.map((blocklist) => [blocklist._id, blocklist]));
  return blocklistIds.flatMap((id) => (byId.get(id) as BlocklistDocument).domains);
};

const cleanStartDomains = async (
  value: Partial<FocusSessionDocument>,
  ownerId: UserDocument["_id"] | undefined
): Promise<{blockedDomains: string[]; blocklistIds: string[]}> => {
  const blocklistIds = cleanBlocklistIds(value.blocklistIds);
  const listDomains = await domainsFromSelectedBlocklists(blocklistIds, ownerId);
  if (value.blockedDomains === undefined) {
    if (listDomains.length === 0) {
      return {blockedDomains: cleanDomains(undefined), blocklistIds};
    }
    return {blockedDomains: cleanDomains(listDomains), blocklistIds};
  }
  if (!Array.isArray(value.blockedDomains)) {
    return {blockedDomains: cleanDomains(value.blockedDomains), blocklistIds};
  }
  return {
    blockedDomains: cleanDomains([...listDomains, ...value.blockedDomains]),
    blocklistIds,
  };
};

export const focusSessionRouter = modelRouter("/focusSessions", FocusSession, {
  endpoints: (router) => {
    router.post(
      "/:id/review/skip",
      authenticateMiddleware(),
      asyncHandler(async (req, res) => {
        const ownerId = (req as unknown as {user?: UserDocument}).user?._id;
        const session = await FocusSession.findOne({
          _id: req.params.id,
          deleted: false,
          ownerId,
        });
        if (!session) {
          throw new APIError({status: 404, title: "Document not found"});
        }
        const skipped = await skipReview(session);
        return res.json({data: skipped.toJSON()});
      })
    );
  },
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
    grants: {
      body: grantBodySchema,
      handler: async ({body, doc}) => {
        const session = doc as FocusSessionDocument;
        if (session.status !== "active") {
          throw new APIError({status: 409, title: "Session has ended"});
        }
        const {minutes, reason} = body as z.infer<typeof grantBodySchema>;
        const clamped = Math.min(
          MAX_GRANT_MINUTES,
          Math.max(MIN_GRANT_MINUTES, Math.round(minutes))
        );
        const grantId = new mongoose.Types.ObjectId().toHexString();
        const issuedAt = new Date();
        const expiresAt = new Date(issuedAt.getTime() + clamped * 60 * 1000);
        const signed = signGrant({
          expiresAt: expiresAt.toISOString(),
          grantId,
          issuedAt: issuedAt.toISOString(),
          scope: "all",
          sessionId: session._id,
          userId: String(session.ownerId),
          v: 1,
        });
        return UnlockGrant.create({
          _id: grantId,
          expiresAt,
          issuedAt,
          ownerId: session.ownerId,
          payload: signed.payload,
          reason: reason ?? "peek",
          sessionId: session._id,
          signature: signed.signature,
        });
      },
      method: "POST",
      permissions: [Permissions.IsOwner],
      summary: "Issue a signed, expiring unlock grant for an active session",
    },
    review: {
      body: reviewBodySchema,
      handler: async ({body, doc}) => submitReview(doc as FocusSessionDocument, body as ReviewBody),
      method: "POST",
      permissions: [Permissions.IsOwner],
      summary: "Review an ended focus session and resolve parking lot items",
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
    const {blockedDomains, blocklistIds} = await cleanStartDomains(value, ownerId);
    const active = await FocusSession.findOne({deleted: false, ownerId, status: "active"});
    if (active) {
      throw new APIError({status: 409, title: "A focus session is already active"});
    }
    // Build the document from an allowlist: everything else (status, deleted, endedAt,
    // sync metadata) is server-controlled, including when the write arrives over sync.
    return {
      ...(value._id ? {_id: value._id} : {}),
      blockedDomains,
      blocklistIds,
      ...(value.endsAt !== undefined ? {endsAt: value.endsAt} : {}),
      ...(value.intention !== undefined ? {intention: value.intention} : {}),
      ownerId,
      startedAt: new Date(),
      status: "active",
    } as FocusSessionDocument;
  },
  preUpdate: (body) => {
    const value = (body ?? {}) as Partial<FocusSessionDocument>;
    // Owners may change only these fields. Ending and review go through actions, and
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
    excludeFromCreate: ["ownerId", "status", "startedAt", "endedAt", "review", "reviewSkippedAt"],
    excludeFromUpdate: [
      "ownerId",
      "status",
      "startedAt",
      "endedAt",
      "blocklistIds",
      "review",
      "reviewSkippedAt",
    ],
    validateCreate: true,
    validateQuery: true,
    validateUpdate: true,
  },
});
