import type {FindExactlyOnePlugin, FindOneOrNonePlugin} from "@terreno/api";
import type mongoose from "mongoose";

export type ParkingLotItemStatus = "open" | "done" | "dismissed";

interface ParkingLotItemStatics
  extends FindExactlyOnePlugin<ParkingLotItemDocument>,
    FindOneOrNonePlugin<ParkingLotItemDocument> {}

export interface ParkingLotItemModel
  extends mongoose.Model<ParkingLotItemDocument>,
    ParkingLotItemStatics {}

// Synced via @terreno/syncdb, so _id is a String.
export interface ParkingLotItemDocument extends mongoose.Document<string> {
  _id: string;
  ownerId: mongoose.Types.ObjectId;
  sessionId: string;
  text: string;
  status: ParkingLotItemStatus;
  resolvedAt?: Date;
  created: Date;
  updated: Date;
  deleted: boolean;
}
