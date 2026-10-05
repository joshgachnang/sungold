import type {FindExactlyOnePlugin, FindOneOrNonePlugin} from "@terreno/api";
import type mongoose from "mongoose";

export type DeviceClient = "mac";

interface DeviceSessionStatics
  extends FindExactlyOnePlugin<DeviceSessionDocument>,
    FindOneOrNonePlugin<DeviceSessionDocument> {}

export interface DeviceSessionModel
  extends mongoose.Model<DeviceSessionDocument>,
    DeviceSessionStatics {}

export interface DeviceSessionDocument extends mongoose.Document {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  client: DeviceClient;
  name?: string;
  betterAuthSessionId: string;
  revokedAt?: Date;
  created: Date;
  updated: Date;
  deleted: boolean;
}
