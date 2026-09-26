import {syncPlugin} from "@terreno/api";
import mongoose from "mongoose";
import type {UnlockGrantDocument, UnlockGrantModel} from "../types/models/unlockGrantTypes";
import {addDefaultPlugins} from "./modelPlugins";

const unlockGrantSchema = new mongoose.Schema<UnlockGrantDocument, UnlockGrantModel>(
  {
    _id: {
      default: (): string => new mongoose.Types.ObjectId().toHexString(),
      description: "The document id (String so it can be synced)",
      type: String,
    },
    expiresAt: {
      description: "When the grant stops lifting the block; clients relock at this time",
      required: true,
      type: Date,
    },
    issuedAt: {
      description: "When the server issued and signed the grant",
      required: true,
      type: Date,
    },
    ownerId: {
      description: "The user the grant was issued to",
      ref: "User",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    payload: {
      description: "Signed grant payload: base64url of the canonical JSON (contract version v)",
      required: true,
      type: String,
    },
    reason: {
      description: "Why the grant was issued (peek = timed unlock)",
      enum: ["peek"],
      required: true,
      type: String,
    },
    sessionId: {
      description: "The focus session whose block this grant lifts",
      ref: "FocusSession",
      required: true,
      type: String,
    },
    signature: {
      description: "Ed25519 signature over the payload bytes, base64url",
      required: true,
      type: String,
    },
  },
  {strict: "throw", toJSON: {virtuals: true}, toObject: {virtuals: true}}
);

addDefaultPlugins(unlockGrantSchema);
// Stamps a per-stream _syncSeq on every write; required by the router's sync config.
unlockGrantSchema.plugin(syncPlugin);

export const UnlockGrant = mongoose.model<UnlockGrantDocument, UnlockGrantModel>(
  "UnlockGrant",
  unlockGrantSchema
);
