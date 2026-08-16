import "dotenv/config";
import mongoose from "mongoose";
import { EnvironmentalData } from "../models/EnvironmentalData";
import { Alert } from "../models/Alert";
import { Report } from "../models/Report";
import { User } from "../models/User";
import { City } from "../models/City";
import { CommunityPost } from "../models/CommunityPost";
import { logger } from "../utils/logger";
import { seedMapData } from "./mapLocations.seed";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/greenguard";

// ─── City base data (matches frontend mock-data.ts exactly) ──────────────────
const CITY_BASES = [
  {
    cityId: "belagavi",
    cityName: "Belagavi",
    country: "India",
    timezone: "Asia/Kolkata",
    aqi: 62,
    water: 78,
    risk: 34,
    eco: 71,
    temp: 26,
    humidity: 64,
    pm25: 22,
    pm10: 48,
    no2: 18,
    o3: 41,
    co2: 412,
    carbon: 4.2,
    lat: 15.85,
    lng: 74.5,
    renewableShare: 28,
    greenCover: 34,
  },
  {
    cityId: "bengaluru",
    cityName: "Bengaluru",
    country: "India",
    timezone: "Asia/Kolkata",
    aqi: 118,
    water: 64,
    risk: 58,
    eco: 62,
    temp: 28,
    humidity: 58,
    pm25: 54,
    pm10: 92,
    no2: 38,
    o3: 56,
    co2: 438,
    carbon: 6.1,
    lat: 12.97,
    lng: 77.59,
    renewableShare: 22,
    greenCover: 22,
  },
  {
    cityId: "mumbai",
    cityName: "Mumbai",
    country: "India",
    timezone: "Asia/Kolkata",
    aqi: 156,
    water: 52,
    risk: 72,
    eco: 48,
    temp: 31,
    humidity: 78,
    pm25: 78,
    pm10: 134,
    no2: 52,
    o3: 62,
    co2: 451,
    carbon: 7.8,
    lat: 19.07,
    lng: 72.87,
    renewableShare: 18,
    greenCover: 16,
  },
  {
    cityId: "delhi",
    cityName: "Delhi",
    country: "India",
    timezone: "Asia/Kolkata",
    aqi: 248,
    water: 41,
    risk: 88,
    eco: 32,
    temp: 33,
    humidity: 42,
    pm25: 142,
    pm10: 224,
    no2: 78,
    o3: 84,
    co2: 478,
    carbon: 9.4,
    lat: 28.61,
    lng: 77.21,
    renewableShare: 12,
    greenCover: 10,
  },
  {
    cityId: "hyderabad",
    cityName: "Hyderabad",
    country: "India",
    timezone: "Asia/Kolkata",
    aqi: 98,
    water: 68,
    risk: 48,
    eco: 64,
    temp: 30,
    humidity: 52,
    pm25: 44,
    pm10: 78,
    no2: 32,
    o3: 48,
    co2: 428,
    carbon: 5.6,
    lat: 17.38,
    lng: 78.48,
    renewableShare: 24,
    greenCover: 26,
  },
  {
    cityId: "chennai",
    cityName: "Chennai",
    country: "India",
    timezone: "Asia/Kolkata",
    aqi: 112,
    water: 58,
    risk: 54,
    eco: 58,
    temp: 32,
    humidity: 74,
    pm25: 52,
    pm10: 88,
    no2: 36,
    o3: 54,
    co2: 434,
    carbon: 6.4,
    lat: 13.08,
    lng: 80.27,
    renewableShare: 20,
    greenCover: 20,
  },
  {
    cityId: "pune",
    cityName: "Pune",
    country: "India",
    timezone: "Asia/Kolkata",
    aqi: 104,
    water: 66,
    risk: 50,
    eco: 66,
    temp: 27,
    humidity: 62,
    pm25: 48,
    pm10: 82,
    no2: 34,
    o3: 52,
    co2: 430,
    carbon: 5.8,
    lat: 18.52,
    lng: 73.85,
    renewableShare: 26,
    greenCover: 24,
  },
  {
    cityId: "kolkata",
    cityName: "Kolkata",
    country: "India",
    timezone: "Asia/Kolkata",
    aqi: 168,
    water: 48,
    risk: 76,
    eco: 44,
    temp: 30,
    humidity: 80,
    pm25: 84,
    pm10: 146,
    no2: 58,
    o3: 66,
    co2: 458,
    carbon: 8.2,
    lat: 22.57,
    lng: 88.36,
    renewableShare: 14,
    greenCover: 14,
  },
  {
    cityId: "ahmedabad",
    cityName: "Ahmedabad",
    country: "India",
    timezone: "Asia/Kolkata",
    aqi: 134,
    water: 56,
    risk: 64,
    eco: 52,
    temp: 34,
    humidity: 38,
    pm25: 64,
    pm10: 108,
    no2: 44,
    o3: 58,
    co2: 442,
    carbon: 7.0,
    lat: 23.02,
    lng: 72.57,
    renewableShare: 16,
    greenCover: 12,
  },
  {
    cityId: "london",
    cityName: "London",
    country: "UK",
    timezone: "Europe/London",
    aqi: 42,
    water: 88,
    risk: 22,
    eco: 82,
    temp: 14,
    humidity: 70,
    pm25: 12,
    pm10: 24,
    no2: 22,
    o3: 32,
    co2: 408,
    carbon: 3.1,
    lat: 51.5,
    lng: -0.12,
    renewableShare: 48,
    greenCover: 42,
  },
  {
    cityId: "newyork",
    cityName: "New York",
    country: "USA",
    timezone: "America/New_York",
    aqi: 54,
    water: 82,
    risk: 30,
    eco: 76,
    temp: 18,
    humidity: 62,
    pm25: 18,
    pm10: 36,
    no2: 28,
    o3: 38,
    co2: 416,
    carbon: 4.6,
    lat: 40.71,
    lng: -74.0,
    renewableShare: 38,
    greenCover: 34,
  },
  {
    cityId: "singapore",
    cityName: "Singapore",
    country: "Singapore",
    timezone: "Asia/Singapore",
    aqi: 48,
    water: 92,
    risk: 24,
    eco: 86,
    temp: 30,
    humidity: 82,
    pm25: 14,
    pm10: 28,
    no2: 24,
    o3: 34,
    co2: 412,
    carbon: 3.4,
    lat: 1.35,
    lng: 103.82,
    renewableShare: 42,
    greenCover: 46,
  },
  {
    cityId: "tokyo",
    cityName: "Tokyo",
    country: "Japan",
    timezone: "Asia/Tokyo",
    aqi: 58,
    water: 86,
    risk: 28,
    eco: 80,
    temp: 22,
    humidity: 66,
    pm25: 20,
    pm10: 38,
    no2: 26,
    o3: 36,
    co2: 414,
    carbon: 4.0,
    lat: 35.68,
    lng: 139.69,
    renewableShare: 44,
    greenCover: 38,
  },
  {
    cityId: "dubai",
    cityName: "Dubai",
    country: "UAE",
    timezone: "Asia/Dubai",
    aqi: 124,
    water: 60,
    risk: 62,
    eco: 54,
    temp: 38,
    humidity: 44,
    pm25: 58,
    pm10: 142,
    no2: 42,
    o3: 60,
    co2: 446,
    carbon: 7.2,
    lat: 25.2,
    lng: 55.27,
    renewableShare: 20,
    greenCover: 8,
  },
];

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// ─── Generate 48 hours of hourly readings per city ───────────────────────────
function generateReadings(base: (typeof CITY_BASES)[0]) {
  const r = rng(base.aqi * 7 + base.pm25);
  const now = new Date();
  const readings = [];

  for (let h = 47; h >= 0; h--) {
    const ts = new Date(now.getTime() - h * 60 * 60 * 1000);
    const sinFactor = Math.sin(h / 4);
    const noise = () => (r() - 0.5) * 0.15;

    const aqiVal = clamp(Math.round(base.aqi * (1 + sinFactor * 0.12 + noise())), 10, 500);
    const pm25Val = clamp(Math.round(base.pm25 * (1 + sinFactor * 0.1 + noise())), 2, 300);

    readings.push({
      cityId: base.cityId,
      cityName: base.cityName,
      country: base.country,
      timestamp: ts,
      aqi: aqiVal,
      pm25: pm25Val,
      pm10: clamp(Math.round(base.pm10 * (1 + sinFactor * 0.08 + noise())), 5, 600),
      no2: clamp(Math.round(base.no2 * (1 + sinFactor * 0.1 + noise())), 2, 200),
      o3: clamp(Math.round(base.o3 * (1 + sinFactor * 0.08 + noise())), 5, 150),
      co2: clamp(Math.round(base.co2 + sinFactor * 4 + (r() - 0.5) * 6), 350, 600),
      so2: clamp(Math.round(10 + r() * 15), 1, 50),
      co: parseFloat((r() * 2.5).toFixed(2)),
      water: clamp(Math.round(base.water + sinFactor * 3 + (r() - 0.5) * 4), 20, 100),
      turbidity: parseFloat((r() * 8 + 1).toFixed(2)),
      dissolvedOxygen: parseFloat((6 + r() * 3).toFixed(2)),
      ph: parseFloat((6.8 + r() * 1.2).toFixed(2)),
      temp: parseFloat((base.temp + sinFactor * 2.5 + (r() - 0.5) * 1.5).toFixed(1)),
      humidity: clamp(Math.round(base.humidity + sinFactor * 5 + (r() - 0.5) * 6), 20, 100),
      windSpeed: parseFloat((r() * 18 + 2).toFixed(1)),
      windDirection: Math.round(r() * 360),
      pressure: Math.round(1010 + r() * 20 - 10),
      carbon: parseFloat((base.carbon * (1 + noise() * 0.5)).toFixed(2)),
      risk: clamp(Math.round(base.risk + sinFactor * 5 + (r() - 0.5) * 6), 5, 100),
      eco: clamp(Math.round(base.eco + (r() - 0.5) * 4), 10, 100),
      renewableShare: base.renewableShare,
      greenCover: base.greenCover,
      lat: base.lat,
      lng: base.lng,
      source: "sensor" as const,
      sensorId: `SENSOR-${base.cityId.toUpperCase()}-${String(Math.ceil(r() * 12)).padStart(2, "0")}`,
    });
  }
  return readings;
}

// ─── Seed alerts ─────────────────────────────────────────────────────────────
function generateAlerts() {
  return [
    // Belagavi
    {
      title: "PM2.5 spike detected",
      description: "Sensor cluster reporting 168 µg/m³, 3× safe limit near Industrial Zone B.",
      severity: "critical" as const,
      status: "active" as const,
      category: "air" as const,
      cityId: "belagavi",
      area: "Industrial Zone B",
      isAutomated: true,
    },
    {
      title: "Water turbidity rising",
      description:
        "Turbidity at 12 NTU, trending upward across last 6 readings at River Intake 04.",
      severity: "warning" as const,
      status: "active" as const,
      category: "water" as const,
      cityId: "belagavi",
      area: "River Intake 04",
      isAutomated: true,
    },
    {
      title: "Traffic-induced NO₂",
      description: "Peak-hour NO₂ exceeds 80 ppb threshold along Corridor A-19.",
      severity: "warning" as const,
      status: "acknowledged" as const,
      category: "air" as const,
      cityId: "belagavi",
      area: "Corridor A-19",
      isAutomated: true,
    },
    {
      title: "Forecast advisory",
      description: "Stagnant air mass predicted in 36h window; expect AQI rise city-wide.",
      severity: "info" as const,
      status: "active" as const,
      category: "general" as const,
      cityId: "belagavi",
      area: "City-wide",
      isAutomated: true,
    },
    {
      title: "Heatwave warning",
      description: "Surface temp forecast to exceed 41°C for 3 consecutive days in southern grid.",
      severity: "critical" as const,
      status: "active" as const,
      category: "heat" as const,
      cityId: "belagavi",
      area: "Southern grid",
      isAutomated: true,
    },
    // Delhi
    {
      title: "Hazardous AQI level",
      description: "AQI has breached 300 — hazardous category. All outdoor activities suspended.",
      severity: "critical" as const,
      status: "active" as const,
      category: "air" as const,
      cityId: "delhi",
      area: "City-wide",
      isAutomated: true,
    },
    {
      title: "PM10 extreme levels",
      description: "PM10 at 224 µg/m³, well above 24h standard of 100 µg/m³.",
      severity: "critical" as const,
      status: "active" as const,
      category: "air" as const,
      cityId: "delhi",
      area: "North-West Sector",
      isAutomated: true,
    },
    // Mumbai
    {
      title: "High AQI — unhealthy",
      description:
        "AQI 156, categorised Unhealthy. Sensitive populations should avoid outdoor exposure.",
      severity: "warning" as const,
      status: "active" as const,
      category: "air" as const,
      cityId: "mumbai",
      area: "City-wide",
      isAutomated: true,
    },
    // Bengaluru
    {
      title: "NO₂ exceedance",
      description:
        "NO₂ levels at 38 ppb, approaching caution threshold of 40 ppb in tech corridor.",
      severity: "info" as const,
      status: "active" as const,
      category: "air" as const,
      cityId: "bengaluru",
      area: "Tech Corridor",
      isAutomated: true,
    },
    // Singapore
    {
      title: "Regional haze advisory",
      description: "Cross-boundary haze from agricultural fires may elevate PSI in next 48 hours.",
      severity: "info" as const,
      status: "active" as const,
      category: "air" as const,
      cityId: "singapore",
      area: "City-wide",
      isAutomated: true,
    },
  ];
}

// ─── Seed reports ─────────────────────────────────────────────────────────────
function generateReports(adminId: mongoose.Types.ObjectId) {
  return [
    {
      title: "Q3 Environmental Health Report",
      type: "Quarterly" as const,
      summary:
        "Comprehensive quarterly analysis of air quality, water quality, and sustainability metrics across all monitoring zones. Key finding: PM2.5 reduced by 14% compared to Q2 following traffic restriction pilots.",
      cityId: "belagavi",
      generatedBy: adminId,
      fileSize: "4.2 MB",
      pages: 48,
      isPublic: true,
      tags: ["quarterly", "air", "water"],
    },
    {
      title: "Air Quality Trend Analysis — 30d",
      type: "Analytics" as const,
      summary:
        "Rolling 30-day analysis of AQI trend lines. Industrial Zone B remains the primary hotspot contributor; wind corridor modelling suggests buffer zone expansion.",
      cityId: "belagavi",
      generatedBy: adminId,
      fileSize: "2.1 MB",
      pages: 22,
      isPublic: true,
      tags: ["analytics", "air"],
    },
    {
      title: "Water Sanitation Compliance Audit",
      type: "Compliance" as const,
      summary:
        "Annual compliance audit of all municipal water supply points. 11 of 14 intake sensors operating within CPCB norms. River Intake 04 flagged for turbidity exceedance.",
      cityId: "belagavi",
      generatedBy: adminId,
      fileSize: "1.6 MB",
      pages: 18,
      isPublic: true,
      tags: ["compliance", "water"],
    },
    {
      title: "Carbon Footprint — Municipal Operations",
      type: "Sustainability" as const,
      summary:
        "Municipal carbon accounting for FY 2024-25. Transport sector contributes 42% of total emissions; renewable transition in municipal buildings saved 840 tCO₂e.",
      cityId: "belagavi",
      generatedBy: adminId,
      fileSize: "3.4 MB",
      pages: 34,
      isPublic: true,
      tags: ["sustainability", "carbon"],
    },
    {
      title: "Citizen Complaint Resolution Summary",
      type: "Operations" as const,
      summary:
        "Monthly resolution summary: 47 complaints received, 38 resolved (81% rate), avg resolution time 3.2 days. Open burning and sewage overflow are top complaint categories.",
      cityId: "belagavi",
      generatedBy: adminId,
      fileSize: "880 KB",
      pages: 12,
      isPublic: true,
      tags: ["operations", "citizen"],
    },
    {
      title: "Forecast Accuracy Benchmark",
      type: "Analytics" as const,
      summary:
        "Benchmark analysis of 72h AQI forecast model performance. RMSE of 8.4 AQI units over 30-day test period; 94.2% of predictions within ±15 AQI of actual.",
      cityId: "belagavi",
      generatedBy: adminId,
      fileSize: "1.2 MB",
      pages: 14,
      isPublic: true,
      tags: ["forecast", "analytics"],
    },
    {
      title: "Bengaluru Q3 Air Quality Report",
      type: "Quarterly" as const,
      summary:
        "AQI levels in Bengaluru averaged 118 in Q3, driven primarily by vehicular emissions in the tech corridor and construction dust. Mitigation recommendations included.",
      cityId: "bengaluru",
      generatedBy: adminId,
      fileSize: "3.8 MB",
      pages: 40,
      isPublic: true,
      tags: ["quarterly", "air"],
    },
    {
      title: "Delhi Winter Pollution Emergency Brief",
      type: "Incident" as const,
      summary:
        "Emergency brief on winter pollution spike exceeding AQI 300. Contributing factors: stubble burning (34%), vehicular (28%), industrial (21%), other (17%). GRAP Stage IV triggered.",
      cityId: "delhi",
      generatedBy: adminId,
      fileSize: "1.8 MB",
      pages: 16,
      isPublic: true,
      tags: ["incident", "air", "emergency"],
    },
  ];
}

// ─── Seed users ───────────────────────────────────────────────────────────────
async function seedUsers() {
  const existing = await User.findOne({ email: "admin@greenguard.ai" });
  if (existing) return existing;

  const users = await User.create([
    {
      name: "GreenGuard Admin",
      email: "admin@greenguard.ai",
      password: "Admin@123456",
      role: "administrator",
      approvalStatus: "approved",
      organization: "GreenGuard AI",
      city: "belagavi",
      isVerified: true,
    },
    {
      name: "Aanya Sharma",
      email: "aanya.s@cpcb.gov.in",
      password: "Authority@123",
      role: "authority",
      approvalStatus: "approved",
      organization: "City Pollution Control Board",
      city: "belagavi",
      isVerified: true,
    },
    {
      name: "Ravi Kumar",
      email: "ravi.k@bbmp.gov.in",
      password: "Authority@123",
      role: "authority",
      approvalStatus: "approved",
      organization: "BBMP",
      city: "bengaluru",
      isVerified: true,
    },
    {
      name: "Priya Nair",
      email: "priya.n@citizen.in",
      password: "Citizen@123",
      role: "citizen",
      approvalStatus: "approved",
      city: "belagavi",
      isVerified: true,
    },
  ]);

  logger.info(`✅ Seeded ${users.length} users`);
  return users[0];
}

// ─── Main seed function ───────────────────────────────────────────────────────
async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info("MongoDB connected for seeding");

    // Clear existing seeded data
    logger.info("Clearing existing data...");
    await Promise.all([
      EnvironmentalData.deleteMany({}),
      Alert.deleteMany({ isAutomated: true }),
      City.deleteMany({}),
    ]);

    // Seed City registry (database-driven — ingestion iterates this collection)
    logger.info("Seeding City registry...");
    const cityDocs = CITY_BASES.map((b) => ({
      cityId: b.cityId,
      name: b.cityName,
      country: b.country,
      lat: b.lat,
      lng: b.lng,
      // Phase 1: each city's real IANA timezone (was hardcoded "UTC" for
      // every city regardless of location) — needed so forecast timestamps
      // resolve to genuine local time instead of a wrong fixed offset.
      timezone: b.timezone || "UTC",
      isActive: true,
    }));
    await City.insertMany(cityDocs, { ordered: false });
    logger.info(`✅ Seeded ${cityDocs.length} cities into City registry`);

    // Seed users
    const admin = await seedUsers();

    // Seed environmental data (48h × 14 cities = 672 documents)
    logger.info("Seeding environmental data...");
    const allReadings = CITY_BASES.flatMap(generateReadings);
    await EnvironmentalData.insertMany(allReadings, { ordered: false });
    logger.info(`✅ Seeded ${allReadings.length} environmental readings`);

    // Seed alerts
    logger.info("Seeding alerts...");
    const alertDocs = generateAlerts().map((a, i) => ({
      ...a,
      createdAt: new Date(Date.now() - i * 12 * 60 * 1000), // staggered
    }));
    await Alert.insertMany(alertDocs, { ordered: false });
    logger.info(`✅ Seeded ${alertDocs.length} alerts`);

    // Seed reports (only if none exist)
    const reportCount = await Report.countDocuments();
    if (reportCount === 0) {
      const reportDocs = generateReports(admin._id as mongoose.Types.ObjectId);
      await Report.insertMany(reportDocs, { ordered: false });
      logger.info(`✅ Seeded ${reportDocs.length} reports`);
    } else {
      logger.info(`Reports already exist (${reportCount}), skipping`);
    }

    logger.info("Seeding Smart Map...");
    await seedMapData();
    logger.info("✅ Smart Map seeded");

    // Seed community posts (only if none exist)
    const communityCount = await CommunityPost.countDocuments();
    if (communityCount === 0) {
      logger.info("Seeding Community posts...");
      const posts = [
        {
          type: "discussion",
          title: "Community Action: Local Urban Greenery Drive",
          body: "We are organizing a weekend urban tree planting drive in central wards. Join us to help improve localized air quality and canopy cover!",
          category: "Sustainability",
          tags: ["greenery", "community", "belagavi"],
          authorId: admin._id,
          authorName: admin.name ?? "Administrator",
          status: "open",
          replies: [],
          replyCount: 0,
          views: 12,
          hasBestAnswer: false,
        },
        {
          type: "question",
          title: "How are real-time AQI spike notifications calculated?",
          body: "I noticed a rapid increase in AQI readings during morning peak hours near industrial zones. How does GreenGuard AI filter out sensor noise vs genuine emission events?",
          category: "Environmental Monitoring",
          tags: ["aqi", "sensors", "alerts"],
          authorId: admin._id,
          authorName: admin.name ?? "Administrator",
          status: "open",
          replies: [],
          replyCount: 0,
          views: 28,
          hasBestAnswer: false,
        },
      ];
      await CommunityPost.insertMany(posts);
      logger.info(`✅ Seeded ${posts.length} community posts`);
    } else {
      logger.info(`Community posts already exist (${communityCount}), skipping`);
    }

    logger.info("🌱 Database seeding complete!");
    logger.info("──────────────────────────────────────────");
    logger.info("Demo accounts:");
    logger.info("  Admin:     admin@greenguard.ai  / Admin@123456");
    logger.info("  Authority: aanya.s@cpcb.gov.in  / Authority@123");
    logger.info("  Citizen:   priya.n@citizen.in   / Citizen@123");
    logger.info("──────────────────────────────────────────");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    logger.error("Seed failed:", err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
