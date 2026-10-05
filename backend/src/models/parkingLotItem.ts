import {syncPlugin} from "@terreno/api";
import mongoose from "mongoose";
import type {
  ParkingLotItemDocument,
  ParkingLotItemModel,
} from "../types/models/parkingLotItemTypes";
import {addDefaultPlugins} from "./modelPlugins";

const parkingLotItemSchema = new mongoose.Schema<ParkingLotItemDocument, ParkingLotItemModel>(
  {
    _id: {
      default: (): string => new mongoose.Types.ObjectId().toHexString(),
      description: "The document id (String so it can be synced)",
      type: String,
    },
    ownerId: {
      description: "The user who owns this parking lot item",
      ref: "User",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    resolvedAt: {
      description: "When the item was resolved; unset while open",
      type: Date,
    },
    sessionId: {
      description: "The focus session where the item was captured",
      ref: "FocusSession",
      required: true,
      type: String,
    },
    status: {
      default: "open",
      description: "Whether the item is still open or was resolved during review",
      enum: ["open", "done", "dismissed"],
      required: true,
      type: String,
    },
    text: {
      description: "The stray thought captured during focus",
      maxlength: 280,
      minlength: 1,
      required: true,
      trim: true,
      type: String,
    },
  },
  {strict: "throw", toJSON: {virtuals: true}, toObject: {virtuals: true}}
);

parkingLotItemSchema.index({created: -1, ownerId: 1, status: 1});
parkingLotItemSchema.index({created: -1, ownerId: 1, sessionId: 1});

addDefaultPlugins(parkingLotItemSchema);
// Stamps a per-stream _syncSeq on every write; required by the router's sync config.
parkingLotItemSchema.plugin(syncPlugin);

export const ParkingLotItem = mongoose.model<ParkingLotItemDocument, ParkingLotItemModel>(
  "ParkingLotItem",
  parkingLotItemSchema
);
