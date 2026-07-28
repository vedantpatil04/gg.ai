import mongoose, { Document, Schema, Model } from "mongoose";

// ─── Sub-document types ───────────────────────────────────────────────────────
export interface IWaterBody {
  /** Short stable ID, e.g. "aw1" */
  id: string;
  /** Human-readable name, e.g. "Sabarmati River" */
  name: string;
  /** Legacy SVG canvas X position (0–100 percentage). Retained for the drawer list. */
  x: number;
  /** Legacy SVG canvas Y position (0–100 percentage). Retained for the drawer list. */
  y: number;
  /**
   * Real-world coordinates (Phase 1 GIS upgrade). Optional so any future
   * record created without them still validates; the live map only renders
   * a water-body marker on the GIS canvas when both are present.
   */
  latitude?: number;
  longitude?: number;
}

export interface IEnvZones {
  /** Percentage of city area classified as residential */
  residential: number;
  /** Percentage of city area classified as industrial */
  industrial: number;
  /** Percentage of city area classified as commercial */
  commercial: number;
  /** Percentage of city area that is green / park / forest */
  greenCover: number;
}

// ─── Document interface ───────────────────────────────────────────────────────
export interface ICityMapConfig extends Document {
  /** Matches cityId in EnvironmentalData (lowercase) */
  cityId: string;
  /** Real-world map centre */
  center: { lat: number; lng: number };
  /** Default zoom level for a real tile-layer (informational) */
  zoom: number;
  /** Map bearing in degrees (0–360). Optional — defaults to 0 (north-up). */
  bearing?: number;
  /** Map pitch / tilt in degrees (0–60). Optional — defaults to 0 (top-down). */
  pitch?: number;
  /** Notable water bodies shown as blue dots in the water layer */
  waterBodies: IWaterBody[];
  /** Land-use zone percentages for the sidebar panel */
  zones: IEnvZones;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const WaterBodySchema = new Schema<IWaterBody>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    x: { type: Number, required: true, min: 0, max: 100 },
    y: { type: Number, required: true, min: 0, max: 100 },
    latitude: { type: Number, required: false, min: -90, max: 90 },
    longitude: { type: Number, required: false, min: -180, max: 180 },
  },
  { _id: false },
);

const CityMapConfigSchema = new Schema<ICityMapConfig>(
  {
    cityId: { type: String, required: true, unique: true, lowercase: true, trim: true },
    center: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    zoom: { type: Number, default: 12 },
    bearing: { type: Number, default: 0, min: 0, max: 360 },
    pitch: { type: Number, default: 0, min: 0, max: 60 },
    waterBodies: { type: [WaterBodySchema], default: [] },
    zones: {
      residential: { type: Number, default: 50 },
      industrial: { type: Number, default: 20 },
      commercial: { type: Number, default: 20 },
      greenCover: { type: Number, default: 10 },
    },
  },
  { timestamps: true },
);

export const CityMapConfig: Model<ICityMapConfig> =
  mongoose.models.CityMapConfig ||
  mongoose.model<ICityMapConfig>("CityMapConfig", CityMapConfigSchema);
