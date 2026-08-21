import { motion } from "framer-motion";
import { Database, Clock, Scale, Sliders, ShieldCheck } from "lucide-react";
import { Panel } from "@/components/ui-bits";
import type { City } from "@/lib/mock-data";
import { formatRelativeTime } from "@/lib/format-time";

export function SustainabilityTransparency({ city, isApiConnected }: { city: City; isApiConnected: boolean }) {
  const updatedText = city.updatedAt ? formatRelativeTime(city.updatedAt) : "Live";

  const cards = [
    {
      icon: Database,
      title: "Data Sources & Ingestion",
      accent: "var(--color-primary)",
      items: [
        { label: "Ambient Air Quality", value: "Municipal IoT Sensor Network (AQI, PM2.5, PM10, NO₂, CO₂)" },
        { label: "Water Quality Index", value: "Municipal Water Quality & Treatment Telemetry" },
        { label: "Green Canopy Cover", value: "Urban Land-Use & Satellite Canopy Coverage Records" },
        { label: "Energy Generation Mix", value: "Regional Electrical Grid Telemetric Feed" },
      ],
    },
    {
      icon: Clock,
      title: "Update Frequency & Coverage",
      accent: "var(--color-info)",
      items: [
        { label: "Live Telemetry Polling", value: "60-second real-time refresh cycle" },
        { label: "Hourly Trend Stream", value: "24-hour & 48-hour continuous rolling window" },
        { label: "Historical Aggregations", value: "7-day, 14-day, 30-day, and 60-day daily rollups" },
        { label: "Current Freshness", value: isApiConnected ? `Live reading updated ${updatedText}` : "Offline demonstration dataset" },
      ],
    },
    {
      icon: Scale,
      title: "Metrics & Standard Units",
      accent: "var(--color-success)",
      items: [
        { label: "Air Quality Index (AQI)", value: "0–500 scale (EPA / CPCB standard)" },
        { label: "Urban Green Cover", value: "% municipal land area canopy coverage" },
        { label: "Renewable Energy Share", value: "% clean generation in electrical consumption mix" },
        { label: "Carbon Intensity", value: "Metric tonnes CO₂ per capita per annum (tCO₂)" },
      ],
    },
    {
      icon: Sliders,
      title: "EcoScore Methodology & Weighting",
      accent: "var(--color-warning)",
      items: [
        { label: "Air Quality Dimension", value: "30% nominal weight (normalized: 100 - AQI / 3)" },
        { label: "Green Cover Dimension", value: "25% nominal weight (relative to 40% benchmark)" },
        { label: "Renewable Energy Dimension", value: "20% nominal weight (relative to 60% grid target)" },
        { label: "Water Quality & Waste", value: "15% Water Quality (0–100) + 10% Waste Diversion" },
      ],
    },
  ];

  return (
    <Panel
      eyebrow="Data Transparency"
      title="Data & Methodology"
      action={
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <ShieldCheck className="size-4 text-success" aria-hidden="true" />
          <span>Verified Project Standards</span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Missing data protocol highlight */}
        <div className="rounded-xl border border-border/70 bg-muted/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="size-8 rounded-lg bg-primary/15 text-primary grid place-items-center shrink-0">
              <ShieldCheck className="size-4.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-foreground">Missing-Data Normalization Protocol</div>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                When a municipal metric stream is unmonitored (e.g. waste diversion), it is excluded from scoring without zero-penalty;
                remaining active dimensions are proportionally rescaled to sum to 100%.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 shrink-0 self-start sm:self-auto">
            Transparent
          </span>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {cards.map((card, idx) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.07 }}
              className="rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-border/50">
                  <div
                    className="size-8 rounded-lg grid place-items-center shrink-0"
                    style={{ background: `color-mix(in oklab, ${card.accent} 15%, transparent)`, color: card.accent }}
                  >
                    <card.icon className="size-4" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{card.title}</h3>
                </div>

                <div className="space-y-2.5">
                  {card.items.map((item) => (
                    <div key={item.label} className="text-xs">
                      <div className="font-semibold text-foreground/90">{item.label}</div>
                      <div className="text-muted-foreground text-[11px] mt-0.5">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
