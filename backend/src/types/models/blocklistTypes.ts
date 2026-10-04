import type {FindExactlyOnePlugin, FindOneOrNonePlugin} from "@terreno/api";
import type mongoose from "mongoose";

export type BlocklistSource = "starter" | "user";

interface BlocklistStatics
  extends FindExactlyOnePlugin<BlocklistDocument>,
    FindOneOrNonePlugin<BlocklistDocument> {}

export interface BlocklistModel extends mongoose.Model<BlocklistDocument>, BlocklistStatics {}

// Synced via @terreno/syncdb, so _id is a String (offline clients mint their own ids).
export interface BlocklistDocument extends mongoose.Document<string> {
  _id: string;
  ownerId: mongoose.Types.ObjectId;
  name: string;
  domains: string[];
  source: BlocklistSource;
  created: Date;
  updated: Date;
  deleted: boolean;
  starterKey?: string;
}
