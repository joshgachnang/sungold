import {IANAZone} from "luxon";
import mongoose from "mongoose";
import passportLocalMongoose from "passport-local-mongoose";
import type {UserDocument, UserModel} from "../types";
import {addDefaultPlugins} from "./modelPlugins";

const userSchema = new mongoose.Schema<UserDocument, UserModel>(
  {
    admin: {
      default: false,
      description: "Whether the user has administrator access",
      type: Boolean,
    },
    betterAuthId: {
      description: "Identifier linking to the Better Auth session provider",
      index: true,
      sparse: true,
      type: String,
    },
    email: {
      description: "The user's email address, used for authentication",
      lowercase: true,
      required: true,
      trim: true,
      type: String,
      unique: true,
    },
    name: {
      description: "The user's display name",
      required: true,
      trim: true,
      type: String,
    },
    starterBlocklistsSeededAt: {
      description: "When the user's starter blocklists were first seeded",
      type: Date,
    },
    timezone: {
      description: "IANA timezone used for profile-local week boundaries",
      trim: true,
      type: String,
      validate: {
        message: "Timezone must be a valid IANA timezone",
        validator: (value: string | undefined): boolean =>
          value === undefined || IANAZone.isValidZone(value),
      },
    },
    weekStartDay: {
      description: "Day that starts the user's focus week, Sunday = 0",
      max: 6,
      min: 0,
      type: Number,
      validate: {
        message: "Week start day must be an integer from 0 to 6",
        validator: Number.isInteger,
      },
    },
  },
  {strict: "throw", toJSON: {virtuals: true}, toObject: {virtuals: true}}
);

userSchema.plugin(passportLocalMongoose, {
  usernameField: "email",
});

addDefaultPlugins(userSchema);

userSchema.method("getDisplayName", function (this: UserDocument): string {
  return this.name;
});

export const User = mongoose.model<UserDocument, UserModel>("User", userSchema);

User.findByEmail = async function (email: string): Promise<UserDocument | null> {
  return this.findOneOrNone({email: email.toLowerCase()});
};
