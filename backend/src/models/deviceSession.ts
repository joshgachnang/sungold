import mongoose from "mongoose";
import type {DeviceSessionDocument, DeviceSessionModel} from "../types/models/deviceSessionTypes";
import {addDefaultPlugins} from "./modelPlugins";

// A native client (the Mac app) signed in through the browser handoff. The Better Auth
// session holds the credential; this record lets the owner see and revoke the device.
const deviceSessionSchema = new mongoose.Schema<DeviceSessionDocument, DeviceSessionModel>(
  {
    betterAuthSessionId: {
      description: "Id of the Better Auth session issued to the device (not the token)",
      required: true,
      type: String,
    },
    client: {
      description: "Which native client this is",
      enum: ["mac"],
      required: true,
      type: String,
    },
    name: {
      description: "Display name the device reported, e.g. the Mac's computer name",
      maxlength: 100,
      trim: true,
      type: String,
    },
    ownerId: {
      description: "The user the device is signed in as",
      ref: "User",
      required: true,
      type: mongoose.Schema.Types.ObjectId,
    },
    revokedAt: {
      description: "When the owner revoked the device; its token stops working immediately",
      type: Date,
    },
  },
  {strict: "throw", toJSON: {virtuals: true}, toObject: {virtuals: true}}
);

addDefaultPlugins(deviceSessionSchema);

export const DeviceSession = mongoose.model<DeviceSessionDocument, DeviceSessionModel>(
  "DeviceSession",
  deviceSessionSchema
);
