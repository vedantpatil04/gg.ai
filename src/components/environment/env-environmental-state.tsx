import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { Wind, Droplets, ShieldCheck, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SECTION 03 — ENVIRONMENTAL STATE
 *
 * Translates raw environmental readings into three deterministic, understandable environmental states:
 *  1. Air Quality (status, supporting measurement, explanation)
 *  2. Atmospheric Conditions (status, supporting measurement, explanation)
 *  3. Moisture (status, supporting measurement, explanation)
 *
 * Built strictly on deterministic rules calculated from real readings.
 */

interface StateCardProps {
  title: string;
  status: string;
  statusColor?: string;
  measurement: string;
  explanation: string;
  icon: React.ReactNode;
}

function StateCard({ title, status, statusColor, measurement, explanation, icon }: StateCardProps) {
  return (
    <div className="flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-border/80 bg-card/70 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-muted text-foreground/80">{icon}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
        </div>
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full"
          style={
            statusColor
              ? {
                  color: statusColor,
                  background: `color-mix(in oklab, ${statusColor} 14%, transparent)`,
                }
              : undefined
          }
        >
          <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
          {status}
        </span>
      </div>

      <div className="space-y-1">
        <div className="text-sm font-semibold tabular-nums text-foreground">{measurement}</div>
        <p className="text-xs text-muted-foreground leading-relaxed">{explanation}</p>
      </div>
    </div>
  );
}

export function EnvironmentalState({ className }: { className?: string }) {
  const { city, isCityListLoading, isCityError } = useCity();

  if (isCityListLoading || isCityError || !city || typeof city.aqi !== "number") {
    return null;
  }

  const band = findAqiBand(city.aqi);

  // 1. Air Quality State
  const aqiStatus = band.label;
  const aqiMeasurement = `AQI ${city.aqi}${typeof city.pm25 === "number" ? ` · PM2.5 ${city.pm25} µg/m³` : ""}`;
  let aqiExplanation = "Air quality is satisfactory and poses little to no health risk.";
  if (city.aqi > 150) {
    aqiExplanation = "Elevated particulate concentrations present; sensitive groups should avoid exposure.";
  } else if (city.aqi > 100) {
    aqiExplanation = "Air quality is moderate with slight accumulation of fine airborne particles.";
  } else if (city.aqi > 50) {
    aqiExplanation = "Air quality is acceptable; minor pollutant concentrations within normal limits.";
  }

  // 2. Atmospheric Conditions State
  let atmosphericStatus = "Stable";
  let atmosphericColor = "var(--color-success)";
  let atmosphericExplanation = "Normal atmospheric conditions supporting steady local air circulation.";

  if (typeof city.windSpeed === "number" && city.windSpeed > 25) {
    atmosphericStatus = "Breezy";
    atmosphericColor = "var(--color-primary)";
    atmosphericExplanation = "Active surface airflow promoting rapid particulate dispersion.";
  } else if (typeof city.temp === "number" && city.temp > 35) {
    atmosphericStatus = "High Thermal Load";
    atmosphericColor = "var(--color-warning, #f59e0b)";
    atmosphericExplanation = "Elevated ambient heat index with reduced natural ventilation.";
  } else if (typeof city.temp === "number" && city.temp < 15) {
    atmosphericStatus = "Cool Ambient";
    atmosphericColor = "var(--color-chart-2, #38bdf8)";
    atmosphericExplanation = "Lower thermal boundary layer with cooler ground air temperatures.";
  }

  const tempPart = typeof city.temp === "number" ? `${city.temp}°C` : "";
  const windPart = typeof city.windSpeed === "number" ? `Wind ${city.windSpeed} km/h` : "";
  const atmosphericMeasurement = [tempPart, windPart].filter(Boolean).join(" · ") || "Atmospheric telemetry active";

  // 3. Moisture State
  let moistureStatus = "Normal";
  let moistureColor = "var(--color-chart-2, #38bdf8)";
  let moistureExplanation = "Comfortable relative humidity within normal atmospheric bounds.";

  if (typeof city.humidity === "number") {
    if (city.humidity >= 75) {
      moistureStatus = "High";
      moistureColor = "var(--color-chart-2, #0284c7)";
      moistureExplanation = "Elevated ambient moisture typical of humid or monsoon airflow.";
    } else if (city.humidity < 40) {
      moistureStatus = "Low";
      moistureColor = "var(--color-warning, #f59e0b)";
      moistureExplanation = "Dry ambient atmosphere with low water vapor retention.";
    }
  }

  const moistureMeasurement =
    typeof city.humidity === "number"
      ? `${city.humidity}% Relative Humidity`
      : "Moisture monitoring active";

  return (
    <section aria-labelledby="env-state-title" className={cn("space-y-3.5", className)}>
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-px rounded-full bg-foreground/30" aria-hidden="true" />
        <span
          id="env-state-title"
          className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground"
        >
          Environmental State
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <StateCard
          title="Air Quality"
          status={aqiStatus}
          statusColor={band.color}
          measurement={aqiMeasurement}
          explanation={aqiExplanation}
          icon={<ShieldCheck className="size-4" style={{ color: band.color }} aria-hidden="true" />}
        />

        <StateCard
          title="Atmospheric Conditions"
          status={atmosphericStatus}
          statusColor={atmosphericColor}
          measurement={atmosphericMeasurement}
          explanation={atmosphericExplanation}
          icon={<Wind className="size-4 text-primary" aria-hidden="true" />}
        />

        <StateCard
          title="Moisture"
          status={moistureStatus}
          statusColor={moistureColor}
          measurement={moistureMeasurement}
          explanation={moistureExplanation}
          icon={<Droplets className="size-4 text-sky-500" aria-hidden="true" />}
        />
      </div>
    </section>
  );
}
