/**
 * HazardIntelligencePanel.tsx — Phase 7: Disaster & Hazard Intelligence Platform
 *
 * Enterprise multi-hazard dashboard panel rendered in the "Hazard" tab
 * of the intelligence drawer.  All data from hazard-data.ts (derived from
 * existing City fields — no new APIs).
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Waves,
  Zap,
  Thermometer,
  Flame,
  MountainSnow,
  Droplets,
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Building,
  ChevronDown,
  ChevronUp,
  Activity,
  Info,
  MapPin,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { City } from "@/lib/mock-data";
import {
  generateHazardData,
  levelColor,
  levelLabel,
  alertSeverityColor,
  alertSeverityLabel,
  type HazardReading,
  type HazardAlert,
  type HazardData,
  type RiskLevel,
} from "@/lib/map/hazard-data";

// ─── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  Waves,
  Zap,
  Thermometer,
  Flame,
  MountainSnow,
  Droplets,
};
function HazardIcon({ name, ...props }: { name: string } & React.SVGProps<SVGSVGElement>) {
  const Icon = ICON_MAP[name] ?? AlertTriangle;
  return <Icon {...props} />;
}

// ─── Overall risk score card ──────────────────────────────────────────────────
function OverallScoreCard({ data }: { data: HazardData }) {
  const color = levelColor(data.overallLevel);
  const activeCount = data.activeHazards.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl p-4 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, color-mix(in oklab, ${color} 20%, var(--card-bg)) 0%, var(--card-bg) 100%)`,
        border: `1px solid color-mix(in oklab, ${color} 28%, transparent)`,
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 55% 45% at 85% 25%, color-mix(in oklab, ${color} 14%, transparent), transparent)`,
        }}
      />

      <div className="relative flex items-center gap-4">
        {/* Circular score dial */}
        <div className="relative shrink-0">
          <svg width={76} height={76} viewBox="0 0 76 76">
            <circle
              cx={38}
              cy={38}
              r={32}
              fill="none"
              stroke="oklch(1 0 0 / 0.08)"
              strokeWidth={7}
            />
            <motion.circle
              cx={38}
              cy={38}
              r={32}
              fill="none"
              stroke={color}
              strokeWidth={7}
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 32}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 32 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 32 * (1 - data.overallScore / 100) }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              transform="rotate(-90 38 38)"
              style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
            />
            <text
              x={38}
              y={34}
              textAnchor="middle"
              fontSize={18}
              fontWeight={700}
              fill="currentColor"
              fontFamily="inherit"
            >
              {data.overallScore}
            </text>
            <text
              x={38}
              y={46}
              textAnchor="middle"
              fontSize={7}
              fill="oklch(1 0 0 / 0.45)"
              fontFamily="inherit"
              letterSpacing="0.1em"
            >
              RISK
            </text>
          </svg>
        </div>

        {/* Right: label + stats */}
        <div className="flex-1 min-w-0">
          <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-0.5">
            Multi-Hazard Score
          </div>
          <div className="text-xl font-bold leading-tight" style={{ color }}>
            {levelLabel(data.overallLevel)}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <div
              className="rounded-lg px-2 py-1.5 text-center"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
            >
              <div
                className="text-[14px] font-bold"
                style={{ color: activeCount > 0 ? color : "var(--color-success)" }}
              >
                {activeCount}
              </div>
              <div className="text-[8px] text-muted-foreground">Active Hazards</div>
            </div>
            <div
              className="rounded-lg px-2 py-1.5 text-center"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
            >
              <div
                className="text-[14px] font-bold"
                style={{
                  color:
                    data.alerts.length > 0 ? "var(--color-destructive)" : "var(--color-success)",
                }}
              >
                {data.alerts.length}
              </div>
              <div className="text-[8px] text-muted-foreground">Active Alerts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <p className="relative text-[9px] text-muted-foreground/80 mt-3 leading-snug border-t border-white/10 pt-2.5">
        {data.analytics.environmentalSummary}
      </p>
    </motion.div>
  );
}

// ─── Individual hazard card ───────────────────────────────────────────────────
function HazardCard({
  reading,
  index,
  onSelect,
  isSelected,
}: {
  reading: HazardReading;
  index: number;
  onSelect: (r: HazardReading | null) => void;
  isSelected: boolean;
}) {
  const color = levelColor(reading.level);
  const trendIcon =
    reading.trend === "rising" ? (
      <TrendingUp className="size-2.5" style={{ color: "var(--color-destructive)" }} />
    ) : reading.trend === "falling" ? (
      <TrendingDown className="size-2.5" style={{ color: "var(--color-success)" }} />
    ) : (
      <Minus className="size-2.5 text-muted-foreground" />
    );

  return (
    <motion.button
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(isSelected ? null : reading)}
      className="w-full text-left rounded-xl p-3 flex items-center gap-2.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      style={{
        background: isSelected
          ? `color-mix(in oklab, ${color} 14%, var(--card-bg))`
          : "var(--card-bg)",
        border: `1px solid ${isSelected ? `color-mix(in oklab, ${color} 30%, transparent)` : "var(--card-border)"}`,
      }}
    >
      {/* Colour pip track */}
      <span
        className="shrink-0 w-[3px] h-8 rounded-full"
        style={{ background: reading.level !== "low" ? color : "oklch(1 0 0 / 0.12)" }}
      />

      {/* Icon badge */}
      <span
        className="size-7 rounded-lg grid place-items-center shrink-0 transition-all duration-200"
        style={{
          background:
            reading.level !== "low"
              ? `color-mix(in oklab, ${color} 16%, transparent)`
              : "oklch(1 0 0 / 0.05)",
          border: `1px solid ${reading.level !== "low" ? `color-mix(in oklab, ${color} 28%, transparent)` : "oklch(1 0 0 / 0.08)"}`,
        }}
      >
        <HazardIcon
          name={reading.meta.icon}
          className="size-3.5"
          style={{ color: reading.level !== "low" ? color : "var(--color-muted-foreground)" }}
        />
      </span>

      {/* Label + score */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10.5px] font-semibold truncate">{reading.meta.label}</span>
          {trendIcon}
        </div>
        <span className="text-[8.5px] text-muted-foreground/70">
          {reading.meta.description.split("—")[0]}
        </span>
      </div>

      {/* Level badge */}
      <span
        className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-full"
        style={{
          background: `color-mix(in oklab, ${color} 16%, transparent)`,
          color,
          border: `1px solid color-mix(in oklab, ${color} 25%, transparent)`,
        }}
      >
        {levelLabel(reading.level)}
      </span>
    </motion.button>
  );
}

// ─── Incident detail panel ────────────────────────────────────────────────────
function IncidentDetail({ reading }: { reading: HazardReading }) {
  const color = levelColor(reading.level);
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={reading.meta.id}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden"
      >
        <div
          className="rounded-xl p-3 mb-2 space-y-2.5"
          style={{
            background: `color-mix(in oklab, ${color} 8%, var(--card-bg))`,
            border: `1px solid color-mix(in oklab, ${color} 20%, transparent)`,
          }}
        >
          {/* Score bar */}
          <div>
            <div className="flex justify-between text-[8.5px] mb-1.5">
              <span className="font-medium" style={{ color }}>
                Risk Score: {reading.score}/100
              </span>
              <span className="text-muted-foreground">{levelLabel(reading.level)}</span>
            </div>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "oklch(1 0 0 / 0.08)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: color }}
                initial={{ width: 0 }}
                animate={{ width: `${reading.score}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>

          {/* Summary */}
          <p className="text-[9px] text-muted-foreground leading-snug">{reading.summary}</p>

          {/* Mitigations */}
          <div>
            <div className="text-[8.5px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-1.5">
              Recommended Actions
            </div>
            <div className="space-y-1">
              {reading.mitigations.map((m, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span
                    className="size-3.5 rounded-full grid place-items-center shrink-0 mt-0.5 text-[7px] font-bold"
                    style={{ background: `color-mix(in oklab, ${color} 20%, transparent)`, color }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[8.5px] text-muted-foreground/80 leading-snug">{m}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Zone bounds note */}
          {reading.bounds && (
            <div
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5"
              style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.07)" }}
            >
              <MapPin className="size-2.5 text-muted-foreground/60 shrink-0" />
              <span className="text-[7.5px] text-muted-foreground/60">
                Risk zone bounds: {reading.bounds.n.toFixed(2)}°N — {reading.bounds.s.toFixed(2)}°S,{" "}
                {reading.bounds.w.toFixed(2)}°W — {reading.bounds.e.toFixed(2)}°E
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Alert card ───────────────────────────────────────────────────────────────
function AlertCard({ alert, index }: { alert: HazardAlert; index: number }) {
  const color = alertSeverityColor(alert.severity);
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid color-mix(in oklab, ${color} 25%, transparent)` }}
    >
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset"
        style={{ background: `color-mix(in oklab, ${color} 10%, transparent)` }}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        <AlertTriangle className="size-3.5 shrink-0" style={{ color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold truncate">{alert.title}</span>
            <span
              className="text-[7.5px] font-bold px-1 py-0.5 rounded"
              style={{ background: `color-mix(in oklab, ${color} 20%, transparent)`, color }}
            >
              {alertSeverityLabel(alert.severity).toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[8px] text-muted-foreground flex items-center gap-1">
              <MapPin className="size-2 shrink-0" />
              {alert.location}
            </span>
            <span className="text-[8px] text-muted-foreground flex items-center gap-1">
              <Clock className="size-2 shrink-0" />
              {alert.issuedAt}
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="size-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div
              className="px-3 py-2.5 space-y-2 border-t"
              style={{ borderColor: `color-mix(in oklab, ${color} 15%, transparent)` }}
            >
              <p className="text-[8.5px] text-muted-foreground leading-snug">{alert.description}</p>
              <div
                className="flex items-start gap-1.5 rounded-lg px-2 py-1.5"
                style={{
                  background: `color-mix(in oklab, ${color} 8%, transparent)`,
                  border: `1px solid color-mix(in oklab, ${color} 15%, transparent)`,
                }}
              >
                <Shield className="size-2.5 shrink-0 mt-0.5" style={{ color }} />
                <span className="text-[8px] leading-snug" style={{ color }}>
                  <strong>Recommended action:</strong> {alert.action}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────
function HazardAnalytics({ data }: { data: HazardData }) {
  return (
    <div className="space-y-3">
      {/* Distribution */}
      <div
        className="rounded-xl p-3"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      >
        <div className="text-[8.5px] uppercase tracking-[0.14em] text-muted-foreground/70 mb-2 font-semibold">
          Hazard Distribution
        </div>
        <div className="flex gap-1 h-3 rounded-full overflow-hidden">
          {data.allHazards.map((h) => (
            <motion.div
              key={h.meta.id}
              className="flex-1 rounded-full"
              style={{ background: levelColor(h.level) }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              title={`${h.meta.label}: ${levelLabel(h.level)}`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {data.analytics.distribution.map((d) => (
            <div key={d.level} className="flex items-center gap-1">
              <span className="size-1.5 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="text-[7.5px] text-muted-foreground capitalize">
                {levelLabel(d.level as RiskLevel)}: {d.count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Impact estimates */}
      <div className="grid grid-cols-2 gap-1.5">
        <div
          className="rounded-xl px-3 py-2.5"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="size-3 text-muted-foreground" />
            <span className="text-[8px] uppercase tracking-wide text-muted-foreground">
              Population
            </span>
          </div>
          <div
            className="text-[17px] font-bold tabular-nums"
            style={{
              color:
                data.analytics.populationAtRisk > 60
                  ? "var(--color-destructive)"
                  : "var(--color-warning)",
            }}
          >
            {data.analytics.populationAtRisk}%
          </div>
          <div className="text-[7.5px] text-muted-foreground/70">at elevated risk</div>
          <div
            className="h-1 rounded-full overflow-hidden mt-1.5"
            style={{ background: "oklch(1 0 0 / 0.08)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  data.analytics.populationAtRisk > 60
                    ? "var(--color-destructive)"
                    : "var(--color-warning)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${data.analytics.populationAtRisk}%` }}
              transition={{ duration: 0.9 }}
            />
          </div>
        </div>
        <div
          className="rounded-xl px-3 py-2.5"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Building className="size-3 text-muted-foreground" />
            <span className="text-[8px] uppercase tracking-wide text-muted-foreground">
              Infrastructure
            </span>
          </div>
          <div
            className="text-[17px] font-bold tabular-nums"
            style={{
              color:
                data.analytics.infrastructureRisk > 55
                  ? "var(--color-destructive)"
                  : "var(--color-warning)",
            }}
          >
            {data.analytics.infrastructureRisk}%
          </div>
          <div className="text-[7.5px] text-muted-foreground/70">under stress</div>
          <div
            className="h-1 rounded-full overflow-hidden mt-1.5"
            style={{ background: "oklch(1 0 0 / 0.08)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  data.analytics.infrastructureRisk > 55
                    ? "var(--color-destructive)"
                    : "var(--color-warning)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${data.analytics.infrastructureRisk}%` }}
              transition={{ duration: 0.9 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Recommendations ──────────────────────────────────────────────────────────
function Recommendations({ recs }: { recs: string[] }) {
  return (
    <div className="space-y-1.5">
      {recs.map((rec, i) => {
        const isAi = rec.includes("Phase 8") || rec.includes("AI");
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            className="flex items-start gap-2 rounded-xl px-2.5 py-2"
            style={{
              background: isAi ? "oklch(1 0 0 / 0.02)" : "var(--card-bg)",
              border: `1px solid ${isAi ? "oklch(1 0 0 / 0.07)" : "var(--card-border)"}`,
              borderStyle: isAi ? "dashed" : "solid",
            }}
          >
            <Info
              className="size-3 mt-0.5 shrink-0"
              style={{ color: isAi ? "oklch(1 0 0 / 0.25)" : "var(--color-info)" }}
            />
            <span
              className={cn(
                "text-[8.5px] leading-snug",
                isAi ? "text-muted-foreground/40 italic" : "text-muted-foreground/80",
              )}
            >
              {rec}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export function HazardIntelligencePanel({ city }: { city: City }) {
  const data: HazardData = useMemo(
    () => generateHazardData(city),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [city.id, city.risk, city.temp, city.humidity, city.aqi, city.water],
  );

  const [selectedHazard, setSelectedHazard] = useState<HazardReading | null>(null);
  const [showAll, setShowAll] = useState(false);

  const shownHazards = showAll ? data.allHazards : data.activeHazards;

  return (
    <div
      className="flex flex-col gap-4 p-3 overflow-y-auto [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: "none" }}
    >
      {/* ── Overall score card ── */}
      <OverallScoreCard data={data} />

      {/* ── Active hazards ── */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
            <Activity className="size-3" />
            {showAll ? "All Hazards" : `Active Hazards (${data.activeHazards.length})`}
          </div>
          <button
            onClick={() => {
              setShowAll((s) => !s);
              setSelectedHazard(null);
            }}
            className="text-[8.5px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
          >
            {showAll ? (
              <>
                <ChevronUp className="size-3" />
                Active only
              </>
            ) : (
              <>
                <ChevronDown className="size-3" />
                All {data.allHazards.length}
              </>
            )}
          </button>
        </div>

        {shownHazards.length === 0 ? (
          <div
            className="text-center py-6 rounded-xl"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            <Shield className="size-8 mx-auto mb-2 text-success opacity-50" />
            <p className="text-[10px] font-medium text-muted-foreground">No Active Hazards</p>
            <p className="text-[8.5px] text-muted-foreground/60 mt-0.5">
              All hazard levels are within normal parameters
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {shownHazards.map((h, i) => (
              <div key={h.meta.id}>
                <HazardCard
                  reading={h}
                  index={i}
                  onSelect={setSelectedHazard}
                  isSelected={selectedHazard?.meta.id === h.meta.id}
                />
                {selectedHazard?.meta.id === h.meta.id && (
                  <IncidentDetail reading={selectedHazard} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Active alerts ── */}
      {data.alerts.length > 0 && (
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5 mb-2.5">
            <AlertTriangle className="size-3" /> Emergency Alerts ({data.alerts.length})
          </div>
          <div className="space-y-1.5">
            {data.alerts.map((alert, i) => (
              <AlertCard key={alert.id} alert={alert} index={i} />
            ))}
          </div>
        </div>
      )}

      {data.alerts.length === 0 && (
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{
            background: "color-mix(in oklab, var(--color-success) 8%, transparent)",
            border: "1px solid color-mix(in oklab, var(--color-success) 18%, transparent)",
          }}
        >
          <Shield className="size-3.5 shrink-0" style={{ color: "var(--color-success)" }} />
          <span className="text-[9px]" style={{ color: "var(--color-success)" }}>
            No active emergency alerts
          </span>
        </div>
      )}

      {/* ── Analytics ── */}
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5 mb-2.5">
          <Activity className="size-3" /> Hazard Analytics
        </div>
        <HazardAnalytics data={data} />
      </div>

      {/* ── Risk Intelligence ── */}
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5 mb-2.5">
          <Info className="size-3" /> Risk Intelligence
        </div>
        <Recommendations recs={data.recommendations} />
      </div>
    </div>
  );
}
