import { motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, MinusCircle, Wind, Leaf, Zap, Droplets, CloudFog, Activity } from "lucide-react";
import { Panel } from "@/components/ui-bits";
import type { City } from "@/lib/mock-data";

interface PerformanceItem {
  id: string;
  name: string;
  icon: typeof Wind;
  value: string;
  status: string;
  detail: string;
  accent: string;
}

export function SustainabilityPerformance({ city }: { city: City }) {
  const aqi = city.aqi;
  const greenCover = city.greenCover ?? null;
  const renewableShare = city.renewableShare ?? null;
  const water = city.water;
  const carbon = city.carbon;
  const eco = city.eco;

  // ── Deterministic categorization logic ───────────────────────────────────
  const strong: PerformanceItem[] = [];
  const needsImprovement: PerformanceItem[] = [];
  const stable: PerformanceItem[] = [];

  // EcoScore evaluation
  if (eco >= 75) {
    strong.push({
      id: "eco",
      name: "EcoScore Rating",
      icon: Activity,
      value: `${eco}/100`,
      status: "Optimal Composite",
      detail: `Composite environmental performance index meets municipal Grade ${city.ecoScore?.grade ?? "A"} standard.`,
      accent: "var(--color-primary)",
    });
  } else if (eco < 55) {
    needsImprovement.push({
      id: "eco",
      name: "EcoScore Rating",
      icon: Activity,
      value: `${eco}/100`,
      status: "Below Benchmark",
      detail: `Overall composite score is constrained by environmental pressure points.`,
      accent: "var(--color-warning)",
    });
  } else {
    stable.push({
      id: "eco",
      name: "EcoScore Rating",
      icon: Activity,
      value: `${eco}/100`,
      status: "Moderate Baseline",
      detail: `Composite index remains within standard operational boundaries.`,
      accent: "var(--color-info)",
    });
  }

  // Air Quality (AQI) evaluation
  if (aqi <= 70) {
    strong.push({
      id: "aqi",
      name: "Air Quality",
      icon: Wind,
      value: `${aqi} AQI`,
      status: "Healthy Range",
      detail: `Ambient air quality is within safe regulatory thresholds with minimal health risk.`,
      accent: "var(--color-success)",
    });
  } else if (aqi >= 120) {
    needsImprovement.push({
      id: "aqi",
      name: "Air Quality",
      icon: Wind,
      value: `${aqi} AQI`,
      status: "Elevated Particulates",
      detail: `Particulate concentrations exceed the 100 AQI reference limit and require mitigation.`,
      accent: "var(--color-destructive)",
    });
  } else {
    stable.push({
      id: "aqi",
      name: "Air Quality",
      icon: Wind,
      value: `${aqi} AQI`,
      status: "Moderate Band",
      detail: `Pollutant levels remain within acceptable urban baseline limits.`,
      accent: "var(--color-warning)",
    });
  }

  // Green Cover evaluation
  if (greenCover != null) {
    if (greenCover >= 30) {
      strong.push({
        id: "green",
        name: "Green Canopy",
        icon: Leaf,
        value: `${greenCover}%`,
        status: "Target Exceeded",
        detail: `Canopy coverage exceeds the 30% municipal urban forestry benchmark.`,
        accent: "var(--color-success)",
      });
    } else if (greenCover < 25) {
      needsImprovement.push({
        id: "green",
        name: "Green Canopy",
        icon: Leaf,
        value: `${greenCover}%`,
        status: "Below 30% Target",
        detail: `Urban canopy coverage is ${30 - greenCover}% below the recommended ecological threshold.`,
        accent: "var(--color-warning)",
      });
    } else {
      stable.push({
        id: "green",
        name: "Green Canopy",
        icon: Leaf,
        value: `${greenCover}%`,
        status: "Near Baseline",
        detail: `Canopy coverage is approaching target compliance.`,
        accent: "var(--color-info)",
      });
    }
  }

  // Renewable Energy evaluation
  if (renewableShare != null) {
    if (renewableShare >= 35) {
      strong.push({
        id: "renew",
        name: "Renewable Share",
        icon: Zap,
        value: `${renewableShare}%`,
        status: "Target Achieved",
        detail: `Clean energy generation share meets or exceeds the 35% grid consumption target.`,
        accent: "var(--color-success)",
      });
    } else if (renewableShare < 25) {
      needsImprovement.push({
        id: "renew",
        name: "Renewable Share",
        icon: Zap,
        value: `${renewableShare}%`,
        status: "Fossil Dependent",
        detail: `Renewable share is ${35 - renewableShare}% below the 35% municipal transition goal.`,
        accent: "var(--color-warning)",
      });
    } else {
      stable.push({
        id: "renew",
        name: "Renewable Share",
        icon: Zap,
        value: `${renewableShare}%`,
        status: "Moderate Grid Share",
        detail: `Grid transition is maintaining baseline progress toward the 35% mark.`,
        accent: "var(--color-info)",
      });
    }
  }

  // Water Quality evaluation
  if (water >= 75) {
    strong.push({
      id: "water",
      name: "Water Quality",
      icon: Droplets,
      value: `${water}%`,
      status: "Quality Standard Met",
      detail: `Telemetry index satisfies the 75% surface and potable purity benchmark.`,
      accent: "var(--color-success)",
    });
  } else if (water < 60) {
    needsImprovement.push({
      id: "water",
      name: "Water Quality",
      icon: Droplets,
      value: `${water}%`,
      status: "Quality Stress",
      detail: `Index is ${75 - water}% below the 75% municipal sustainability threshold.`,
      accent: "var(--color-destructive)",
    });
  } else {
    stable.push({
      id: "water",
      name: "Water Quality",
      icon: Droplets,
      value: `${water}%`,
      status: "Acceptable Envelope",
      detail: `Water purity and treatment indicators remain within standard tolerances.`,
      accent: "var(--color-info)",
    });
  }

  // Carbon Intensity evaluation
  if (carbon <= 5.0) {
    strong.push({
      id: "carbon",
      name: "Carbon Intensity",
      icon: CloudFog,
      value: `${carbon.toFixed(1)} tCO₂`,
      status: "Low Emissions",
      detail: `Per-capita carbon intensity remains well below the 6.0 tCO₂ municipal ceiling.`,
      accent: "var(--color-success)",
    });
  } else if (carbon >= 7.5) {
    needsImprovement.push({
      id: "carbon",
      name: "Carbon Intensity",
      icon: CloudFog,
      value: `${carbon.toFixed(1)} tCO₂`,
      status: "High Emissions",
      detail: `Per-capita emissions exceed the 7.0 tCO₂ high-intensity threshold.`,
      accent: "var(--color-destructive)",
    });
  } else {
    stable.push({
      id: "carbon",
      name: "Carbon Intensity",
      icon: CloudFog,
      value: `${carbon.toFixed(1)} tCO₂`,
      status: "Standard Envelope",
      detail: `Carbon generation rate is aligned with regional municipal baselines.`,
      accent: "var(--color-info)",
    });
  }

  const categories = [
    {
      title: "Strong Performance",
      badge: "Target Met / Optimal",
      tone: "var(--color-success)",
      icon: CheckCircle2,
      items: strong,
      empty: "No metrics currently exceeding optimal benchmarks.",
    },
    {
      title: "Needs Improvement",
      badge: "Under Target / Attention",
      tone: "var(--color-warning)",
      icon: AlertTriangle,
      items: needsImprovement,
      empty: "No metrics currently identified as critical concerns.",
    },
    {
      title: "Stable",
      badge: "Baseline / Normal",
      tone: "var(--color-info)",
      icon: MinusCircle,
      items: stable,
      empty: "No metrics currently in moderate holding pattern.",
    },
  ];

  return (
    <Panel
      eyebrow="Performance Analytics"
      title="Sustainability Performance"
      action={
        <span className="text-xs text-muted-foreground font-medium">
          Deterministic classification
        </span>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {categories.map((cat, idx) => (
          <motion.div
            key={cat.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.08 }}
            className="rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden"
          >
            <div>
              {/* Category Header */}
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <cat.icon className="size-4.5" style={{ color: cat.tone }} aria-hidden="true" />
                  <h3 className="text-sm font-bold text-foreground">{cat.title}</h3>
                </div>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    color: cat.tone,
                    background: `color-mix(in oklab, ${cat.tone} 14%, transparent)`,
                  }}
                >
                  {cat.items.length}
                </span>
              </div>

              {/* Items List */}
              {cat.items.length > 0 ? (
                <div className="space-y-3">
                  {cat.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border/50 bg-white/[0.02] p-3 hover:border-primary/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <item.icon className="size-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                          <span className="text-xs font-bold text-foreground truncate">{item.name}</span>
                        </div>
                        <span className="text-xs font-extrabold tabular-nums text-foreground shrink-0">
                          {item.value}
                        </span>
                      </div>
                      <div className="text-[10px] font-semibold mb-1" style={{ color: item.accent }}>
                        {item.status}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground italic">
                  {cat.empty}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </Panel>
  );
}
