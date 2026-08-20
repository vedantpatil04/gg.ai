import mongoose from "mongoose";
import { logger } from "../utils/logger";

let isConnecting = false;

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.error("MONGODB_URI is not defined in environment variables — skipping database connection");
    return;
  }

  if (mongoose.connection.readyState === 1 || isConnecting) {
    return;
  }

  isConnecting = true;
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15_000,
      socketTimeoutMS: 45_000,
      connectTimeoutMS: 15_000,
    });
    logger.info(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    logger.error("MongoDB connection failed (will retry automatically):", err);
  } finally {
    isConnecting = false;
  }
}

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected — attempting reconnect...");
});

mongoose.connection.on("reconnected", () => {
  logger.info("MongoDB reconnected");
});

mongoose.connection.on("error", (err) => {
  logger.error("MongoDB connection error:", err);
});
