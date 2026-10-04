import {AdminApp} from "@terreno/admin-backend";
import {
  BetterAuthApp,
  checkModelsStrict,
  createBetterAuth,
  getMongoClientFromMongoose,
  logger,
  Membership,
  RealtimeApp,
  SyncApp,
  TerrenoApp,
  type UserModel as TerrenoAuthUserModel,
} from "@terreno/api";
import {HealthApp} from "@terreno/api-health";
import type express from "express";
import mongoose from "mongoose";
import {access} from "./access";
import {blocklistRouter} from "./api/blocklists";
import {configureDeviceAuth, deviceSessionRouter} from "./api/deviceSessions";
import {focusSessionRouter} from "./api/focusSessions";
import {unlockGrantRouter} from "./api/unlockGrants";
import {userRouter} from "./api/users";
import {AppConfiguration} from "./models/appConfiguration";
import {organizationSettingsSchema} from "./models/organizationSettings";
import {User} from "./models/user";
import "./types/models/organizationSettingsTypes";
import {buildBetterAuthConfig, getWebOrigins} from "./utils/betterAuthConfig";
import {connectToMongoDB} from "./utils/database";

const isDeployed = process.env.NODE_ENV === "production";

export const start = async (skipListen = false): Promise<express.Application> => {
  await connectToMongoDB();

  logger.info(`Starting Sungold server on port ${process.env.PORT || 4093}`);

  if (!isDeployed) {
    checkModelsStrict();
  }

  await access.roles.seedDefaults();

  const betterAuthConfig = buildBetterAuthConfig();
  const betterAuthInstance = betterAuthConfig
    ? createBetterAuth({
        config: betterAuthConfig,
        mongoClient: getMongoClientFromMongoose(),
        // noExplicitAny: User model type mismatch
        userModel: User as any,
      })
    : undefined;

  configureDeviceAuth(betterAuthInstance);

  const terraApp = new TerrenoApp({
    accessControl: access,
    corsOrigin: getWebOrigins(),
    loggingOptions: {
      disableConsoleColors: isDeployed,
      level: "debug",
      logRequests: !isDeployed,
    },
    organizations: {
      settingsSchema: organizationSettingsSchema,
    },
    skipListen,
    // noExplicitAny: User model type mismatch
    userModel: User as any,
  }).configure(AppConfiguration);

  if (betterAuthConfig) {
    terraApp.register(
      new BetterAuthApp({
        config: betterAuthConfig,
        userModel: User as unknown as TerrenoAuthUserModel,
      })
    );
  }

  return terraApp
    .register(userRouter)
    .register(blocklistRouter)
    .register(focusSessionRouter)
    .register(unlockGrantRouter)
    .register(deviceSessionRouter)
    .register(
      new HealthApp({
        check: async () => {
          const mongoConnected = mongoose.connection.readyState === 1;
          return {
            details: {
              database: mongoConnected ? "connected" : "disconnected",
              uptime: process.uptime(),
            },
            healthy: mongoConnected,
          };
        },
      })
    )
    .register(
      new AdminApp({
        models: [
          {
            displayName: "Users",
            listFields: ["email", "name", "admin", "created"],
            // noExplicitAny: User model type mismatch
            model: User as any,
            routePath: "/users",
          },
        ],
      })
    )
    .register(
      new SyncApp({
        accessControl: access,
        getUserScopes: async (user) => {
          const memberships = await Membership.findActiveForUser(user.id);
          return memberships.map((membership) => String(membership.organizationId));
        },
      })
    )
    .register(
      new RealtimeApp({
        betterAuth: betterAuthInstance
          ? {
              auth: betterAuthInstance,
              // noExplicitAny: User model type mismatch
              userModel: User as any,
            }
          : undefined,
        // noExplicitAny: User model type mismatch
        userModel: User as any,
      })
    )
    .start();
};

start().catch((error) => {
  logger.error(`Fatal error starting server: ${error}`);
});
