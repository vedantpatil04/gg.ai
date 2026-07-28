import { Request, Response, NextFunction } from "express";
import { EnvironmentalData } from "../models/EnvironmentalData";
import { MapLocation } from "../models/MapLocation";
import { CityMapConfig } from "../models/CityMapConfig";
import { Complaint } from "../models/Complaint";
import { AppError } from "../middleware/errorHandler";
import { computeLocationProfile } from "../services/locationEnvironment.service";

// ─── Get all cities (latest reading per city) ────────────────────────────────
export async function getCities(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cities = await EnvironmentalData.aggregate([
      { $sort: { cityId: 1, timestamp: -1 } },
      {
        $group: {
          _id: "$cityId",
          doc: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$doc" } },
      { $sort: { cityName: 1 } },
    ]);
    res.json({ success: true, data: { cities } });
  } catch (err) {
    next(err);
  }
}

// ─── Get single city (latest reading) ───────────────────────────────────────
export async function getCity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { cityId } = req.params;
    const data = await EnvironmentalData.findOne({ cityId: cityId.toLowerCase() }).sort({
      timestamp: -1,
    });
    if (!data) return next(new AppError("City not found", 404));
    res.json({ success: true, data: { city: data } });
  } catch (err) {
    next(err);
  }
}

// ─── Get city trend (last N readings) ───────────────────────────────────────
export async function getCityTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { cityId } = req.params;
    const hours = Math.min(Number(req.query.hours) || 24, 168);

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const trend = await EnvironmentalData.find({
      cityId: cityId.toLowerCase(),
      timestamp: { $gte: since },
    })
      .sort({ timestamp: 1 })
      .select("timestamp aqi pm25 no2 o3 water temp humidity")
      .lean();

    res.json({ success: true, data: { trend, hours } });
  } catch (err) {
    next(err);
  }
}

// ─── Get hotspots for a city ──────────────────────────────────────────────────
// Response format is intentionally unchanged so the frontend continues to work
// without modification. Only the data source changed: hardcoded array → MongoDB.
export async function getHotspots(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { cityId } = req.params;
    const id = cityId.toLowerCase();

    // Fetch both in parallel
    const [latest, locations] = await Promise.all([
      EnvironmentalData.findOne({ cityId: id }).sort({ timestamp: -1 }).lean(),
      MapLocation.find({ cityId: id }).lean(),
    ]);

    if (!latest) return next(new AppError("City not found", 404));

    // Phase 2: level now comes from the shared category-realistic engine
    // instead of a flat min(100, cityAqi × multiplier) scalar — see
    // locationEnvironment.service.ts. This endpoint's response *shape* is
    // still intentionally unchanged (see comment above); only how `level`
    // itself is computed changed, and it now matches getCityMapData exactly
    // for the same location, which it did not before.

    // ── City-specific locations from MongoDB ──────────────────────────────────
    if (locations.length > 0) {
      const hotspots = locations.map((loc) => ({
        id: loc.locationId,
        name: loc.name,
        x: loc.mapX,
        y: loc.mapY,
        level: computeLocationProfile(loc, latest).level,
        category: loc.category,
        sensor: loc.sensorAvailable,
        description: loc.description,
      }));

      res.json({ success: true, data: { hotspots } });
      return;
    }

    // ── Graceful fallback: generic layout until city data is seeded ───────────
    // This block is unreachable once mapLocations.seed.ts has been run.
    const baseLevel = latest.aqi;
    const hotspots = [
      {
        id: "h1",
        name: "Industrial Zone B",
        x: 28,
        y: 32,
        level: Math.min(100, Math.round(baseLevel * 1.4)),
        category: "industrial",
        sensor: false,
        description: "Heavy industry area",
      },
      {
        id: "h2",
        name: "Highway Corridor",
        x: 56,
        y: 44,
        level: Math.min(100, Math.round(baseLevel * 1.2)),
        category: "commercial",
        sensor: false,
        description: "High-traffic arterial road",
      },
      {
        id: "h3",
        name: "Port Sector",
        x: 72,
        y: 68,
        level: Math.min(100, Math.round(baseLevel * 1.3)),
        category: "industrial",
        sensor: false,
        description: "Port & logistics zone",
      },
      {
        id: "h4",
        name: "Old Town",
        x: 42,
        y: 60,
        level: Math.min(100, Math.round(baseLevel * 0.85)),
        category: "residential",
        sensor: false,
        description: "Historic residential quarter",
      },
      {
        id: "h5",
        name: "Stadium Ring",
        x: 64,
        y: 22,
        level: Math.min(100, Math.round(baseLevel * 0.75)),
        category: "landmark",
        sensor: false,
        description: "Sports & recreation zone",
      },
      {
        id: "h6",
        name: "Eastern Suburbs",
        x: 84,
        y: 50,
        level: Math.min(100, Math.round(baseLevel * 0.55)),
        category: "residential",
        sensor: false,
        description: "Suburban residential belt",
      },
      {
        id: "h7",
        name: "River Mouth",
        x: 22,
        y: 78,
        level: Math.min(100, Math.round(baseLevel * 1.0)),
        category: "water",
        sensor: false,
        description: "Riparian monitoring point",
      },
    ];

    res.json({ success: true, data: { hotspots } });
  } catch (err) {
    next(err);
  }
}

// ─── NEW: Get full city map data (locations + water bodies + zones) ───────────
// GET /environmental/cities/:cityId/map-data
// Used by the Smart Map page for the rich layer: water bodies, env zones, search.
export async function getCityMapData(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { cityId } = req.params;
    const id = cityId.toLowerCase();

    const [latest, locations, config] = await Promise.all([
      EnvironmentalData.findOne({ cityId: id }).sort({ timestamp: -1 }).lean(),
      MapLocation.find({ cityId: id }).lean(),
      CityMapConfig.findOne({ cityId: id }).lean(),
    ]);

    if (!latest) return next(new AppError("City not found", 404));

    // Phase 2: full per-location environmental profile — see
    // locationEnvironment.service.ts for the category-realistic model that
    // replaces the old flat min(100, cityAqi × multiplier) scalar. Same
    // engine call as getHotspots above, so `level` always agrees between
    // the two endpoints for the same location (Phase 2 item 7).
    const enrichedLocations = locations.map((loc) => {
      const profile = computeLocationProfile(loc, latest);
      return {
        id: loc.locationId,
        name: loc.name,
        category: loc.category,
        latitude: loc.latitude,
        longitude: loc.longitude,
        x: loc.mapX,
        y: loc.mapY,
        level: profile.level,
        pm25: profile.pm25,
        pm10: profile.pm10,
        no2: profile.no2,
        co: profile.co,
        temp: profile.temp,
        humidity: profile.humidity,
        noise: profile.noise,
        windSpeed: profile.windSpeed,
        windDirection: profile.windDirection,
        battery: profile.battery,
        health: profile.health,
        sensor: loc.sensorAvailable,
        sensorType: loc.sensorType ?? "environmental",
        description: loc.description,
      };
    });

    res.json({
      success: true,
      data: {
        cityId: id,
        cityName: latest.cityName,
        center: config?.center ?? { lat: latest.lat, lng: latest.lng },
        zoom: config?.zoom ?? 12,
        bearing: config?.bearing ?? 0,
        pitch: config?.pitch ?? 0,
        locations: enrichedLocations,
        waterBodies: config?.waterBodies ?? [],
        zones: config?.zones ?? { residential: 50, industrial: 20, commercial: 20, greenCover: 10 },
        baseAqi: latest.aqi,
        updatedAt: latest.timestamp,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Get dashboard stats ─────────────────────────────────────────────────────
export async function getDashboardStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { cityId } = req.params;
    const city = await EnvironmentalData.findOne({ cityId: cityId.toLowerCase() }).sort({
      timestamp: -1,
    });
    if (!city) return next(new AppError("City not found", 404));

    const trend = await EnvironmentalData.find({
      cityId: cityId.toLowerCase(),
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    })
      .sort({ timestamp: 1 })
      .select("timestamp aqi pm25 no2 water")
      .lean();

    res.json({ success: true, data: { city, trend } });
  } catch (err) {
    next(err);
  }
}

// ─── PHASE 4: Historical analytics — GET /environmental/history/:cityId ──────
export async function getCityHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { cityId } = req.params;
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const history = await EnvironmentalData.aggregate([
      {
        $match: {
          cityId: cityId.toLowerCase(),
          timestamp: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
          },
          date: { $first: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } } },
          avgAqi: { $avg: "$aqi" },
          maxAqi: { $max: "$aqi" },
          minAqi: { $min: "$aqi" },
          avgPm25: { $avg: "$pm25" },
          avgPm10: { $avg: "$pm10" },
          avgNo2: { $avg: "$no2" },
          avgO3: { $avg: "$o3" },
          avgTemp: { $avg: "$temp" },
          avgHumidity: { $avg: "$humidity" },
          avgWater: { $avg: "$water" },
          avgRisk: { $avg: "$risk" },
          avgEco: { $avg: "$eco" },
          readings: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          date: 1,
          aqi: {
            avg: { $round: ["$avgAqi", 1] },
            max: { $round: ["$maxAqi", 0] },
            min: { $round: ["$minAqi", 0] },
          },
          pm25: { $round: ["$avgPm25", 1] },
          pm10: { $round: ["$avgPm10", 1] },
          no2: { $round: ["$avgNo2", 1] },
          o3: { $round: ["$avgO3", 1] },
          temp: { $round: ["$avgTemp", 1] },
          humidity: { $round: ["$avgHumidity", 0] },
          water: { $round: ["$avgWater", 1] },
          risk: { $round: ["$avgRisk", 1] },
          eco: { $round: ["$avgEco", 1] },
          readings: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);

    res.json({ success: true, data: { cityId, days, history } });
  } catch (err) {
    next(err);
  }
}

// ─── PHASE 4: AQI trends summary ─────────────────────────────────────────────
export async function getCityTrends(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { cityId } = req.params;
    const id = cityId.toLowerCase();

    const [latest, day7ago, day30ago] = await Promise.all([
      EnvironmentalData.findOne({ cityId: id }).sort({ timestamp: -1 }).lean(),
      EnvironmentalData.aggregate([
        {
          $match: {
            cityId: id,
            timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: null,
            avgAqi: { $avg: "$aqi" },
            avgPm25: { $avg: "$pm25" },
            avgRisk: { $avg: "$risk" },
            count: { $sum: 1 },
          },
        },
      ]),
      EnvironmentalData.aggregate([
        {
          $match: {
            cityId: id,
            timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: null,
            avgAqi: { $avg: "$aqi" },
            avgPm25: { $avg: "$pm25" },
            avgRisk: { $avg: "$risk" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    if (!latest) return next(new AppError("City not found", 404));

    const trend7 = day7ago[0] ?? null;
    const trend30 = day30ago[0] ?? null;
    const currentAqi = latest.aqi;
    const avg7Aqi = trend7 ? Math.round(trend7.avgAqi * 10) / 10 : null;
    const avg30Aqi = trend30 ? Math.round(trend30.avgAqi * 10) / 10 : null;

    res.json({
      success: true,
      data: {
        cityId: id,
        cityName: latest.cityName,
        current: {
          aqi: currentAqi,
          pm25: latest.pm25,
          risk: latest.risk,
          eco: latest.eco,
          timestamp: latest.timestamp,
        },
        trend7d: trend7
          ? {
              avgAqi: avg7Aqi,
              avgPm25: Math.round(trend7.avgPm25 * 10) / 10,
              avgRisk: Math.round(trend7.avgRisk * 10) / 10,
              direction: avg7Aqi !== null && currentAqi > avg7Aqi ? "worsening" : "improving",
              readings: trend7.count,
            }
          : null,
        trend30d: trend30
          ? {
              avgAqi: avg30Aqi,
              avgPm25: Math.round(trend30.avgPm25 * 10) / 10,
              avgRisk: Math.round(trend30.avgRisk * 10) / 10,
              direction: avg30Aqi !== null && currentAqi > avg30Aqi ? "worsening" : "improving",
              readings: trend30.count,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── PHASE 4: City pollution rankings ────────────────────────────────────────
export async function getPollutionRankings(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const cities = await EnvironmentalData.aggregate([
      { $sort: { cityId: 1, timestamp: -1 } },
      { $group: { _id: "$cityId", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
      {
        $project: {
          cityId: 1,
          cityName: 1,
          country: 1,
          aqi: 1,
          pm25: 1,
          pm10: 1,
          no2: 1,
          risk: 1,
          eco: 1,
          water: 1,
          carbon: 1,
        },
      },
      { $sort: { aqi: -1 } },
    ]);

    const ranked = cities.map((c, i) => ({ rank: i + 1, ...c }));
    res.json({
      success: true,
      data: { rankings: ranked, total: ranked.length, generatedAt: new Date() },
    });
  } catch (err) {
    next(err);
  }
}

// ─── PHASE 4: Network summary ─────────────────────────────────────────────────
export async function getNetworkSummary(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const summary = await EnvironmentalData.aggregate([
      { $sort: { cityId: 1, timestamp: -1 } },
      { $group: { _id: "$cityId", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
      {
        $group: {
          _id: null,
          cityCount: { $sum: 1 },
          avgAqi: { $avg: "$aqi" },
          maxAqi: { $max: "$aqi" },
          minAqi: { $min: "$aqi" },
          avgPm25: { $avg: "$pm25" },
          avgRisk: { $avg: "$risk" },
          avgEco: { $avg: "$eco" },
          avgWater: { $avg: "$water" },
          avgCarbon: { $avg: "$carbon" },
          worstCity: { $first: "$cityName" },
        },
      },
    ]);

    const s = summary[0] ?? {};
    res.json({
      success: true,
      data: {
        cityCount: s.cityCount ?? 0,
        avgAqi: Math.round((s.avgAqi ?? 0) * 10) / 10,
        maxAqi: Math.round(s.maxAqi ?? 0),
        minAqi: Math.round(s.minAqi ?? 0),
        avgPm25: Math.round((s.avgPm25 ?? 0) * 10) / 10,
        avgRisk: Math.round((s.avgRisk ?? 0) * 10) / 10,
        avgEco: Math.round((s.avgEco ?? 0) * 10) / 10,
        avgWater: Math.round((s.avgWater ?? 0) * 10) / 10,
        avgCarbon: Math.round((s.avgCarbon ?? 0) * 100) / 100,
        generatedAt: new Date(),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Phase 2 (Smart Map GIS upgrade): Geocoded complaints for map markers ────
// Returns only complaints that have lat/lng set, scoped to a city. Used by the
// "Complaints" marker layer on the Smart Map. Read-only — reuses the existing
// Complaint collection/model, no new system.
export async function getMapComplaints(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { cityId } = req.params;
    const id = cityId.toLowerCase();

    const complaints = await Complaint.find({
      cityId: id,
      "location.lat": { $exists: true, $ne: null },
      "location.lng": { $exists: true, $ne: null },
    })
      .select("title issueType severity status location createdAt")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json({
      success: true,
      data: complaints.map((c) => ({
        id: String(c._id),
        title: c.title,
        issueType: c.issueType,
        severity: c.severity,
        status: c.status,
        lat: c.location.lat as number,
        lng: c.location.lng as number,
        address: c.location.address ?? "",
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}
