import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICity extends Document {
  cityId: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  timezone?: string;
  isActive: boolean;
}

const CitySchema = new Schema<ICity>(
  {
    cityId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
    timezone: {
      type: String,
      default: "UTC",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export const City: Model<ICity> = mongoose.models.City || mongoose.model<ICity>("City", CitySchema);
