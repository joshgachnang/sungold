import {configurationPlugin, createdUpdatedPlugin} from "@terreno/api";
import mongoose, {Schema} from "mongoose";

const generalSchema = new Schema(
  {
    appName: {
      default: "Sungold",
      description: "Display name of the application",
      type: String,
    },
    maintenanceMode: {
      default: false,
      description: "When enabled, the app returns 503 for all non-admin requests",
      type: Boolean,
    },
  },
  {_id: false}
);

const debugSchema = new Schema(
  {
    websocketsDebug: {
      default: false,
      description: "Enable verbose WebSocket and realtime sync debug logging",
      type: Boolean,
    },
  },
  {_id: false}
);

export interface AppConfigDocument {
  general: {
    appName: string;
    maintenanceMode: boolean;
  };
  debug: {
    websocketsDebug: boolean;
  };
}

const appConfigSchema = new Schema<AppConfigDocument>(
  {
    debug: {
      description: "Debug and diagnostic settings",
      type: debugSchema,
    },
    general: {
      description: "General application settings",
      type: generalSchema,
    },
  },
  {strict: "throw", toJSON: {virtuals: true}, toObject: {virtuals: true}}
);

appConfigSchema.plugin(configurationPlugin);
appConfigSchema.plugin(createdUpdatedPlugin);

export const AppConfiguration = mongoose.model<AppConfigDocument>(
  "AppConfiguration",
  appConfigSchema
);
