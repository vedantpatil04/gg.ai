import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import path from "path";
import rateLimit from "express-rate-limit";
import securityRoutes from "./routes/security.routes";

import { connectDB } from "./database/connection";
import { logger } from "./utils/logger";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import environmentalRoutes from "./routes/environmental.routes";
import forecastRoutes from "./routes/forecast.routes";
import complaintRoutes from "./routes/complaint.routes";
import reportRoutes from "./routes/report.routes";
import profileRoutes from "./routes/profile.routes";
import alertRoutes from "./routes/alert.routes";
import simulatorRoutes from "./routes/simulator.routes";
import adminRoutes from "./routes/admin.routes";
import copilotRoutes from "./routes/copilot.routes";
import intelligenceRoutes from "./routes/intelligence.routes";
import commandRoutes from "./routes/command.routes";
import { startScheduler, getSchedulerStatus } from "./jobs/scheduler";

// Phase 3 — direct city AI insights controller (avoids broken req.url shortcut)
import { getCityAIInsights } from "./controllers/copilot.controller";

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

// Phase 4 — Profile Picture Management. LocalStorageProvider writes here;
// this just makes those files reachable over HTTP. Swapping to a cloud
// storage provider later removes the need for this line entirely (the
// provider would return its own CDN URL instead).
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ─── Rate limiters ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests." },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many auth attempts." },
});
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: "AI rate limit reached. Please wait a moment." },
});

app.use("/api", limiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/environmental", environmentalRoutes);
app.use("/api/forecast", forecastRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/simulator", simulatorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/copilot", aiLimiter, copilotRoutes);
app.use("/api/intelligence", aiLimiter, intelligenceRoutes);
app.use("/api/command", aiLimiter, commandRoutes);
app.use("/api/security", securityRoutes);

// Phase 3 — GET /api/cities/:city/ai-insights  (spec-required top-level path)
app.get("/api/cities/:city/ai-insights", aiLimiter, getCityAIInsights);

// ─── Health ───────────────────────────────────────────────────────────────────
const DB_STATE_LABELS: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

app.get("/api/health", (_req, res) => {
  const dbState = mongoose.connection.readyState; // 0-3 (+ driver-internal states)
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "6.0.0",
    environment: process.env.NODE_ENV || "development",
    aiEnabled: !!process.env.GEMINI_API_KEY,
    database: {
      connected: dbState === 1,
      state: DB_STATE_LABELS[dbState] ?? "unknown",
    },
    scheduler: getSchedulerStatus(),
  });
});

app.use(notFound);
app.use(errorHandler);

async function bootstrap() {
  await connectDB();
  app.listen(PORT, () => {
    logger.info(`🚀 GreenGuard API v4.0 → http://localhost:${PORT}`);
    logger.info(
      `🤖 Gemini AI: ${process.env.GEMINI_API_KEY ? "✅ enabled" : "⚠️  disabled — set GEMINI_API_KEY"}`,
    );
    logger.info(
      `🌍 Real-time data: ${process.env.OPENWEATHER_API_KEY ? "✅ OpenWeather enabled" : "⚠️  no API key — using seeded data"}`,
    );
  });
  startScheduler();
}

bootstrap().catch((err) => {
  logger.error("Bootstrap failed:", err);
  process.exit(1);
});

export default app;
