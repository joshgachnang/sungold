import {
  createAccess,
  type UserModel as TerrenoAuthUserModel,
  terrenoStatements,
} from "@terreno/api";
import mongoose from "mongoose";

import {User} from "./models/user";

export const access = createAccess({
  connection: mongoose.connection,
  organizations: true,
  statements: terrenoStatements,
  userModel: User as unknown as TerrenoAuthUserModel,
});
