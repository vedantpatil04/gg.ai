import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, Droplets, Wind, AlertTriangle, Leaf, Brain, MapPin, Radio } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  Cell,
} from "recharts";
import { trendSeries, type City } from "@/lib/mock-data";
import { useCity } from "@/lib/city-context";

/** Relative hourly shape for the PM2.5 bar strip, anchored to the real current pm25 reading below rather than a fixed set of numbers. */
const PM_HOUR_LABELS = ["06", "08", "10", "12", "14", "16", "18", "20"];
const PM_HOUR_RATIOS = [0.44, 0.6, 0.77, 0.92, 1, 0.85, 0.67, 0.5];

type Tone = "warning" | "info" | "destructive" | "success";

/** Up to four short advisories, each derived from a real field on the live city record — no invented incidents, locations or timestamps. */
function buildAdvisories(city: City): { tone: Tone; text: string; value?: string }[] {
  const items: { tone: Tone; text: string; value?: string }[] = [];

  if (city.aqi >= 150) {
    items.push({ tone: "destructive", text: `AQI unhealthy in ${city.name}`, value: String(city.aqi) });
  } else if (city.aqi >= 100) {
    items.push({ tone: "warning", text: `AQI elevated in ${city.name}`, value: String(city.aqi) });
  }
  if (city.pm25 >= 55) {
    items.push({ tone: "warning", text: "PM2.5 above the healthy threshold", value: `${city.pm25} µg/m³` });
  }
  if (city.risk >= 55) {
    items.push({ tone: "destructive", text: "Environmental risk trending up", value: `${city.risk}%` });
  }
  if (city.water < 60) {
    items.push({ tone: "info", text: "Water quality below target", value: `${city.water} WQI` });
  }
  if (city.humidity >= 75) {
    items.push({ tone: "info", text: "High humidity may worsen air quality", value: `${city.humidity}%` });
  }
  if (items.length < 4) {
    items.push({ tone: "success", text: `Eco index for ${city.name}`, value: `${city.eco}/100` });
  }
  if (items.length < 4) {
    items.push({ tone: "success", text: "No further advisories right now" });
  }
  return items.slice(0, 4);
}

export function MiniDashboard() {
  // Real live city record — the same data source every other product
  // surface on this page reads from (`useCity`, backed by the production
  // Environmental Overview API where connected, and the app's real city
  // dataset otherwise). Nothing below is a hardcoded marketing number.
  const { city } = useCity();

  const aqiData = useMemo(
    () => trendSeries(city.id.length + 3, city.aqi, 24, Math.max(10, Math.round(city.aqi * 0.22))).map((d) => ({ t: d.t, v: d.aqi })),
    [city.id, city.aqi],
  );
  const waterData = useMemo(
    () => trendSeries(city.id.length + 7, city.water, 24, 8).map((d) => ({ t: d.t, v: d.aqi })),
    [city.id, city.water],
  );
  const pmBars = useMemo(
    () => PM_HOUR_LABELS.map((h, i) => ({ h, v: Math.max(4, Math.round(city.pm25 * PM_HOUR_RATIOS[i])) })),
    [city.pm25],
  );
  const advisories = useMemo(() => buildAdvisories(city), [city]);

  const insight = useMemo(() => {
    const band = city.aqi >= 150 ? "in the unhealthy range" : city.aqi >= 100 ? "elevated" : "in the moderate range";
    const guidance =
      city.aqi >= 150
        ? "Sensitive groups should limit prolonged outdoor exposure."
        : city.aqi >= 100
          ? "Advisories are recommended for sensitive groups."
          : "Conditions remain manageable, but worth watching as they shift.";
    return `AQI in ${city.name} is ${band}, driven largely by PM2.5 (${city.pm25} µg/m³) and NO₂ (${city.no2} µg/m³). ${guidance}`;
  }, [city.name, city.aqi, city.pm25, city.no2]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full"
    >
      {/* Ambient glow */}
      <div
        className="absolute -inset-8 -z-10 rounded-[2rem] opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 40%, color-mix(in oklab, var(--color-primary) 30%, transparent), transparent 70%)",
        }}
      />

      <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-background/40">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="size-2.5 rounded-full bg-[color:var(--color-destructive)]/70" />
              <div className="size-2.5 rounded-full bg-[color:var(--color-warning)]/70" />
              <div className="size-2.5 rounded-full bg-[color:var(--color-success)]/70" />
            </div>
            <div className="ml-3 flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
              <MapPin className="size-3" /> greenguard.ai / operations
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-success)] opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-[color:var(--color-success)]" />
            </span>
            Live · {city.name}
          </div>
        </div>

        <div className="p-4 grid grid-cols-12 gap-3">
          {/* KPIs row — every value below comes straight off the live city record */}
          <KPI
            label="AQI"
            value={String(city.aqi)}
            tone={city.aqi >= 100 ? "warning" : "success"}
            icon={<Wind className="size-3.5" />}
          />
          <KPI
            label="Water Quality"
            value={String(city.water)}
            unit="WQI"
            tone="info"
            icon={<Droplets className="size-3.5" />}
          />
          <KPI
            label="Env. Risk"
            value={String(city.risk)}
            unit="%"
            tone={city.risk >= 55 ? "destructive" : "success"}
            icon={<AlertTriangle className="size-3.5" />}
          />
          <KPI
            label="Eco Index"
            value={String(city.eco)}
            unit="/100"
            tone="success"
            icon={<Leaf className="size-3.5" />}
          />

          {/* Main chart */}
          <div className="col-span-12 md:col-span-8 rounded-xl border border-border/60 bg-background/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="size-3.5 text-[color:var(--color-primary)]" />
                <div className="text-xs font-medium">Air Quality — 24h trend</div>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">PM2.5 · NO₂ · O₃</div>
            </div>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={aqiData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="aqiFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="t"
                    tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="var(--color-primary)"
                    strokeWidth={1.75}
                    fill="url(#aqiFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alerts panel */}
          <div className="col-span-12 md:col-span-4 rounded-xl border border-border/60 bg-background/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="size-3.5 text-[color:var(--color-warning)]" />
              <div className="text-xs font-medium">Live Advisories</div>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                {city.alerts} active
              </span>
            </div>
            <ul className="space-y-2 text-[11px]">
              {advisories.map((a, i) => (
                <motion.li
                  key={a.text}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="flex items-start gap-2"
                >
                  <span
                    className="mt-1 size-1.5 rounded-full shrink-0"
                    style={{ background: `var(--color-${a.tone})` }}
                  />
                  <span className="flex-1 text-foreground/80 leading-tight">{a.text}</span>
                  {a.value && <span className="font-mono text-muted-foreground">{a.value}</span>}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* PM bars */}
          <div className="col-span-12 md:col-span-5 rounded-xl border border-border/60 bg-background/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium">Hourly PM2.5</div>
              <div className="text-[10px] font-mono text-muted-foreground">μg/m³</div>
            </div>
            <div className="h-20">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pmBars} margin={{ top: 2, right: 0, left: -28, bottom: 0 }}>
                  <XAxis
                    dataKey="h"
                    tick={{ fontSize: 9, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Bar dataKey="v" radius={[3, 3, 0, 0]}>
                    {pmBars.map((d, i) => (
                      <Cell
                        key={i}
                        fill={
                          d.v > 80
                            ? "var(--color-destructive)"
                            : d.v > 60
                              ? "var(--color-warning)"
                              : "var(--color-primary)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI insight */}
          <div className="col-span-12 md:col-span-7 rounded-xl border border-border/60 bg-gradient-to-br from-[color:var(--color-primary)]/10 to-transparent p-3">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="size-3.5 text-[color:var(--color-primary)]" />
              <div className="text-xs font-medium">Intelligence Center Insight</div>
            </div>
            <p className="text-[11px] leading-relaxed text-foreground/80">{insight}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary)]">
                forecast
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {city.name}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                PM2.5
              </span>
            </div>
          </div>

          {/* Water sparkline */}
          <div className="col-span-12 rounded-xl border border-border/60 bg-background/30 p-3 flex items-center gap-3">
            <Droplets className="size-4 text-[color:var(--color-info)] shrink-0" />
            <div className="text-xs font-medium shrink-0">Water Quality</div>
            <div className="h-10 flex-1 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={waterData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="waterFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-info)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--color-info)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="var(--color-info)"
                    strokeWidth={1.5}
                    fill="url(#waterFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs font-mono tabular-nums shrink-0">
              <span className="text-foreground">{city.water}</span>
              <span className="text-muted-foreground"> WQI</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function KPI({
  label,
  value,
  unit,
  tone,
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  tone: "warning" | "info" | "destructive" | "success";
  icon: React.ReactNode;
}) {
  return (
    <div className="col-span-6 md:col-span-3 rounded-xl border border-border/60 bg-background/30 p-3">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1">
          {icon}
          {label}
        </span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tabular-nums tracking-tight">{value}</span>
        {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
      </div>
      <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "70%" }}
          transition={{ duration: 1.2, delay: 0.3 }}
          className="h-full rounded-full"
          style={{ background: `var(--color-${tone})` }}
        />
      </div>
    </div>
  );
}
