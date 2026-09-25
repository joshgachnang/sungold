import {modelRouter, Permissions} from "@terreno/api";
import type {Model} from "mongoose";
import {User} from "../models/user";
import type {UserDocument} from "../types";

export const userRouter = modelRouter("/users", User as unknown as Model<UserDocument>, {
  permissions: {
    create: [Permissions.IsAdmin],
    delete: [Permissions.IsAdmin],
    list: [Permissions.IsAdmin],
    read: [Permissions.IsAdmin],
    update: [Permissions.IsAdmin],
  },
  queryFields: ["email", "name"],
  sort: "name",
});
