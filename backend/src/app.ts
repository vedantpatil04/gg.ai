import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import path from "path";
import rateLimit from "express-rate-limit";

import { connectDB }    from "./database/connection";
import { logger }       from "./utils/logger";
import { errorHandler } from "./middleware/errorHandler";
import { notFound }     from "./middleware/notFound";

import authRoutes          from "./routes/auth.routes";
import userRoutes          from "./routes/user.routes";
import environmentalRoutes from "./routes/environmental.routes";
import forecastRoutes      from "./routes/forecast.routes";
import complaintRoutes     from "./routes/complaint.routes";
import reportRoutes        from "./routes/report.routes";
import profileRoutes       from "./routes/profile.routes";
import alertRoutes         from "./routes/alert.routes";
import simulatorRoutes     from "./routes/simulator.routes";
import adminRoutes         from "./routes/admin.routes";
import authorityRoutes     from "./routes/authority.routes";
import citizenRoutes       from "./routes/citizen.routes";
import copilotRoutes       from "./routes/copilot.routes";
import intelligenceRoutes  from "./routes/intelligence.routes";
import commandRoutes       from "./routes/command.routes";
import securityRoutes      from "./routes/security.routes";
import platformAdminRoutes from "./routes/platform-admin.routes";
import notificationRoutes  from "./routes/notification.routes";
import settingsRoutes      from "./routes/settings.routes";
import supportRoutes       from "./routes/support.routes";
import communicationHubRoutes from "./routes/communication-hub.routes";
import helpAiRoutes        from "./routes/help-ai.routes";
import communityRoutes     from "./routes/community.routes";

import { getCityAIInsights }                   from "./controllers/copilot.controller";
import { startScheduler, getSchedulerStatus }  from "./jobs/scheduler";
import { isPushConfigured }                    from "./services/push.service";

const app  = express();
const PORT = Number(process.env.PORT) || 5000;

// Trust first proxy hop (Render, Vercel, Cloudflare, load balancers) so req.ip reflects the real client IP
app.set("trust proxy", 1);

// ─── Security & Core Middleware ───────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://gg-ai-system.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "capacitor://localhost",
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow mobile webviews, curl, postman or same-origin requests with no origin header
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

// Phase 4 — Profile Picture Management. LocalStorageProvider writes here;
// this just makes those files reachable over HTTP. Swapping to a cloud
// storage provider later removes the need for this line entirely (the
// provider would return its own CDN URL instead).
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ─── Health Checks (Registered before rate limiting for zero-latency Render probes) ─
const DB_STATE_LABELS: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

const handleHealthCheck = (_req: express.Request, res: express.Response) => {
  const dbState = mongoose.connection.readyState;
  res.status(200).json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "6.0.0",
    environment: process.env.NODE_ENV || "development",
    aiEnabled: !!process.env.GEMINI_API_KEY,
    pushEnabled: isPushConfigured(),
    database: {
      connected: dbState === 1,
      state: DB_STATE_LABELS[dbState] ?? "unknown",
    },
    scheduler: getSchedulerStatus(),
  });
};

app.get("/",           handleHealthCheck);
app.get("/health",     handleHealthCheck);
app.get("/api/health", handleHealthCheck);

// ─── Rate Limiters ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests. Please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many authentication attempts. Please try again later." },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "AI rate limit reached. Please wait a moment." },
});

app.use("/api", limiter);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth",             authLimiter, authRoutes);
app.use("/api/users",            userRoutes);
app.use("/api/environmental",    environmentalRoutes);
app.use("/api/forecast",         forecastRoutes);
app.use("/api/complaints",       complaintRoutes);
app.use("/api/reports",          reportRoutes);
app.use("/api/profile",          profileRoutes);
app.use("/api/alerts",           alertRoutes);
app.use("/api/simulator",        simulatorRoutes);
app.use("/api/admin",            adminRoutes);
app.use("/api/admin/authorities", authorityRoutes);
app.use("/api/citizen",          citizenRoutes);
app.use("/api/copilot",          aiLimiter, copilotRoutes);
app.use("/api/intelligence",     aiLimiter, intelligenceRoutes);
app.use("/api/command",          aiLimiter, commandRoutes);
app.use("/api/security",         securityRoutes);
app.use("/api/platform-admin",   platformAdminRoutes);
app.use("/api/notifications",    notificationRoutes);
app.use("/api/settings",         settingsRoutes);
app.use("/api/support",          supportRoutes);
app.use("/api/admin/communication", communicationHubRoutes);
app.use("/api/help-ai",          helpAiRoutes);
app.use("/api/community",        communityRoutes);

// Phase 3 — GET /api/cities/:city/ai-insights  (spec-required top-level path)
app.get("/api/cities/:city/ai-insights", aiLimiter, getCityAIInsights);

// ─── Error Handling ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Bootstrap Server ─────────────────────────────────────────────────────────
async function bootstrap() {
  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`🚀 GreenGuard API v6.0 running on port ${PORT} (bound to 0.0.0.0)`);
    logger.info(`🤖 Gemini AI: ${process.env.GEMINI_API_KEY ? "✅ enabled" : "⚠️ disabled — set GEMINI_API_KEY"}`);
    logger.info(`📱 Push Notifications (FCM): ${isPushConfigured() ? "✅ enabled" : "⚠️ disabled — set FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY"}`);
    logger.info(`🌍 Real-time data: Open-Meteo ✅ (no API key required) — weather ${process.env.OPEN_METEO_WEATHER_BASE_URL || "https://api.open-meteo.com/v1/forecast"}`);
  });

  try {
    await connectDB();
    startScheduler();
  } catch (err) {
    logger.error("Bootstrap background tasks failed:", err);
  }
}

bootstrap().catch((err) => {
  logger.error("Bootstrap failed:", err);
  process.exit(1);
});

export default app;