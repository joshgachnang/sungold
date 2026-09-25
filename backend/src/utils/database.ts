import {logger} from "@terreno/api";
import mongoose from "mongoose";

export const connectToMongoDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) {
    logger.info("Already connected to MongoDB");
    return;
  }

  const mongoURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/sungold?replicaSet=rs0";

  try {
    await mongoose.connect(mongoURI);
    logger.info("Connected to MongoDB");
  } catch (error: unknown) {
    logger.error(`MongoDB connection error: ${error}`);
    throw error;
  }

  mongoose.connection.on("error", (error: unknown) => {
    logger.error(`MongoDB connection error: ${error}`);
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected");
  });
};
