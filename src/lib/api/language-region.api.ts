import client from "./client";

export const SUPPORTED_LANGUAGES = ["en", "hi", "kn", "mr"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];

export const TIME_FORMATS = ["12h", "24h"] as const;
export type TimeFormat = (typeof TIME_FORMATS)[number];

export const NUMBER_FORMATS = ["1,234.56", "1.234,56"] as const;
export type NumberFormat = (typeof NUMBER_FORMATS)[number];

export const MEASUREMENT_UNITS = ["metric", "imperial"] as const;
export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];

export const AUTO_TIMEZONE = "auto";

export interface LanguageRegionPreferences {
  language: Language;
  timezone: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  numberFormat: NumberFormat;
  measurementUnit: MeasurementUnit;
}

export const languageRegionApi = {
  get: () =>
    client
      .get<{ success: boolean; data: { languageRegion: LanguageRegionPreferences } }>("/settings/language-region")
      .then((r) => r.data),

  // Partial update — only the included fields are touched server-side.
  update: (patch: Partial<LanguageRegionPreferences>) =>
    client
      .patch<{ success: boolean; data: { languageRegion: LanguageRegionPreferences } }>("/settings/language-region", patch)
      .then((r) => r.data),
};
