import type {FindExactlyOnePlugin, FindOneOrNonePlugin} from "@terreno/api";
import type mongoose from "mongoose";

export type UnlockGrantReason = "peek";

interface UnlockGrantStatics
  extends FindExactlyOnePlugin<UnlockGrantDocument>,
    FindOneOrNonePlugin<UnlockGrantDocument> {}

export interface UnlockGrantModel extends mongoose.Model<UnlockGrantDocument>, UnlockGrantStatics {}

// Synced via @terreno/syncdb, so _id is a String.
export interface UnlockGrantDocument extends mongoose.Document<string> {
  _id: string;
  ownerId: mongoose.Types.ObjectId;
  sessionId: string;
  reason: UnlockGrantReason;
  issuedAt: Date;
  expiresAt: Date;
  payload: string;
  signature: string;
  created: Date;
  updated: Date;
  deleted: boolean;
}
