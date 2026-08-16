import { Request, Response, NextFunction } from "express";
import { City } from "../models/City";
import { AppError } from "../middleware/errorHandler";
import { getCityForecast } from "../services/forecastProvider.service";

// ─── GreenGuard Forecast Center — Phase 1: Real Forecast Data Foundation ─────
// This controller previously generated forecast values with a seeded random
// walk (see git history). It now sources hourly/daily AQI + weather forecast
// data from the real provider integration in forecastProvider.service.ts.
// No forecast measurement in this file is generated, guessed, or AI-produced.
//
// The response shape is kept compatible with the existing frontend contract
// (`series`, `advisories`, `weekly`) — see src/routes/forecast.tsx — while
// adding the richer `location` / `daily` / `metadata` fields described in the
// Phase 1 forecast data contract. Fields with no real data available are
// returned as `null`, never fabricated.

type AdvisoryTone = "success" | "warning" | "destructive";
interface Advisory {
  period: string;
  status: string;
  desc: string;
  tone: AdvisoryTone;
}

function average(values: Array<number | null>): number | null {
  const finite = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!finite.length) return null;
  return Math.round(finite.reduce((s, v) => s + v, 0) / finite.length);
}

function peakOf(values: Array<number | null>): number | null {
  const finite = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return finite.length ? Math.max(...finite) : null;
}

// ─── Get hourly AQI/weather forecast for a city ──────────────────────────────
export async function getForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cityId = req.params.cityId.toLowerCase();
    const hours = Math.min(Math.max(Number(req.query.hours) || 48, 1), 168);

    const city = await City.findOne({ cityId, isActive: true }).lean();
    if (!city) return next(new AppError("City not found", 404));

    const timezone = city.timezone || "UTC";
    const bundle = await getCityForecast({ cityId: city.cityId, lat: city.lat, lng: city.lng, timezone, hours });

    if (!bundle || bundle.hourly.length === 0) {
      return next(new AppError("Forecast data is temporarily unavailable for this city", 503));
    }

    const hourlyWindow = bundle.hourly.slice(0, hours);

    // AQI chart series — kept in the shape the existing Forecast Center page
    // expects (hour/label/predicted/lower/upper), with the real hourly
    // weather + pollutant fields attached alongside for the broader Phase 1
    // hourly contract. No genuine confidence interval exists for a single
    // point forecast like this, so lower/upper mirror the real predicted
    // value rather than an invented uncertainty band.
    const series = hourlyWindow.map((point, i) => ({
      hour: i,
      label: i % (hours > 48 ? 12 : 6) === 0 ? `+${i}h` : "",
      timestamp: point.timestamp,
      predicted: point.aqi,
      lower: point.aqi,
      upper: point.aqi,
      temperature: point.temperature,
      humidity: point.humidity,
      windSpeed: point.windSpeed,
      windDirection: point.windDirection,
      weatherCode: point.weatherCode,
      precipitationProbability: point.precipitationProbability,
      precipitation: point.precipitation,
      pm25: point.pm25,
      pm10: point.pm10,
      no2: point.no2,
      o3: point.o3,
    }));

    const aqiValues = series.map((s) => s.predicted);
    const avg = average(aqiValues);
    const peak = peakOf(aqiValues);
    const peakHour = peak !== null ? series.findIndex((s) => s.predicted === peak) : -1;

    // Advisories: same threshold-band presentation the Forecast Center already
    // renders, now driven end-to-end by the real hourly series instead of a
    // random walk. Each period's status/description is computed from real
    // averaged AQI for that specific window — nothing here is canned text
    // unrelated to the actual forecast.
    const period48 = average(series.slice(24, 48).map((s) => s.predicted));
    const period72 = average(series.slice(48, 72).map((s) => s.predicted));

    const advisories: Advisory[] = [];
    if (hours >= 24 && avg !== null) {
      advisories.push({
        period: "Next 24h",
        status: avg < 100 ? "Moderate" : avg < 150 ? "Elevated" : "High",
        desc:
          avg < 100
            ? `Acceptable air quality forecast (avg AQI ${avg}). Sensitive groups may experience minor discomfort.`
            : `Elevated pollution forecast (avg AQI ${avg}). Consider reducing outdoor exertion.`,
        tone: avg < 100 ? "success" : avg < 150 ? "warning" : "destructive",
      });
    }
    if (hours >= 48 && period48 !== null) {
      advisories.push({
        period: "24–48h",
        status: period48 < 100 ? "Recovery" : period48 < 150 ? "Elevated" : "High",
        desc:
          period48 < 100
            ? `Air quality expected to remain favorable (avg AQI ${period48}).`
            : `Elevated pollution projected (avg AQI ${period48}). Monitor sensitive locations.`,
        tone: period48 < 100 ? "success" : period48 < 150 ? "warning" : "destructive",
      });
    }
    if (hours >= 72 && period72 !== null) {
      advisories.push({
        period: "48–72h",
        status: period72 < 100 ? "Recovery" : period72 < 150 ? "Elevated" : "High",
        desc:
          period72 < 100
            ? `Air quality expected to remain favorable (avg AQI ${period72}).`
            : `Elevated pollution projected (avg AQI ${period72}). Continue monitoring sensitive areas.`,
        tone: period72 < 100 ? "success" : period72 < 150 ? "warning" : "destructive",
      });
    }

    res.json({
      success: true,
      data: {
        cityId: city.cityId,
        cityName: city.name,
        location: {
          cityId: city.cityId,
          cityName: city.name,
          country: city.country,
          latitude: city.lat,
          longitude: city.lng,
          timezone,
        },
        hours,
        peak,
        avg,
        peakHour: peakHour >= 0 ? peakHour : null,
        series,
        daily: bundle.daily,
        advisories,
        metadata: {
          source: bundle.source,
          fetchedAt: bundle.fetchedAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Get 7-day outlook for a city ────────────────────────────────────────────
export async function getWeeklyOutlook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cityId = req.params.cityId.toLowerCase();

    const city = await City.findOne({ cityId, isActive: true }).lean();
    if (!city) return next(new AppError("City not found", 404));

    const timezone = city.timezone || "UTC";
    const bundle = await getCityForecast({ cityId: city.cityId, lat: city.lat, lng: city.lng, timezone, hours: 168 });

    if (!bundle || bundle.daily.length === 0) {
      return next(new AppError("Weekly forecast data is temporarily unavailable for this city", 503));
    }

    const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
    // `date` is already the calendar day local to the city's own timezone
    // (Open-Meteo resolves it using the &timezone= param) — format it as a
    // plain UTC calendar date so we don't accidentally shift it again.
    const dayLabel = (dateStr: string): string => {
      const [y, m, d] = dateStr.split("-").map(Number);
      return weekdayFormatter.format(new Date(Date.UTC(y, m - 1, d)));
    };

    const weekly = bundle.daily.slice(0, 7).map((d) => ({
      day: dayLabel(d.date),
      date: d.date,
      aqi: d.aqi,
      pm25: d.pm25,
      pm10: d.pm10,
      no2: d.no2,
      temperatureMin: d.temperatureMin,
      temperatureMax: d.temperatureMax,
      humidity: d.humidity,
      windSpeed: d.windSpeed,
      weatherCode: d.weatherCode,
      precipitationProbability: d.precipitationProbability,
      precipitation: d.precipitation,
    }));

    res.json({
      success: true,
      data: {
        cityId: city.cityId,
        cityName: city.name,
        weekly,
        metadata: {
          source: bundle.source,
          fetchedAt: bundle.fetchedAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
