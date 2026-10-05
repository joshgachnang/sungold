import type {FindExactlyOnePlugin, FindOneOrNonePlugin} from "@terreno/api";
import type mongoose from "mongoose";

export type FocusSessionStatus = "active" | "ended";

export interface FocusSessionReview {
  done: string;
  note: string;
  reviewedAt: Date;
}

interface FocusSessionStatics
  extends FindExactlyOnePlugin<FocusSessionDocument>,
    FindOneOrNonePlugin<FocusSessionDocument> {}

export interface FocusSessionModel
  extends mongoose.Model<FocusSessionDocument>,
    FocusSessionStatics {}

// Synced via @terreno/syncdb, so _id is a String (offline clients mint their own ids).
export interface FocusSessionDocument extends mongoose.Document<string> {
  _id: string;
  ownerId: mongoose.Types.ObjectId;
  status: FocusSessionStatus;
  blockedDomains: string[];
  blocklistIds: string[];
  intention?: string;
  review?: FocusSessionReview;
  reviewSkippedAt?: Date;
  startedAt: Date;
  endsAt?: Date;
  endedAt?: Date;
  created: Date;
  updated: Date;
  deleted: boolean;
}
