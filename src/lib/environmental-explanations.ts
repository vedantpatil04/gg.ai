/**
 * Environmental Overview — Phase 2 explanatory content.
 *
 * Everything here is static, scientifically general copy — never a
 * fabricated number, threshold, or per-pollutant severity band. The app's
 * only authoritative severity system is the AQI banding in
 * `src/lib/mock-data.ts` (`AQI_BANDS` / `findAqiBand`); individual
 * pollutants do not have their own severity bands anywhere in the current
 * implementation, so pollutant "today's reading" copy is generated from the
 * overall AQI band rather than inventing a parallel threshold system for
 * PM2.5/PM10/O₃ specifically.
 */

export const AQI_MEANING =
  "AQI condenses multiple pollutant measurements into a single number on a common scale, making air quality easier to read and compare at a glance than looking at each pollutant separately.";

export interface PollutantExplanation {
  key: "pm25" | "pm10" | "o3" | "no2" | "co" | "so2";
  /** Matches the label already used in env-current-conditions.tsx. */
  label: string;
  whatItIs: string;
  commonSources: string;
  whyItMatters: string;
}

export const POLLUTANT_EXPLANATIONS: Record<string, PollutantExplanation> = {
  pm25: {
    key: "pm25",
    label: "PM2.5",
    whatItIs: "Fine airborne particles smaller than 2.5 micrometres across.",
    commonSources:
      "Commonly comes from vehicle exhaust, combustion, industrial activity, and smoke.",
    whyItMatters:
      "Particles this small can be inhaled deeply, which is why PM2.5 is one of the most widely tracked air quality indicators.",
  },
  pm10: {
    key: "pm10",
    label: "PM10",
    whatItIs: "Airborne particles up to 10 micrometres across — larger than PM2.5.",
    commonSources: "Commonly comes from dust, pollen, construction activity, and road wear.",
    whyItMatters:
      "These particles are larger than PM2.5 but can still affect air quality and are tracked alongside it.",
  },
  o3: {
    key: "o3",
    label: "O₃",
    whatItIs: "Ground-level ozone, a gas formed near the earth's surface.",
    commonSources:
      "Forms when pollutants from vehicles and industry react in sunlight, rather than being emitted directly.",
    whyItMatters:
      "As a reactive gas, ground-level ozone is a core measurement in most air quality indexes, including AQI.",
  },
  no2: {
    key: "no2",
    label: "NO₂",
    whatItIs: "Nitrogen dioxide, a gas produced by combustion.",
    commonSources: "Commonly comes from vehicle engines and power generation.",
    whyItMatters: "It's a widely tracked marker of combustion-related air pollution.",
  },
  co: {
    key: "co",
    label: "CO",
    whatItIs: "Carbon monoxide, a colourless, odourless gas.",
    commonSources: "Commonly comes from incomplete combustion, such as vehicle engines.",
    whyItMatters: "It's a standard component of most air quality monitoring systems.",
  },
  so2: {
    key: "so2",
    label: "SO₂",
    whatItIs: "Sulfur dioxide, a gas released when sulfur-containing fuels are burned.",
    commonSources: "Commonly comes from industrial activity and fossil fuel combustion.",
    whyItMatters: "It's tracked as an indicator of industrial and combustion-related emissions.",
  },
};

export interface WeatherExplanation {
  key: "temp" | "humidity" | "wind" | "pressure";
  label: string;
  description: string;
}

export const WEATHER_EXPLANATIONS: Record<string, WeatherExplanation> = {
  temp: {
    key: "temp",
    label: "Temperature",
    description: "The ambient air temperature measured at this location.",
  },
  humidity: {
    key: "humidity",
    label: "Humidity",
    description:
      "The amount of moisture in the air, shown as a percentage of the maximum the air can hold at the current temperature.",
  },
  wind: {
    key: "wind",
    label: "Wind",
    description:
      "The measured speed of air movement at this location, which can play a role in how pollutants spread or accumulate over time.",
  },
  pressure: {
    key: "pressure",
    label: "Pressure",
    description: "Atmospheric pressure measured at this location, in hectopascals.",
  },
};
