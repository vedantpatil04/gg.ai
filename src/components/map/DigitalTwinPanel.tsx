/**
 * DigitalTwinPanel.tsx — Phase 9: Digital Twin & Executive Operations Center
 *
 * Unified operational workspace rendered as the "Twin" tab in the
 * intelligence drawer.  Synthesises all previous phase modules into
 * one cross-linked operational console.
 *
 * Key features:
 *  - Mission control panels (collapsible, pinnable, order saved to localStorage)
 *  - Cross-module sync: selecting a sensor updates all sub-panels
 *  - Executive dashboard, unified timeline, zone intel, sensor ops,
 *    authority ops, citizen intel, correlation engine
 */

import { useMemo, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Activity,
  Layers,
  Shield,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Pin,
  PinOff,
  TrendingUp,
  TrendingDown,
  Minus,
  Cpu,
  MapPin,
  Clock,
  Zap,
  RefreshCw,
  CheckCircle,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { City } from "@/lib/mock-data";
import type { MapLocation, MapComplaint, EnvZones } from "@/lib/api/environmental.api";
import {
  generateDigitalTwinData,
  loadWorkspace,
  saveWorkspace,
  type PanelState,
  type PanelId,
  type ExecKpi,
  type ZoneIntelligence,
  type SensorOps,
  type AuthorityOps,
  type OpsEvent,
  type DigitalTwinData,
  type AuthorityUrgency,
} from "@/lib/map/digital-twin-data";

// ─── Collapsible workspace panel ──────────────────────────────────────────────
function WorkspacePanel({
  panel,
  onToggle,
  onPin,
  children,
}: {
  panel: PanelState;
  onToggle: (id: PanelId) => void;
  onPin: (id: PanelId) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("rounded-xl overflow-hidden", panel.pinned ? "ring-1 ring-primary/20" : "")}
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
    >
      <button
        onClick={() => onToggle(panel.id)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[color-mix(in_oklab,var(--color-foreground)_5%,transparent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset"
        aria-expanded={!panel.collapsed}
      >
        <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80 flex-1 text-left">
          {panel.label}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPin(panel.id);
          }}
          className="size-5 grid place-items-center rounded opacity-60 hover:opacity-100 transition-opacity focus-visible:outline-none"
          aria-label={panel.pinned ? "Unpin panel" : "Pin panel"}
          title={panel.pinned ? "Unpin" : "Pin"}
        >
          {panel.pinned ? (
            <PinOff className="size-3 text-primary" />
          ) : (
            <Pin className="size-3 text-muted-foreground" />
          )}
        </button>
        {panel.collapsed ? (
          <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronUp className="size-3.5 text-muted-foreground shrink-0" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {!panel.collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Executive KPI grid ───────────────────────────────────────────────────────
function ExecDashboard({
  kpis,
  overallHealth,
  overallHealthColor,
  overallHealthLabel,
}: {
  kpis: ExecKpi[];
  overallHealth: number;
  overallHealthColor: string;
  overallHealthLabel: string;
}) {
  const TrendIcon = ({ t }: { t: ExecKpi["trend"] }) =>
    t === "up" ? (
      <TrendingUp className="size-2.5" style={{ color: "var(--color-success)" }} />
    ) : t === "down" ? (
      <TrendingDown className="size-2.5" style={{ color: "var(--color-destructive)" }} />
    ) : (
      <Minus className="size-2.5 text-muted-foreground" />
    );

  return (
    <div className="space-y-2">
      {/* Overall composite score */}
      <div
        className="flex items-center gap-3 rounded-xl px-3 py-2.5"
        style={{
          background: `color-mix(in oklab, ${overallHealthColor} 10%, transparent)`,
          border: `1px solid color-mix(in oklab, ${overallHealthColor} 22%, transparent)`,
        }}
      >
        <motion.div
          className="size-10 rounded-xl grid place-items-center shrink-0"
          style={{ background: `color-mix(in oklab, ${overallHealthColor} 18%, transparent)` }}
          animate={{
            boxShadow: [
              `0 0 0px ${overallHealthColor}00`,
              `0 0 10px ${overallHealthColor}44`,
              `0 0 0px ${overallHealthColor}00`,
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <span
            className="text-[16px] font-bold tabular-nums"
            style={{ color: overallHealthColor }}
          >
            {overallHealth}
          </span>
        </motion.div>
        <div>
          <div className="text-[8px] uppercase tracking-[0.14em] text-muted-foreground/70 font-medium">
            Overall Operational Health
          </div>
          <div
            className="text-[13px] font-bold leading-tight"
            style={{ color: overallHealthColor }}
          >
            {overallHealthLabel}
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl px-2 py-2 relative overflow-hidden"
            style={{ background: "color-mix(in oklab, var(--color-foreground) 3%, transparent)", border: "1px solid var(--card-border)" }}
          >
            <span
              className="absolute inset-x-2.5 top-0 h-px rounded-full opacity-60"
              style={{ background: kpi.color }}
            />
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[7.5px] text-muted-foreground/70 uppercase tracking-wide font-medium truncate flex-1">
                {kpi.label}
              </span>
              <TrendIcon t={kpi.trend} />
            </div>
            <div
              className="text-[14px] font-bold tabular-nums leading-none"
              style={{ color: kpi.color }}
            >
              {kpi.value}
              {kpi.unit && (
                <span className="text-[8px] text-muted-foreground font-normal ml-0.5">
                  {kpi.unit}
                </span>
              )}
            </div>
            <div
              className="h-0.5 rounded-full overflow-hidden mt-1.5"
              style={{ background: "color-mix(in oklab, var(--color-foreground) 8%, transparent)" }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: kpi.color }}
                initial={{ width: 0 }}
                animate={{ width: `${kpi.score}%` }}
                transition={{ duration: 0.9, delay: i * 0.05 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Unified operational timeline ─────────────────────────────────────────────
const CAT_COLORS: Record<OpsEvent["category"], string> = {
  aqi: "var(--color-warning)",
  weather: "oklch(0.70 0.12 250)",
  hazard: "var(--color-destructive)",
  complaint: "oklch(0.68 0.14 30)",
  sensor: "var(--color-info)",
  authority: "oklch(0.65 0.14 145)",
  ai: "var(--color-primary)",
};

const ALL_CATS: OpsEvent["category"][] = [
  "aqi",
  "weather",
  "hazard",
  "complaint",
  "sensor",
  "authority",
  "ai",
];

function OpsTimeline({ events }: { events: OpsEvent[] }) {
  const [activeFilters, setActiveFilters] = useState<Set<OpsEvent["category"]>>(new Set(ALL_CATS));

  const toggle = useCallback((cat: OpsEvent["category"]) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  const shown = events.filter((e) => activeFilters.has(e.category));

  return (
    <div className="space-y-2">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-1">
        {ALL_CATS.map((cat) => (
          <button
            key={cat}
            onClick={() => toggle(cat)}
            className={cn(
              "text-[7.5px] font-semibold px-1.5 py-0.5 rounded-full transition-all capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              activeFilters.has(cat) ? "opacity-100" : "opacity-35",
            )}
            style={{
              background: `color-mix(in oklab, ${CAT_COLORS[cat]} 16%, transparent)`,
              color: CAT_COLORS[cat],
              border: `1px solid color-mix(in oklab, ${CAT_COLORS[cat]} 24%, transparent)`,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Events */}
      <div className="space-y-1">
        {shown.map((ev, i) => (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-start gap-2 rounded-lg px-2 py-1.5"
            style={{
              background: `color-mix(in oklab, ${CAT_COLORS[ev.category]} 6%, transparent)`,
              border: `1px solid color-mix(in oklab, ${CAT_COLORS[ev.category]} 12%, transparent)`,
            }}
          >
            <span
              className="size-1.5 rounded-full mt-1.5 shrink-0"
              style={{ background: CAT_COLORS[ev.category] }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-semibold truncate">{ev.title}</span>
                <span className="text-[7.5px] text-muted-foreground/60 shrink-0 flex items-center gap-0.5">
                  <Clock className="size-2" />
                  {ev.time}
                </span>
              </div>
              <p className="text-[8px] text-muted-foreground/70 leading-snug line-clamp-1">
                {ev.detail}
              </p>
            </div>
          </motion.div>
        ))}
        {shown.length === 0 && (
          <p className="text-[8.5px] text-muted-foreground/50 text-center py-3">
            No events match the selected filters
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Zone intelligence ────────────────────────────────────────────────────────
function ZonePanel({
  zones,
  onSelectZone,
}: {
  zones: ZoneIntelligence[];
  onSelectZone: (z: ZoneIntelligence | null) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const sel = zones.find((z) => z.key === selected) ?? null;

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        {zones.map((z) => (
          <motion.button
            key={z.key}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              const next = selected === z.key ? null : z.key;
              setSelected(next);
              onSelectZone(zones.find((x) => x.key === next) ?? null);
            }}
            className="rounded-xl p-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            style={{
              background:
                selected === z.key
                  ? `color-mix(in oklab, ${z.color} 14%, var(--card-bg))`
                  : "var(--card-bg)",
              border: `1px solid ${selected === z.key ? `color-mix(in oklab, ${z.color} 30%, transparent)` : "var(--card-border)"}`,
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-semibold" style={{ color: z.color }}>
                {z.name}
              </span>
              <span className="text-[7.5px] text-muted-foreground/60">{z.score}%</span>
            </div>
            <div
              className="h-1 rounded-full overflow-hidden mb-1.5"
              style={{ background: "color-mix(in oklab, var(--color-foreground) 8%, transparent)" }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${z.score}%`, background: z.color }}
              />
            </div>
            <div className="flex gap-2 text-[7.5px] text-muted-foreground/70">
              <span>AQI {z.aqi}</span>
              <span>·</span>
              <span>{z.sensorCount} points</span>
              <span>·</span>
              <span>{z.complaintCount} complaints</span>
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {sel && (
          <motion.div
            key={sel.key}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-xl p-3 space-y-2"
              style={{
                background: `color-mix(in oklab, ${sel.color} 8%, var(--card-bg))`,
                border: `1px solid color-mix(in oklab, ${sel.color} 18%, transparent)`,
              }}
            >
              <div
                className="text-[8.5px] font-semibold uppercase tracking-wide"
                style={{ color: sel.color }}
              >
                {sel.name} Zone — Detailed Intelligence
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center">
                {[
                  { l: "AQI", v: sel.aqi },
                  { l: "Hazard", v: sel.hazardLevel },
                  { l: "Trend", v: sel.trend },
                ].map(({ l, v }) => (
                  <div
                    key={l}
                    className="rounded-lg px-2 py-1"
                    style={{ background: "color-mix(in oklab, var(--color-foreground) 5%, transparent)" }}
                  >
                    <div className="text-[7.5px] text-muted-foreground/60 uppercase">{l}</div>
                    <div className="text-[9px] font-bold capitalize">{v}</div>
                  </div>
                ))}
              </div>
              <p className="text-[8.5px] text-muted-foreground/80 leading-snug">
                {sel.authorityNote}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Monitoring operations ────────────────────────────────────────────────────
function SensorOpsPanel({
  sensors,
  onSelectSensor,
  selectedId,
}: {
  sensors: SensorOps[];
  onSelectSensor: (id: string | null) => void;
  selectedId: string | null;
}) {
  const online = sensors.filter((s) => s.online);
  const offline = sensors.filter((s) => !s.online);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 text-[8.5px]">
        <span className="flex items-center gap-1" style={{ color: "var(--color-success)" }}>
          <span className="size-1.5 rounded-full bg-current inline-block" />
          {online.length} online
        </span>
        <span className="flex items-center gap-1" style={{ color: "var(--color-destructive)" }}>
          <span className="size-1.5 rounded-full bg-current inline-block" />
          {offline.length} offline
        </span>
      </div>
      <div className="space-y-1">
        {sensors.map((s, i) => (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onSelectSensor(selectedId === s.id ? null : s.id)}
            className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            style={{
              background:
                selectedId === s.id
                  ? "color-mix(in oklab, var(--color-primary) 10%, var(--card-bg))"
                  : "var(--card-bg)",
              border: `1px solid ${selectedId === s.id ? "color-mix(in oklab, var(--color-primary) 25%, transparent)" : "var(--card-border)"}`,
            }}
          >
            <span
              className={cn(
                "size-2 rounded-full shrink-0",
                s.online ? "bg-success" : "bg-destructive",
              )}
              style={{ background: s.online ? "var(--color-success)" : "var(--color-destructive)" }}
            />
            <span className="text-[9px] font-medium flex-1 truncate">{s.name}</span>
            <span
              className="text-[7.5px] tabular-nums"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              AQI {s.aqi}
            </span>
            {s.nearbyComplaints > 0 && (
              <span
                className="text-[7px] font-bold px-1 py-0.5 rounded"
                style={{
                  background: "color-mix(in oklab, var(--color-warning) 16%, transparent)",
                  color: "var(--color-warning)",
                }}
              >
                {s.nearbyComplaints} ⚠
              </span>
            )}
            <span className="text-[7.5px] text-muted-foreground/60 shrink-0">{s.lastReading}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─── Authority operations ─────────────────────────────────────────────────────
const URGENCY_COLOR: Record<AuthorityUrgency, string> = {
  Immediate: "var(--color-destructive)",
  High: "oklch(0.70 0.18 35)",
  Moderate: "var(--color-warning)",
  Routine: "var(--color-info)",
};

function AuthorityOpsPanel({ ops }: { ops: AuthorityOps[] }) {
  return (
    <div className="space-y-1.5">
      {ops.map((op, i) => (
        <motion.div
          key={op.zone}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="rounded-xl p-3"
          style={{
            background: "var(--card-bg)",
            border: `1px solid var(--card-border)`,
            borderLeft: `3px solid ${URGENCY_COLOR[op.urgency]}`,
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Shield className="size-3 shrink-0" style={{ color: URGENCY_COLOR[op.urgency] }} />
            <span className="text-[9.5px] font-semibold">{op.zone} Zone</span>
            <span
              className="text-[7.5px] font-bold px-1.5 py-0.5 rounded-full ml-auto"
              style={{
                background: `color-mix(in oklab, ${URGENCY_COLOR[op.urgency]} 14%, transparent)`,
                color: URGENCY_COLOR[op.urgency],
              }}
            >
              {op.urgency}
            </span>
          </div>
          <p className="text-[8.5px] text-muted-foreground/80 leading-snug">{op.primaryAction}</p>
          <div className="flex gap-3 mt-1.5 text-[7.5px] text-muted-foreground/70">
            <span>Est. impact: {op.aqiImpact}</span>
            <span>·</span>
            <span>Timeframe: {op.timeframe}</span>
            {op.pendingComplaints > 0 && (
              <>
                <span>·</span>
                <span>{op.pendingComplaints} pending complaints</span>
              </>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Citizen intelligence ─────────────────────────────────────────────────────
function CitizenPanel({ complaints }: { complaints: MapComplaint[] }) {
  const sev: Record<string, string> = {
    critical: "var(--color-destructive)",
    high: "var(--color-warning)",
    medium: "var(--color-info)",
    low: "var(--color-muted-foreground)",
  };
  const recent = [...complaints]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
  const total = complaints.length;
  const resolved = complaints.filter((c) => c.status === "resolved").length;
  const pending = complaints.filter((c) => c.status === "pending").length;
  const critical = complaints.filter((c) => c.severity === "critical").length;

  return (
    <div className="space-y-2">
      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-1">
        {[
          { l: "Total", v: total, c: "var(--color-foreground)" },
          { l: "Pending", v: pending, c: "var(--color-warning)" },
          { l: "Resolved", v: resolved, c: "var(--color-success)" },
          { l: "Critical", v: critical, c: "var(--color-destructive)" },
        ].map(({ l, v, c }) => (
          <div
            key={l}
            className="rounded-lg px-1.5 py-1.5 text-center"
            style={{ background: "color-mix(in oklab, var(--color-foreground) 3%, transparent)", border: "1px solid var(--card-border)" }}
          >
            <div className="text-[13px] font-bold tabular-nums" style={{ color: c }}>
              {v}
            </div>
            <div className="text-[7px] text-muted-foreground/60 uppercase tracking-wide">{l}</div>
          </div>
        ))}
      </div>

      {/* Complaint list */}
      <div className="space-y-1">
        {recent.map((c, i) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            <span
              className="size-1.5 rounded-full shrink-0"
              style={{ background: sev[c.severity] ?? sev.low }}
            />
            <span className="text-[8.5px] flex-1 truncate font-medium">{c.title}</span>
            <span
              className="text-[7px] font-medium px-1 py-0.5 rounded shrink-0"
              style={{
                background: `color-mix(in oklab, ${sev[c.severity] ?? sev.low} 14%, transparent)`,
                color: sev[c.severity] ?? sev.low,
              }}
            >
              {c.status.replace("-", " ")}
            </span>
          </motion.div>
        ))}
        {recent.length === 0 && (
          <div className="text-center py-4 text-[8.5px] text-muted-foreground/60 flex items-center justify-center gap-1.5">
            <CheckCircle className="size-3.5" style={{ color: "var(--color-success)" }} /> No
            citizen complaints
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Cross-module correlation panel ──────────────────────────────────────────
function CorrelationPanel({ data }: { data: DigitalTwinData }) {
  const corr = data.correlatedSelected;
  if (!corr) {
    return (
      <div className="text-center py-6">
        <Radio className="size-7 mx-auto mb-2 opacity-25" />
        <p className="text-[8.5px] text-muted-foreground/50">
          Select a sensor to view cross-module correlation
        </p>
      </div>
    );
  }

  return (
    <motion.div
      key={corr.sensor.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-2"
    >
      <div className="text-[9px] font-semibold" style={{ color: "var(--color-primary)" }}>
        {corr.sensor.name}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { l: "AQI Band", v: corr.aqiBand, c: corr.aqiBandColor },
          { l: "Hazard", v: corr.hazardLevel, c: corr.hazardColor },
          { l: "AQI Reading", v: corr.sensor.aqi, c: "var(--color-foreground)" },
          {
            l: "Sensor Health",
            v: `${corr.sensor.health}%`,
            c: corr.sensor.health > 70 ? "var(--color-success)" : "var(--color-warning)",
          },
        ].map(({ l, v, c }) => (
          <div
            key={l}
            className="rounded-lg px-2 py-1.5"
            style={{ background: "color-mix(in oklab, var(--color-foreground) 3%, transparent)", border: "1px solid var(--card-border)" }}
          >
            <div className="text-[7.5px] text-muted-foreground/60 uppercase tracking-wide">{l}</div>
            <div className="text-[10px] font-bold" style={{ color: c }}>
              {v}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[8.5px] text-muted-foreground/80 leading-snug px-1">
        {corr.authorityNote}
      </p>
      <div
        className="rounded-xl p-2.5"
        style={{
          background: "color-mix(in oklab, var(--color-primary) 8%, transparent)",
          border: "1px solid color-mix(in oklab, var(--color-primary) 18%, transparent)",
        }}
      >
        <div
          className="text-[7.5px] font-semibold uppercase tracking-wide mb-1"
          style={{ color: "var(--color-primary)" }}
        >
          AI Summary
        </div>
        <p className="text-[8.5px] text-muted-foreground/80 leading-snug">{corr.aiSummary}</p>
      </div>
      {corr.nearbyEvents.length > 0 && (
        <div className="space-y-1">
          <div className="text-[7.5px] uppercase tracking-wide text-muted-foreground/60 font-semibold">
            Related Events
          </div>
          {corr.nearbyEvents.map((ev, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 rounded-lg px-2 py-1"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
            >
              <span
                className="size-1.5 rounded-full shrink-0 mt-1"
                style={{ background: ev.color }}
              />
              <span className="text-[8px] text-muted-foreground/80 truncate">{ev.title}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export function DigitalTwinPanel({
  city,
  hotspots,
  zones,
  complaints,
  selectedId,
  onSelectLocation,
}: {
  city: City;
  hotspots: MapLocation[];
  zones: EnvZones;
  complaints: MapComplaint[];
  selectedId: string | null;
  onSelectLocation: (id: string) => void;
}) {
  const [panels, setPanels] = useState<PanelState[]>(() => loadWorkspace());
  const [selectedZone, setSelectedZone] = useState<ZoneIntelligence | null>(null);

  // Persist workspace on every change
  useEffect(() => {
    saveWorkspace(panels);
  }, [panels]);

  const data: DigitalTwinData = useMemo(
    () => generateDigitalTwinData(city, hotspots, zones, complaints, selectedId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [city.id, city.aqi, city.risk, city.alerts, hotspots.length, complaints.length, selectedId],
  );

  const togglePanel = useCallback((id: PanelId) => {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, collapsed: !p.collapsed } : p)));
  }, []);

  const pinPanel = useCallback((id: PanelId) => {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, pinned: !p.pinned } : p)));
  }, []);

  const resetWorkspace = useCallback(() => {
    const defaultPanels = panels.map((p, i) => ({ ...p, collapsed: i > 3, pinned: i === 0 }));
    setPanels(defaultPanels);
  }, [panels]);

  const orderedPanels = [...panels].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return a.order - b.order;
  });

  const panelOf = (id: PanelId) => orderedPanels.find((p) => p.id === id)!;

  return (
    <div
      className="flex flex-col gap-2 p-3 overflow-y-auto [&::-webkit-scrollbar]:hidden"
      style={{ scrollbarWidth: "none" }}
    >
      {/* Header bar */}
      <div className="flex items-center gap-2 mb-1">
        <Globe className="size-3.5 text-primary shrink-0" />
        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex-1">
          Digital Twin — {city.name}
        </span>
        <button
          onClick={resetWorkspace}
          title="Reset workspace layout"
          className="size-5 grid place-items-center rounded hover:bg-[color-mix(in_oklab,var(--color-foreground)_8%,transparent)] text-muted-foreground/60 hover:text-muted-foreground transition-colors focus-visible:outline-none"
        >
          <RefreshCw className="size-3" />
        </button>
      </div>

      {/* Panels in workspace order */}
      {orderedPanels.map((panel) => {
        if (panel.id === "executive")
          return (
            <WorkspacePanel key="executive" panel={panel} onToggle={togglePanel} onPin={pinPanel}>
              <ExecDashboard
                kpis={data.execKpis}
                overallHealth={data.overallHealth}
                overallHealthColor={data.overallHealthColor}
                overallHealthLabel={data.overallHealthLabel}
              />
            </WorkspacePanel>
          );
        if (panel.id === "timeline")
          return (
            <WorkspacePanel
              key="timeline"
              panel={panelOf("timeline")}
              onToggle={togglePanel}
              onPin={pinPanel}
            >
              <OpsTimeline events={data.opsTimeline} />
            </WorkspacePanel>
          );
        if (panel.id === "zones")
          return (
            <WorkspacePanel
              key="zones"
              panel={panelOf("zones")}
              onToggle={togglePanel}
              onPin={pinPanel}
            >
              <ZonePanel zones={data.zoneIntelligence} onSelectZone={setSelectedZone} />
            </WorkspacePanel>
          );
        if (panel.id === "sensors")
          return (
            <WorkspacePanel
              key="sensors"
              panel={panelOf("sensors")}
              onToggle={togglePanel}
              onPin={pinPanel}
            >
              <SensorOpsPanel
                sensors={data.sensorOps}
                onSelectSensor={(id) => id && onSelectLocation(id)}
                selectedId={selectedId}
              />
            </WorkspacePanel>
          );
        if (panel.id === "authority")
          return (
            <WorkspacePanel
              key="authority"
              panel={panelOf("authority")}
              onToggle={togglePanel}
              onPin={pinPanel}
            >
              <AuthorityOpsPanel ops={data.authorityOps} />
            </WorkspacePanel>
          );
        if (panel.id === "citizen")
          return (
            <WorkspacePanel
              key="citizen"
              panel={panelOf("citizen")}
              onToggle={togglePanel}
              onPin={pinPanel}
            >
              <CitizenPanel complaints={complaints} />
            </WorkspacePanel>
          );
        if (panel.id === "correlation")
          return (
            <WorkspacePanel
              key="correlation"
              panel={panelOf("correlation")}
              onToggle={togglePanel}
              onPin={pinPanel}
            >
              <CorrelationPanel data={data} />
            </WorkspacePanel>
          );
        return null;
      })}
    </div>
  );
}
