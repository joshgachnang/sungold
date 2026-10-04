import {syncPlugin} from "@terreno/api";
import mongoose from "mongoose";
import type {BlocklistDocument, BlocklistModel} from "../types/models/blocklistTypes";
import {addDefaultPlugins} from "./modelPlugins";

const blocklistSchema = new mongoose.Schema<BlocklistDocument, BlocklistModel>(
  {
    _id: {
      default: (): string => new mongoose.Types.ObjectId().toHexString(),
      description: "The document id (String so offline sync clients can mint ids)",
      type: String,
    },
    domains: {
      default: [],
      description: "Normalized hostnames included in this blocklist",
      type: [String],
      validate: {
        message: "A blocklist must have between 1 and 200 domains",
        validator: (domains: string[]): boolean => domains.length >= 1 && domains.length <= 200,
      },
    },
    name: {
      description: "The user-visible blocklist name",
      maxlength: 60,
      minlength: 1,
      required: true,
      trim: true,
      type: String,
    },
    ownerId: {
      description: "The user who owns this blocklist",
      ref: "User",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    source: {
      default: "user",
      description: "Whether this blocklist started from a preset or was created by the user",
      enum: ["starter", "user"],
      required: true,
      type: String,
    },
    starterKey: {
      description: "Stable preset key used to make starter blocklist seeding idempotent",
      type: String,
    },
  },
  {strict: "throw", toJSON: {virtuals: true}, toObject: {virtuals: true}}
);

blocklistSchema.index(
  {ownerId: 1, starterKey: 1},
  {partialFilterExpression: {deleted: false, source: "starter"}, unique: true}
);

addDefaultPlugins(blocklistSchema);
// Stamps a per-stream _syncSeq on every write; required by the router's sync config.
blocklistSchema.plugin(syncPlugin);

export const Blocklist = mongoose.model<BlocklistDocument, BlocklistModel>(
  "Blocklist",
  blocklistSchema
);
