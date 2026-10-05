import {APIError, modelRouter, OwnerQueryFilter, Permissions} from "@terreno/api";
import {FocusSession} from "../models/focusSession";
import {ParkingLotItem} from "../models/parkingLotItem";
import type {ParkingLotItemDocument} from "../types/models/parkingLotItemTypes";
import type {UserDocument} from "../types/models/userTypes";

const ownerIdFrom = (req: unknown): UserDocument["_id"] | undefined =>
  (req as {user?: UserDocument}).user?._id;

const cleanText = (value: unknown): string => {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length < 1 || text.length > 280) {
    throw new APIError({
      fields: {text: "Text must be between 1 and 280 characters"},
      status: 400,
      title: "Invalid parking lot text",
    });
  }
  return text;
};

const cleanStatus = (value: unknown): ParkingLotItemDocument["status"] => {
  if (value === "open" || value === "done" || value === "dismissed") {
    return value;
  }
  throw new APIError({
    fields: {status: "Status must be open, done, or dismissed"},
    status: 400,
    title: "Invalid parking lot status",
  });
};

const activeSessionForCreate = async (
  sessionId: unknown,
  ownerId: UserDocument["_id"] | undefined
): Promise<string> => {
  const id = typeof sessionId === "string" ? sessionId : "";
  if (!id) {
    throw new APIError({
      fields: {sessionId: "Choose an active focus session"},
      status: 400,
      title: "Invalid focus session",
    });
  }
  const session = await FocusSession.findOne({
    _id: id,
    deleted: false,
    ownerId,
    status: "active",
  });
  if (!session) {
    throw new APIError({
      fields: {sessionId: "Choose an active focus session from your account"},
      status: 400,
      title: "Invalid focus session",
    });
  }
  return session._id;
};

export const parkingLotItemRouter = modelRouter("/parkingLotItems", ParkingLotItem, {
  permissions: {
    create: [Permissions.IsAuthenticated],
    delete: [],
    list: [Permissions.IsAuthenticated],
    read: [Permissions.IsOwner],
    update: [Permissions.IsOwner],
  },
  preCreate: async (body, req) => {
    const ownerId = ownerIdFrom(req);
    const value = (body ?? {}) as Partial<ParkingLotItemDocument>;
    return {
      ...(value._id ? {_id: value._id} : {}),
      ownerId,
      sessionId: await activeSessionForCreate(value.sessionId, ownerId),
      status: "open",
      text: cleanText(value.text),
    } as ParkingLotItemDocument;
  },
  preUpdate: (body) => {
    const value = (body ?? {}) as Partial<ParkingLotItemDocument>;
    const update: Partial<ParkingLotItemDocument> = {};
    if (value.status !== undefined) {
      update.status = cleanStatus(value.status);
      update.resolvedAt = update.status === "open" ? undefined : new Date();
    }
    return update as ParkingLotItemDocument;
  },
  queryFields: ["sessionId", "status"],
  queryFilter: OwnerQueryFilter,
  sort: "-created",
  // Local-first sync (@terreno/syncdb): stream = parkingLotItems|owner:{ownerId}.
  sync: {scope: {type: "owner"}},
  validation: {
    excludeFromCreate: ["ownerId", "status", "resolvedAt"],
    excludeFromUpdate: ["ownerId", "sessionId", "text", "resolvedAt"],
    validateCreate: true,
    validateQuery: true,
    validateUpdate: true,
  },
});
