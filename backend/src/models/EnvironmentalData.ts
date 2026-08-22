import mongoose, { Document, Schema } from "mongoose";

export interface IEnvironmentalData extends Document {
  cityId: string;
  cityName: string;
  country: string;
  timestamp: Date;
  // Air quality
  aqi: number;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  co2: number;
  so2?: number;
  co?: number;
  // Water quality
  water: number;
  turbidity?: number;
  dissolvedOxygen?: number;
  ph?: number;
  // Climate
  temp: number;
  humidity: number;
  windSpeed?: number;
  windDirection?: number;
  pressure?: number;
  apparentTemperature?: number;
  weatherCode?: number;
  rainfall?: number;
  rain?: number;
  isDay?: boolean;
  // Sustainability
  carbon: number;
  risk: number;
  eco: number;
  renewableShare?: number;
  greenCover?: number;
  // Location
  lat: number;
  lng: number;
  // Metadata
  source: "sensor" | "satellite" | "manual" | "api";
  sensorId?: string;
}

const EnvironmentalDataSchema = new Schema<IEnvironmentalData>(
  {
    cityId: { type: String, required: true, lowercase: true, index: true },
    cityName: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    timestamp: { type: Date, default: Date.now, index: true },
    // Air quality
    aqi: { type: Number, required: true, min: 0, max: 500 },
    pm25: { type: Number, required: true, min: 0 },
    pm10: { type: Number, required: true, min: 0 },
    no2: { type: Number, required: true, min: 0 },
    o3: { type: Number, required: true, min: 0 },
    co2: { type: Number, required: true, min: 300 },
    so2: { type: Number, min: 0 },
    co: { type: Number, min: 0 },
    // Water
    water: { type: Number, required: true, min: 0, max: 100 },
    turbidity: { type: Number, min: 0 },
    dissolvedOxygen: { type: Number, min: 0 },
    ph: { type: Number, min: 0, max: 14 },
    // Climate
    temp: { type: Number, required: true },
    humidity: { type: Number, required: true, min: 0, max: 100 },
    windSpeed: { type: Number, min: 0 },
    windDirection: { type: Number, min: 0, max: 360 },
    pressure: { type: Number },
    apparentTemperature: { type: Number },
    weatherCode: { type: Number },
    rainfall: { type: Number },
    rain: { type: Number },
    isDay: { type: Boolean },
    // Sustainability
    carbon: { type: Number, required: true, min: 0 },
    risk: { type: Number, required: true, min: 0, max: 100 },
    eco: { type: Number, required: true, min: 0, max: 100 },
    renewableShare: { type: Number, min: 0, max: 100 },
    greenCover: { type: Number, min: 0, max: 100 },
    // Location
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    // Metadata
    source: { type: String, enum: ["sensor", "satellite", "manual", "api"], default: "sensor" },
    sensorId: { type: String },
  },
  { timestamps: true },
);

EnvironmentalDataSchema.index({ cityId: 1, timestamp: -1 });
EnvironmentalDataSchema.index({ timestamp: -1 });

export const EnvironmentalData = mongoose.model<IEnvironmentalData>(
  "EnvironmentalData",
  EnvironmentalDataSchema,
);
