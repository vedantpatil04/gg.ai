import { LiveAqiHero } from "@/components/environment/env-live-aqi-hero";
import { EnvPlaceholderCard } from "@/components/environment/env-placeholder-card";
import { CloudSun, TrendingUp, Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export function WeatherOverview() {
  return (
    <EnvPlaceholderCard
      icon={CloudSun}
      title="Weather Intelligence"
      description="Micro-climate temperature, humidity, wind, and atmospheric pressure metrics."
      phase={3}
    />
  );
}

export function AqiTrendOverview() {
  return (
    <EnvPlaceholderCard
      icon={TrendingUp}
      title="AQI Trend Analysis"
      description="24-hour historical air quality trajectory and predictive trend model."
      phase={3}
    />
  );
}

export function EnvironmentalContext() {
  return (
    <EnvPlaceholderCard
      icon={Compass}
      title="Environmental Context & Recommendations"
      description="Contextual health advisories and environmental impact assessments."
      phase={3}
    />
  );
}

/**
 * Environmental Overview — "AQI & Weather Intelligence" section (Phase 3).
 */
export function AqiWeatherIntelligence({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <LiveAqiHero />
        <WeatherOverview />
      </div>
      <AqiTrendOverview />
      <EnvironmentalContext />
    </div>
  );
}
