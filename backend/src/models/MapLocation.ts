import mongoose, { Document, Schema, Model } from "mongoose";

// ─── Location category enum ──────────────────────────────────────────────────
export type LocationCategory =
  "industrial" | "residential" | "commercial" | "park" | "water" | "landmark";

// ─── Sensor type enum (device/event axis, independent of land-use category) ──
export type SensorType =
  "environmental" | "weather" | "water" | "industrial" | "traffic" | "complaint" | "alert";

// ─── Document interface ───────────────────────────────────────────────────────
export interface IMapLocation extends Document {
  /** Matches cityId in EnvironmentalData (lowercase) */
  cityId: string;
  /** Stable, short identifier unique within a city: "a1", "b3", etc. */
  locationId: string;
  /** Human-readable place name */
  name: string;
  /** Zone / land-use type */
  category: LocationCategory;
  /** Real-world latitude */
  latitude: number;
  /** Real-world longitude */
  longitude: number;
  /** SVG canvas X position (0–100 percentage) */
  mapX: number;
  /** SVG canvas Y position (0–100 percentage) */
  mapY: number;
  /**
   * Multiplied with the city's live AQI to produce the location's pollution
   * level: level = min(100, round(cityAQI × pollutionMultiplier))
   *
   * Typical ranges:
   *   industrial hot zone  1.2 – 1.5
   *   commercial / traffic 0.9 – 1.1
   *   residential          0.6 – 0.9
   *   park / green space   0.3 – 0.5
   *   water body           0.2 – 0.4
   *   landmark / historic  0.5 – 0.9
   */
  pollutionMultiplier: number;
  /** Whether a physical sensor node is deployed here */
  sensorAvailable: boolean;
  /**
   * Device/event type for marker styling, independent of land-use `category`.
   * Optional — falls back to "environmental" when not set (e.g. legacy docs).
   */
  sensorType?: SensorType;
  /** Short context blurb shown in tooltips / detail panels */
  description: string;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const MapLocationSchema = new Schema<IMapLocation>(
  {
    cityId: { type: String, required: true, lowercase: true, index: true },
    locationId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["industrial", "residential", "commercial", "park", "water", "landmark"],
      required: true,
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    mapX: { type: Number, required: true, min: 0, max: 100 },
    mapY: { type: Number, required: true, min: 0, max: 100 },
    pollutionMultiplier: { type: Number, required: true, default: 1.0, min: 0 },
    sensorAvailable: { type: Boolean, default: false },
    sensorType: {
      type: String,
      enum: ["environmental", "weather", "water", "industrial", "traffic", "complaint", "alert"],
      default: "environmental",
    },
    description: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

// Compound unique index: one locationId per city
MapLocationSchema.index({ cityId: 1, locationId: 1 }, { unique: true });

export const MapLocation: Model<IMapLocation> =
  mongoose.models.MapLocation || mongoose.model<IMapLocation>("MapLocation", MapLocationSchema);
