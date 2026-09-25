import {
  APIError,
  createBetterAuth,
  getMongoClientFromMongoose,
  logger,
  Membership,
  Organization,
  runSeedCli,
  type SeedStep,
  seedBetterAuthUser,
  type UserModel as TerrenoAuthUserModel,
} from "@terreno/api";
import mongoose from "mongoose";

import {access} from "../access";
import {User} from "../models/user";
import {buildBetterAuthConfig} from "../utils/betterAuthConfig";
import {connectToMongoDB} from "../utils/database";

const SEED_USERS = [
  {
    admin: false,
    email: "test@example.com",
    name: "Test User",
    password: "testpassword123",
  },
  {
    admin: true,
    email: "admin@example.com",
    name: "Admin User",
    password: "testpassword123",
  },
];

const seedSteps: SeedStep[] = [
  {
    description: "Create login-ready development users and reconcile profile fields",
    name: "users",
    run: async (context) => {
      if (context.dryRun) {
        for (const user of SEED_USERS) {
          const existing = await User.findByEmail(user.email);
          context.changes.push({
            change: existing ? "updated" : "created",
            count: 1,
            key: JSON.stringify({email: user.email}),
            model: User.modelName,
          });
        }
        return;
      }

      const config = buildBetterAuthConfig();
      if (!config) {
        throw new APIError({
          status: 500,
          title: "Seed users require Better Auth to be enabled",
        });
      }
      const auth = createBetterAuth({
        config,
        mongoClient: getMongoClientFromMongoose(),
        userModel: User as unknown as TerrenoAuthUserModel,
      });
      for (const definition of SEED_USERS) {
        const user = await seedBetterAuthUser({
          auth,
          user: definition,
          userModel: User as unknown as TerrenoAuthUserModel,
        });
        const appUser = user as unknown as {
          admin: boolean;
          save: () => Promise<unknown>;
        };
        appUser.admin = definition.admin;
        const roles = (appUser as unknown as {roles?: string[]}).roles ?? [];
        if (definition.admin && !roles.includes("operator")) {
          (appUser as unknown as {roles: string[]}).roles = [...roles, "operator"];
        }
        await appUser.save();
      }
    },
  },
  {
    description: "Create the default organization and attach the admin as org-admin",
    name: "organization",
    run: async (context) => {
      await access.roles.seedDefaults();
      const existing = await Organization.findOneOrNone({name: "Sungold"});
      if (context.dryRun) {
        context.changes.push({
          change: existing ? "updated" : "created",
          count: 1,
          key: JSON.stringify({name: "Sungold"}),
          model: Organization.modelName,
        });
        return;
      }
      const admin = await User.findByEmail("admin@example.com");
      if (!admin) {
        throw new APIError({
          status: 500,
          title: "Default organization requires admin@example.com",
        });
      }
      const organization =
        existing ??
        (await Organization.create({
          name: "Sungold",
          ownerId: admin._id,
        }));
      const membership = await Membership.findOneOrNone({
        organizationId: organization._id,
        userId: admin._id,
      });
      if (!membership) {
        await Membership.create({
          organizationId: organization._id,
          roleName: "org-admin",
          userId: admin._id,
        });
      }
    },
  },
];

const main = async (): Promise<void> => {
  const cli = await runSeedCli({
    allowProductionReset: () => process.env.ALLOW_SEED_RESET === "true",
    connect: connectToMongoDB,
    disconnect: async () => {
      await mongoose.disconnect();
    },
    name: "bun run seed",
    steps: seedSteps,
  });
  if (cli.help) {
    logger.info(cli.help);
  }
  process.exit(cli.exitCode);
};

main().catch((error: unknown) => {
  logger.error(`Seed failed: ${error}`);
  process.exit(1);
});
