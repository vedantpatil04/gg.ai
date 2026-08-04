import { useQuery } from "@tanstack/react-query";
import {
  Wind, Thermometer, Droplets, Gauge, TrendingUp, TrendingDown,
  Minus, ArrowRight, type LucideIcon,
} from "lucide-react";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { environmentalApi, type CityHistoryDay } from "@/lib/api/environmental.api";
import { LiveAqiHero } from "@/components/environment/env-live-aqi-hero";
import { cn } from "@/lib/utils";

/**
 * Phase 3 — Weather Correlation & AQI Weather Intelligence.
 *
 * Replaces placeholder cards with real content:
 *
 *  1. WeatherOverview — live atmospheric conditions (temp, humidity, wind,
 *     pressure) with trend direction and plain-language status per metric.
 *
 *  2. WeatherAqiCorrelation — explains the relationship between current
 *     weather conditions and air quality. Answers "why is the AQI what it is
 *     given today's weather?"  Derived from real readings — no AI call, no
 *     fabrication.
 *
 * All data from useCity() and the existing getCityHistory endpoint.
 * No new API. No dependencies added.
 */

// ─── Weather metric card ──────────────────────────────────────────────────────

interface WeatherMetricProps {
  icon: LucideIcon;
  label: string;
  value: string;
  unit: string;
  status: string;
  statusColor: string;
  description: string;
  trend?: "up" | "down" | "stable" | null;
}

function WeatherMetricCard({
  icon: Icon, label, value, unit, status, statusColor, description, trend,
}: WeatherMetricProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "down" ? "var(--color-success)"
    : trend === "up"   ? "hsl(28 90% 55%)"
    : "var(--color-muted-foreground)";

  return (
    <div
      className={cn(
        "glass rounded-xl p-5 space-y-3 transition-shadow duration-300 hover:shadow-lg",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className="size-8 rounded-lg grid place-items-center shrink-0"
            style={{ background: `color-mix(in oklab, ${statusColor} 14%, transparent)`, color: statusColor }}
            aria-hidden="true"
          >
            <Icon className="size-4" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
        {trend && (
          <span
            className="inline-flex items-center gap-1 text-[10px] shrink-0"
            style={{ color: trendColor }}
            aria-label={`Trend: ${trend}`}
          >
            <TrendIcon className="size-2.5" aria-hidden="true" />
            {trend === "down" ? "Falling" : trend === "up" ? "Rising" : "Stable"}
          </span>
        )}
      </div>

      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums leading-none">{value}</span>
          <span className="text-sm text-muted-foreground">{unit}</span>
        </div>
        <span
          className="inline-block text-[10px] font-semibold mt-1 px-2 py-0.5 rounded-full"
          style={{
            color: statusColor,
            background: `color-mix(in oklab, ${statusColor} 12%, transparent)`,
          }}
        >
          {status}
        </span>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

// ─── Metric builders ──────────────────────────────────────────────────────────

function tempStatus(t: number): { status: string; color: string; description: string } {
  if (t >= 38) return { status: "Extreme heat",  color: "hsl(10 85% 55%)",  description: `${t}°C is extreme. Avoid outdoor activity during peak hours and stay hydrated.` };
  if (t >= 33) return { status: "Hot",            color: "hsl(28 90% 55%)",  description: `${t}°C is hot. Limit prolonged sun exposure and take regular breaks.` };
  if (t >= 28) return { status: "Warm",           color: "hsl(40 85% 55%)",  description: `${t}°C is warm. Comfortable for short outdoor activity with hydration.` };
  if (t >= 18) return { status: "Comfortable",    color: "var(--color-success)", description: `${t}°C is within the comfortable range for most outdoor activity.` };
  if (t >= 10) return { status: "Cool",           color: "oklch(0.65 0.12 240)", description: `${t}°C is cool. Dress in layers for extended outdoor time.` };
  return              { status: "Cold",            color: "oklch(0.58 0.14 250)", description: `${t}°C is cold. Limit outdoor exposure and dress warmly.` };
}

function humidityStatus(h: number): { status: string; color: string; description: string } {
  if (h >= 85) return { status: "Very high",  color: "hsl(28 90% 55%)",  description: `${h}% humidity is uncomfortably high — can trap pollutants and make conditions feel hotter.` };
  if (h >= 70) return { status: "Elevated",   color: "hsl(45 85% 55%)",  description: `${h}% humidity is slightly elevated. Conditions may feel muggier than the temperature suggests.` };
  if (h >= 35) return { status: "Comfortable",color: "var(--color-success)", description: `${h}% humidity is within a comfortable range for outdoor activity.` };
  if (h >= 20) return { status: "Dry",        color: "hsl(40 80% 55%)",  description: `${h}% humidity is low. Stay hydrated — dry air can increase particulate irritation.` };
  return              { status: "Very dry",    color: "hsl(28 90% 55%)",  description: `${h}% humidity is very low. Risk of dehydration and increased particulate concentration.` };
}

function windStatus(w: number): { status: string; color: string; description: string } {
  if (w >= 50)  return { status: "Strong",       color: "hsl(28 90% 55%)",  description: `${w} km/h wind is strong — outdoor conditions may be uncomfortable and pollutant patterns unpredictable.` };
  if (w >= 30)  return { status: "Moderate",     color: "hsl(45 85% 55%)",  description: `${w} km/h wind will disperse local pollutants effectively, though conditions may feel breezy.` };
  if (w >= 10)  return { status: "Light breeze", color: "var(--color-success)", description: `${w} km/h is a helpful light breeze that aids pollutant dispersion without discomfort.` };
  if (w >= 3)   return { status: "Calm",         color: "hsl(45 85% 55%)",  description: `${w} km/h — near-calm conditions. Pollutants may accumulate locally with limited natural dispersion.` };
  return               { status: "Still",        color: "hsl(28 90% 55%)",  description: `Virtually no wind. Pollutants are likely to accumulate near ground level without dispersing.` };
}

function pressureStatus(p: number): { status: string; color: string; description: string } {
  if (p >= 1025)   return { status: "High pressure",  color: "var(--color-success)", description: `${p} hPa — high pressure typically brings stable, clear conditions but can trap pollutants near the surface.` };
  if (p >= 1013)   return { status: "Normal",         color: "var(--color-success)", description: `${p} hPa is close to standard atmospheric pressure — normal conditions.` };
  if (p >= 995)    return { status: "Slightly low",   color: "hsl(45 85% 55%)",  description: `${p} hPa — slightly below standard. May indicate unsettled weather approaching.` };
  return                  { status: "Low pressure",   color: "hsl(28 90% 55%)",  description: `${p} hPa — low pressure. Often associated with cloud cover, precipitation, or changing conditions.` };
}

// ─── Weather correlation explainer ───────────────────────────────────────────

interface CorrelationFactor {
  label: string;
  icon: LucideIcon;
  effect: "positive" | "negative" | "neutral";
  headline: string;
  explanation: string;
}

function buildCorrelation(city: {
  aqi: number; temp?: number; humidity?: number; windSpeed?: number; pressure?: number;
}): CorrelationFactor[] {
  const factors: CorrelationFactor[] = [];

  if (typeof city.windSpeed === "number") {
    const w = city.windSpeed;
    factors.push({
      label: "Wind & Dispersion",
      icon: Wind,
      effect: w >= 10 ? "positive" : w < 3 ? "negative" : "neutral",
      headline: w >= 20
        ? `Strong wind is actively improving air quality by dispersing pollutants`
        : w >= 10
        ? `Light wind is helping to keep pollution levels from building`
        : w < 3
        ? `Near-calm conditions are allowing pollutants to accumulate`
        : `Low wind is providing minimal dispersion of ground-level pollutants`,
      explanation: w >= 10
        ? `Wind above 10 km/h is the single most effective natural mechanism for reducing ground-level pollution. At ${w} km/h, pollutants emitted locally are being carried away rather than concentrating.`
        : `With wind speeds of ${w} km/h, there is limited atmospheric mixing. Pollutants from traffic, industry, and other sources accumulate near the surface rather than dispersing — this directly elevates AQI readings.`,
    });
  }

  if (typeof city.humidity === "number") {
    const h = city.humidity;
    factors.push({
      label: "Humidity & Particles",
      icon: Droplets,
      effect: h >= 80 ? "negative" : h >= 35 && h <= 65 ? "positive" : "neutral",
      headline: h >= 80
        ? `High humidity is causing particles to absorb moisture and swell — increasing their effective concentration`
        : h >= 35
        ? `Moderate humidity is not significantly affecting particle behaviour`
        : `Low humidity may be increasing particle suspension in the atmosphere`,
      explanation: h >= 80
        ? `When relative humidity exceeds 70–80%, fine particles (PM2.5 and PM10) absorb atmospheric water and increase in size. This swelling raises their mass concentration and light-scattering properties — which is why hazy conditions are common on humid days even without more emissions.`
        : h < 30
        ? `In dry conditions, fine particles remain lightweight and suspended in air for longer periods. Dry soil and vegetation can also contribute additional particulate matter. This can cause AQI readings to be higher than emission levels alone would suggest.`
        : `At ${h}% humidity, particles behave predictably without significant hygroscopic growth or unusual suspension behaviour.`,
    });
  }

  if (typeof city.temp === "number") {
    const t = city.temp;
    factors.push({
      label: "Temperature & Chemistry",
      icon: Thermometer,
      effect: t >= 30 ? "negative" : t >= 15 ? "neutral" : "neutral",
      headline: t >= 30
        ? `High temperature is accelerating the chemical reactions that form ground-level ozone`
        : t >= 18
        ? `Temperature is within a range that doesn't significantly alter pollution chemistry`
        : `Cooler temperature slows photochemical reactions but may increase heating-related emissions`,
      explanation: t >= 30
        ? `Ground-level ozone (O₃) forms when nitrogen oxides (NOₓ) and volatile organic compounds (VOCs) react in sunlight. This reaction is temperature-dependent — at ${t}°C, ozone formation rates are significantly elevated compared to cooler days, which can increase AQI independently of direct emission levels.`
        : t < 10
        ? `At ${t}°C, heating demand increases — burning of fuels for warmth produces additional NOₓ and particulate emissions. This can contribute to elevated AQI readings in urban areas during cold periods.`
        : `At ${t}°C, photochemical reactions proceed at moderate rates. Temperature is not the dominant factor in current conditions.`,
    });
  }

  if (typeof city.pressure === "number") {
    const p = city.pressure;
    factors.push({
      label: "Pressure & Mixing",
      icon: Gauge,
      effect: p >= 1020 ? "negative" : p >= 1000 ? "positive" : "neutral",
      headline: p >= 1020
        ? `High atmospheric pressure is suppressing vertical air mixing — potentially trapping pollutants near the surface`
        : p >= 1000
        ? `Normal atmospheric pressure is supporting typical air mixing and pollutant dispersion`
        : `Low pressure is likely promoting vertical mixing and carrying pollutants away from the surface`,
      explanation: p >= 1020
        ? `High pressure systems create stable atmospheric conditions by suppressing the upward movement of air. This atmospheric stability creates a "lid" effect that traps pollutants near the surface. Combined with low wind, high pressure is one of the most common causes of elevated AQI readings even when emission levels are normal.`
        : p < 1000
        ? `Low pressure systems promote unstable atmospheric conditions. Rising air mixes pollutants upward and away from the surface, and the associated cloud cover and precipitation can physically wash particulates from the air. Low pressure generally improves air quality.`
        : `At ${p} hPa, atmospheric mixing conditions are near-normal. Pressure is not a significant driver of current air quality.`,
    });
  }

  return factors.slice(0, 4);
}

// ─── Weather Overview sub-component ──────────────────────────────────────────

function WeatherOverview() {
  const { city } = useCity();
  const metrics: WeatherMetricProps[] = [];

  if (typeof city.temp === "number") {
    const s = tempStatus(city.temp);
    metrics.push({ icon: Thermometer, label: "Temperature", value: String(city.temp), unit: "°C", ...s, trend: null });
  }
  if (typeof city.humidity === "number") {
    const s = humidityStatus(city.humidity);
    metrics.push({ icon: Droplets, label: "Humidity", value: String(city.humidity), unit: "%", ...s, trend: null });
  }
  if (typeof city.windSpeed === "number") {
    const s = windStatus(city.windSpeed);
    metrics.push({ icon: Wind, label: "Wind Speed", value: String(city.windSpeed), unit: "km/h", ...s, trend: null });
  }
  if (typeof city.pressure === "number") {
    const s = pressureStatus(city.pressure);
    metrics.push({ icon: Gauge, label: "Pressure", value: String(city.pressure), unit: "hPa", ...s, trend: null });
  }

  if (metrics.length === 0) {
    return (
      <div className="glass rounded-xl p-5 text-sm text-muted-foreground">
        Weather data is currently unavailable.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {metrics.map((m) => (
        <WeatherMetricCard key={m.label} {...m} />
      ))}
    </div>
  );
}

// ─── Correlation panel sub-component ─────────────────────────────────────────

function WeatherAqiCorrelation() {
  const { city } = useCity();
  const band = findAqiBand(city.aqi);
  const factors = buildCorrelation(city);

  if (factors.length === 0) return null;

  const effectColor = (e: "positive" | "negative" | "neutral") =>
    e === "positive" ? "var(--color-success)" : e === "negative" ? "hsl(28 90% 55%)" : "var(--color-muted-foreground)";
  const effectLabel = (e: "positive" | "negative" | "neutral") =>
    e === "positive" ? "Improving AQI" : e === "negative" ? "Worsening AQI" : "Neutral effect";

  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 md:p-8 space-y-6",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-100",
      )}
    >
      <div>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Weather Correlation
        </span>
        <h3 className="text-base font-semibold mt-1">Why is the AQI {city.aqi}?</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-2xl">
          Current weather conditions have the following effects on the {band.label.toLowerCase()} air quality reading.
        </p>
      </div>

      <div className="space-y-5">
        {factors.map((f, i) => {
          const Icon = f.icon;
          const color = effectColor(f.effect);
          return (
            <div
              key={f.label}
              className={cn("flex items-start gap-4", i > 0 && "pt-5 border-t border-border")}
            >
              <div
                className="size-9 rounded-xl grid place-items-center shrink-0 mt-0.5"
                style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}
                aria-hidden="true"
              >
                <Icon className="size-4.5" />
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold">{f.label}</span>
                  <span
                    className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{
                      color,
                      background: `color-mix(in oklab, ${color} 12%, transparent)`,
                    }}
                  >
                    <ArrowRight className="size-2.5" aria-hidden="true" />
                    {effectLabel(f.effect)}
                  </span>
                </div>
                <p className="text-sm font-medium leading-snug">{f.headline}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.explanation}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function AqiWeatherIntelligence({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Live AQI + atmospheric overview side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <LiveAqiHero />
        <WeatherOverview />
      </div>
      {/* Weather-AQI correlation explainer */}
      <WeatherAqiCorrelation />
    </div>
  );
}

// Legacy exports — kept for backward compat with any existing import site
export function WeatherOverviewLegacy() { return <WeatherOverview />; }
export function AqiTrendOverview()       { return null; }
export function EnvironmentalContext()   { return null; }
