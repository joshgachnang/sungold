import {APIError, syncPlugin} from "@terreno/api";
import mongoose from "mongoose";
import type {FocusSessionDocument, FocusSessionModel} from "../types/models/focusSessionTypes";
import {addDefaultPlugins} from "./modelPlugins";

const focusSessionSchema = new mongoose.Schema<FocusSessionDocument, FocusSessionModel>(
  {
    _id: {
      default: (): string => new mongoose.Types.ObjectId().toHexString(),
      description: "The document id (String so offline sync clients can mint ids)",
      type: String,
    },
    blockedDomains: {
      default: [],
      description: "Normalized hostnames blocked while the session is active, e.g. youtube.com",
      type: [String],
    },
    blocklistIds: {
      default: [],
      description: "Blocklists selected when this session was started",
      type: [String],
    },
    endedAt: {
      description: "When the session was ended; unset while active",
      type: Date,
    },
    endsAt: {
      description: "Optional planned end time for the session",
      type: Date,
    },
    intention: {
      description: "What the user said they would work on, shown on block screens",
      maxlength: 280,
      trim: true,
      type: String,
    },
    ownerId: {
      description: "The user who owns this session",
      ref: "User",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    review: {
      _id: false,
      done: {
        description: "What got done during the session",
        maxlength: 280,
        trim: true,
        type: String,
      },
      note: {
        description: "One-line end-of-block review note",
        maxlength: 280,
        trim: true,
        type: String,
      },
      reviewedAt: {
        description: "When the session review was submitted",
        type: Date,
      },
    },
    reviewSkippedAt: {
      description: "When the end-of-block review prompt was skipped",
      type: Date,
    },
    startedAt: {
      default: (): Date => new Date(),
      description: "When the session started",
      required: true,
      type: Date,
    },
    status: {
      default: "active",
      description: "Whether the session is currently blocking (active) or finished (ended)",
      enum: ["active", "ended"],
      required: true,
      type: String,
    },
  },
  {
    // Concurrent writes (e.g. two devices reviewing at once) fail with a version error
    // instead of both succeeding.
    optimisticConcurrency: true,
    strict: "throw",
    toJSON: {virtuals: true},
    toObject: {virtuals: true},
  }
);

// At most one active session per user, enforced by the database as well as the router.
focusSessionSchema.index(
  {ownerId: 1},
  {partialFilterExpression: {deleted: false, status: "active"}, unique: true}
);

// Two concurrent starts can both pass the router's check; the index rejects the loser,
// which should see the same 409 as the sequential case rather than a generic write error.
focusSessionSchema.post("save", {errorHandler: true}, (error, _doc, next): void => {
  if ((error as {name?: string}).name === "VersionError") {
    next(new APIError({status: 409, title: "This session was just changed on another device"}));
    return;
  }
  const duplicate = error as {code?: number; keyPattern?: Record<string, unknown>};
  if (duplicate.code === 11000) {
    const title = duplicate.keyPattern?.ownerId
      ? "A focus session is already active"
      : "A focus session with this id already exists";
    next(new APIError({status: 409, title}));
    return;
  }
  next(error);
});

addDefaultPlugins(focusSessionSchema);
// Stamps a per-stream _syncSeq on every write; required by the router's sync config.
focusSessionSchema.plugin(syncPlugin);

export const FocusSession = mongoose.model<FocusSessionDocument, FocusSessionModel>(
  "FocusSession",
  focusSessionSchema
);
