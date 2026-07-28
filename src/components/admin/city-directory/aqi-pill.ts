import { aqiBand as findAqiBand } from "@/lib/mock-data";

export type AqiPillTone = "success" | "warning" | "destructive";

const TONE_BY_LABEL: Record<string, AqiPillTone> = {
  Good: "success",
  Moderate: "warning",
  "Unhealthy (SG)": "warning",
  Unhealthy: "destructive",
  "Very Unhealthy": "destructive",
  Hazardous: "destructive",
};

/** Reuses the exact AQI band labels already shown on the map and in
 *  Command Center's City Intelligence tab, just mapped onto Pill's tone
 *  enum for consistent rendering across the Administrator Portal. */
export function aqiPill(aqi: number): { label: string; tone: AqiPillTone } {
  const band = findAqiBand(aqi);
  return { label: band.label, tone: TONE_BY_LABEL[band.label] ?? "warning" };
}
