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
import { trendSeries } from "@/lib/mock-data";

const aqiData = trendSeries(7, 92, 24, 28);
const waterData = trendSeries(3, 74, 24, 10);
const pmBars = [
  { h: "06", v: 42 },
  { h: "08", v: 58 },
  { h: "10", v: 74 },
  { h: "12", v: 88 },
  { h: "14", v: 96 },
  { h: "16", v: 82 },
  { h: "18", v: 64 },
  { h: "20", v: 48 },
];

export function MiniDashboard() {
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
            Live · Bengaluru
          </div>
        </div>

        <div className="p-4 grid grid-cols-12 gap-3">
          {/* KPIs row */}
          <KPI
            label="AQI"
            value="118"
            delta="+6"
            tone="warning"
            icon={<Wind className="size-3.5" />}
          />
          <KPI
            label="Water Quality"
            value="64"
            unit="WQI"
            delta="-2"
            tone="info"
            icon={<Droplets className="size-3.5" />}
          />
          <KPI
            label="Env. Risk"
            value="58"
            unit="%"
            delta="+4"
            tone="destructive"
            icon={<AlertTriangle className="size-3.5" />}
          />
          <KPI
            label="Eco Index"
            value="62"
            unit="/100"
            delta="+1"
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
              <div className="text-xs font-medium">Live Alerts</div>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">5 active</span>
            </div>
            <ul className="space-y-2 text-[11px]">
              {[
                { c: "destructive", t: "PM2.5 spike — Whitefield", s: "2m" },
                { c: "warning", t: "Rain forecast — drainage risk", s: "11m" },
                { c: "info", t: "Sensor offline — Indiranagar 04", s: "24m" },
                { c: "success", t: "AQI improving — Jayanagar", s: "1h" },
              ].map((a, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="flex items-start gap-2"
                >
                  <span
                    className="mt-1 size-1.5 rounded-full shrink-0"
                    style={{ background: `var(--color-${a.c})` }}
                  />
                  <span className="flex-1 text-foreground/80 leading-tight">{a.t}</span>
                  <span className="font-mono text-muted-foreground">{a.s}</span>
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
              <div className="text-xs font-medium">AI Copilot Insight</div>
              <span className="ml-auto text-[10px] font-mono text-[color:var(--color-primary)]">
                95% conf.
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-foreground/80">
              PM2.5 likely to exceed <span className="text-foreground font-medium">120 μg/m³</span>{" "}
              in east zones by <span className="font-mono">18:00</span>. Recommend traffic rerouting
              on ORR and proactive advisory to 14 schools in affected wards.
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[color:var(--color-primary)]/15 text-[color:var(--color-primary)]">
                forecast
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                east-zone
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                traffic
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
              <span className="text-foreground">64</span>
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
  delta,
  tone,
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  delta: string;
  tone: "warning" | "info" | "destructive" | "success";
  icon: React.ReactNode;
}) {
  const positive = delta.startsWith("+");
  const badTone = tone === "destructive" || tone === "warning";
  const deltaColor =
    (positive && badTone) || (!positive && !badTone)
      ? "var(--color-destructive)"
      : "var(--color-success)";

  return (
    <div className="col-span-6 md:col-span-3 rounded-xl border border-border/60 bg-background/30 p-3">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="flex items-center gap-1">
          {icon}
          {label}
        </span>
        <span style={{ color: deltaColor }} className="font-mono">
          {delta}
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
