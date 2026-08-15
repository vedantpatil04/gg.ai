import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { useCity } from "@/lib/city-context";
import {
  environmentalApi,
  type MapLocation,
  type WaterBody,
  type EnvZones,
  type MapComplaint,
} from "@/lib/api/environmental.api";
import { CITY_MAP_DATA } from "@/lib/map/city-map-data";
import { aqiBand, trendSeries, forecastSeries, CITIES } from "@/lib/mock-data";
import {
  LAYERS,
  type LayerId,
  type TimeRange,
  CATEGORY_LABEL,
  categoryColor,
  categoryIcon,
  aqiColor,
  aqiLabel,
  generateAiInsights,
  generateSpatialInsights,
  trendArrow,
  resolveThemeColor,
  stableSeed,
  SEV_COLOR,
} from "@/lib/map/map-visuals";
import { SmartMapCanvas } from "@/components/map/SmartMapCanvas";
import { WeatherIntelligencePanel } from "@/components/map/WeatherIntelligencePanel";
import { AirQualityPanel } from "@/components/map/AirQualityPanel";
import { HazardIntelligencePanel } from "@/components/map/HazardIntelligencePanel";
import { AiCommandPanel } from "@/components/map/AiCommandPanel";
import { DigitalTwinPanel } from "@/components/map/DigitalTwinPanel";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MapPin,
  RefreshCw,
  Gauge,
  Cpu,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Navigation,
  Minus as ArrowStable,
  SortAsc,
  SortDesc,
  TrendingUp,
  Activity,
  Filter,
  Zap,
  Droplets,
  Thermometer,
  Wind,
  Clock3,
  Radio,
  Lightbulb,
  CloudRain,
  Leaf,
  TriangleAlert,
  Sparkles,
  Globe,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useDragControls,
  animate as fmAnimate,
  type PanInfo,
} from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  SectionHeader,
  StatusChip,
  EmptyState,
  MetricTile,
} from "@/components/map/intelligence-ui";

export const Route = createFileRoute("/map")({
  head: () => ({ meta: [{ title: "Smart Map — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <MapPage />
    </AppLayout>
  ),
});

// ─── KPI chip — Phase 3B: premium redesign ────────────────────────────────────
// Same footprint as before (2-line card, same height for cards without a
// `sub` line) but: an icon replaces the old "colored top border" hack (one
// subtle neutral border instead of a themed one on every card — reduces
// unnecessary borders per spec), bolder value type, and an optional real
// trend/prediction line for the flagship AQI card only. No fabricated deltas
// — `trend` and `sub` are only ever passed when backed by real fetched data.
function KpiChip({
  label,
  value,
  unit,
  accent,
  icon: Icon,
  trend,
  sub,
  className,
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
  icon?: LucideIcon;
  trend?: { direction: "up" | "down" | "stable"; delta?: number };
  sub?: string;
  className?: string;
}) {
  const tint = accent ?? "var(--color-muted-foreground)";
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={cn(
        "relative min-w-[124px] rounded-xl px-3.5 py-3 flex flex-col gap-1.5 bg-white/[0.03] border border-white/[0.07] hover:border-white/[0.14] hover:bg-white/[0.05] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.3)] transition-[background-color,border-color,box-shadow] duration-200",
        className ?? "flex-1",
      )}
    >
      {/* Accent hairline — replaces the old free-floating dot with a
          consistent top-edge treatment shared by every KPI card. */}
      <span
        className="absolute inset-x-3 top-0 h-px rounded-full opacity-70"
        style={{ background: tint }}
      />
      <div className="flex items-center gap-1.5">
        {Icon && (
          <span
            className="size-4 rounded-md grid place-items-center shrink-0"
            style={{
              background: `color-mix(in oklab, ${tint} 16%, transparent)`,
            }}
          >
            <Icon className="size-2.5" style={{ color: tint }} />
          </span>
        )}
        <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground flex-1 truncate">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-base font-bold tabular-nums tracking-tight">
          {value}
          {unit && (
            <span className="text-[10px] text-muted-foreground font-normal ml-0.5">{unit}</span>
          )}
        </span>
        {trend && <TrendBadge direction={trend.direction} value={trend.delta} />}
      </div>
      {sub && <span className="text-[8px] text-muted-foreground/70 truncate">{sub}</span>}
    </motion.div>
  );
}

// ─── Mini inline sparkline (canvas) ──────────────────────────────────────────
function MiniSpark({
  data,
  color,
  height = 20,
}: {
  data: number[];
  color: string;
  height?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || data.length < 2) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = c.width;
    const h = c.height;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const rng = max - min || 1;
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, w, 0);

    // Shared with SmartMapCanvas.tsx's <Sparkline> — was previously duplicated here
    const resolvedColor =
      color.startsWith("var(") || color.startsWith("oklch(") ? resolveThemeColor(color) : color;

    grad.addColorStop(0, resolvedColor);
    grad.addColorStop(1, resolvedColor);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / rng) * (h - 2) - 1;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [data, color]);
  return <canvas ref={ref} width={80} height={height} className="w-full opacity-80" />;
}

// ─── Trend arrow indicator ────────────────────────────────────────────────────
function TrendBadge({ direction, value }: { direction: "up" | "down" | "stable"; value?: number }) {
  if (direction === "up")
    return (
      <span className="flex items-center gap-0.5 text-[11px] text-destructive font-medium">
        <ArrowUpRight className="size-2.5" />
        {value != null ? `+${value}` : ""}
      </span>
    );
  if (direction === "down")
    return (
      <span className="flex items-center gap-0.5 text-[11px] text-[var(--color-success)] font-medium">
        <ArrowDownRight className="size-2.5" />
        {value != null ? `-${Math.abs(value)}` : ""}
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
      <ArrowStable className="size-2.5" />
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
// Phase 3 (Stability & Performance): a single stable reference for "no
// history data yet" — `historyResp?.data?.history ?? []` would otherwise
// allocate a brand-new array every render, which defeats memoization/effect
// dependency checks in anything that receives it (SmartMapCanvas's history
// chart, in particular).
const EMPTY_HISTORY: never[] = [];

function MapPage() {
  const { t } = useTranslation("map");
  const { city, isApiConnected, setCityId } = useCity();

  // ── Phase 10: Live geolocation ────────────────────────────────────────────
  const geo = useGeolocation();

  // ── Phase 4A: Location confirmation dialog ────────────────────────────────
  //
  // When the user presses "Current Location" (the Locate button inside
  // SmartMapCanvas), we detect the nearest city but do NOT switch immediately.
  //
  // Flow:
  //   geo.position arrives → find nearest city
  //   → same as active city? silently refresh + re-centre, no dialog
  //   → different city?      show confirmation dialog
  //       "Keep <current>"   → dismiss, no state change
  //       "Switch to <new>"  → setCityId(nearestId) + persist
  //
  // The dialog is intentionally scoped to SmartMapCanvas only — no other
  // page or module shows this confirmation (per Phase 4A spec).
  // Future phases (Dashboard, Forecast) can reuse `pendingCitySwitch` state
  // by lifting it to a context; for now it lives here in the map page.

  interface PendingSwitch {
    nearestId: string;
    nearestName: string;
    nearestRegion: string;
  }
  const [pendingSwitch, setPendingSwitch] = React.useState<PendingSwitch | null>(null);
  const lastAutoSwitchRef = useRef<string | null>(null);

  // Region lookup (mirrors CITY_REGION in location-intelligence.tsx)
  const CITY_REGION_MAP: Record<string, string> = {
    belagavi:   "Karnataka",
    bengaluru:  "Karnataka",
    mumbai:     "Maharashtra",
    delhi:      "Delhi",
    hyderabad:  "Telangana",
    chennai:    "Tamil Nadu",
    pune:       "Maharashtra",
    kolkata:    "West Bengal",
    ahmedabad:  "Gujarat",
    london:     "England",
    newyork:    "New York",
    singapore:  "Singapore",
    tokyo:      "Tokyo",
    dubai:      "Dubai Emirate",
  };

  useEffect(() => {
    if (!geo.position || !setCityId) return;
    const { lat, lng } = geo.position;
    const toRad = (d: number) => (d * Math.PI) / 180;
    let nearestId = CITIES[0].id;
    let nearestDist = Infinity;
    for (const c of CITIES) {
      const dLat = toRad(c.lat - lat);
      const dLng = toRad(c.lng - lng);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat)) * Math.cos(toRad(c.lat)) * Math.sin(dLng / 2) ** 2;
      const dist = 6_371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestId = c.id;
      }
    }

    // Deduplicate: only act once per unique nearest city
    if (nearestId === lastAutoSwitchRef.current) return;
    lastAutoSwitchRef.current = nearestId;

    if (nearestId === city.id) {
      // Already on the correct city — just refresh data, no dialog needed
      return;
    }

    // Different city detected — show confirmation dialog instead of switching
    const nearestCity = CITIES.find((c) => c.id === nearestId);
    if (!nearestCity) return;
    const region = CITY_REGION_MAP[nearestId];
    setPendingSwitch({
      nearestId,
      nearestName: nearestCity.name,
      nearestRegion: region ? `${region}, ${nearestCity.country}` : nearestCity.country,
    });
  }, [geo.position, setCityId, city.id]);

  // Nearest sensor/complaint computed after filteredHotspots and allComplaints
  // are declared below — see "Nearby Environmental Intel" memos further down.
  const [active, setActive] = useState<LayerId[]>(["aqi", "heat"]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerTab, setDrawerTab] = useState<
    "zones" | "insights" | "stats" | "weather" | "air" | "hazard" | "ai" | "twin"
  >("zones");
  const [sortDesc, setSortDesc] = useState(true);
  const [filterCategory, setFilterCat] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("live");
  const [drawerSearch, setDrawerSearch] = useState("");

  // ── Resizable panel width (Section 1 / bonus: draggable divider) ─────────────
  // Persisted to localStorage so the preference survives page reloads.
  // Clamped to 280–640px. Only active on desktop (≥1024px); tablet/mobile
  // use the bottom-sheet layout from Phase 1 and ignore this value.
  const PANEL_MIN = 280;
  const PANEL_MAX = 640;
  const PANEL_DEFAULT = 480;
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("gg-panel-width");
      if (saved) {
        const n = parseInt(saved, 10);
        if (n >= PANEL_MIN && n <= PANEL_MAX) return n;
      }
    } catch {
      /* SSR or quota */
    }
    return PANEL_DEFAULT;
  });
  const isResizingRef = useRef(false);
  const resizeDividerRef = useRef<HTMLDivElement>(null);

  const onDividerPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    isResizingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onDividerPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizingRef.current) return;
    // Panel is on the right; dragging left = panel grows, right = shrinks
    const rect = (e.currentTarget as HTMLElement)
      .closest(".smartmap-area")
      ?.getBoundingClientRect();
    if (!rect) return;
    const newWidth = Math.round(rect.right - e.clientX);
    const clamped = Math.max(PANEL_MIN, Math.min(PANEL_MAX, newWidth));
    setPanelWidth(clamped);
    try {
      localStorage.setItem("gg-panel-width", String(clamped));
    } catch {
      /* quota */
    }
  }, []);

  const onDividerPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isResizingRef.current = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // ── Responsive intelligence panel ──────────────────────────────────────────
  // `drawerOpen` above is reused across every breakpoint as the single
  // "is the panel expanded" source of truth: desktop widens it into a side
  // rail, tablet grows it into a bottom-docked panel, mobile treats it as the
  // difference between "collapsed" and "open" on the draggable bottom sheet.
  // `mobileSheetTall` only matters on mobile, where an open sheet has two
  // reachable heights (half / fully expanded).
  const [mobileSheetTall, setMobileSheetTall] = useState(false);
  const mapAreaRef = useRef<HTMLDivElement>(null);
  const [mapAreaHeight, setMapAreaHeight] = useState(0);

  useEffect(() => {
    const el = mapAreaRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const update = () => setMapAreaHeight(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const MOBILE_SHEET_COLLAPSED_PX = 108;
  const mobileSheetHeightFor = (open: boolean, tall: boolean) => {
    if (!open) return MOBILE_SHEET_COLLAPSED_PX;
    const h = mapAreaHeight || 640;
    return tall ? h * 0.9 : h * 0.46;
  };

  const isMobile = useIsMobile();

  // Sheet is rendered at a fixed "full" height and repositioned with a `y`
  // transform — cheap, compositor-only, and lets framer-motion's spring
  // physics drive both the drag and the settle animation (Section 9: smooth,
  // lightweight motion; Section 7: "premium draggable bottom sheet"). The
  // transform only ever matters on mobile — `useIsMobile` forces the target
  // (and therefore the settled value) to 0 everywhere else, which is a pure
  // no-op on the tablet/desktop presentations of this same element.
  const mobileSheetMaxH = mobileSheetHeightFor(true, true);
  const mobileCollapsedY = mobileSheetMaxH - mobileSheetHeightFor(false, false);
  const mobileHalfY = mobileSheetMaxH - mobileSheetHeightFor(true, false);
  const mobileFullY = 0;
  const mobileSheetTargetY = !isMobile
    ? 0
    : !drawerOpen
      ? mobileCollapsedY
      : mobileSheetTall
        ? mobileFullY
        : mobileHalfY;

  const mobileSheetY = useMotionValue(mobileSheetTargetY);
  const mobileDragControls = useDragControls();

  useEffect(() => {
    const controls = fmAnimate(mobileSheetY, mobileSheetTargetY, {
      type: "spring",
      stiffness: 420,
      damping: 42,
      mass: 0.9,
    });
    return () => controls.stop();
  }, [mobileSheetTargetY, mobileSheetY]);

  const onMobileSheetDragEnd = (_e: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    const current = mobileSheetY.get();
    const velocity = info.velocity.y;
    const points: Array<{ open: boolean; tall: boolean; y: number }> = [
      { open: false, tall: false, y: mobileCollapsedY },
      { open: true, tall: false, y: mobileHalfY },
      { open: true, tall: true, y: mobileFullY },
    ];
    let nearestIdx = 0;
    for (let i = 1; i < points.length; i++) {
      if (Math.abs(current - points[i].y) < Math.abs(current - points[nearestIdx].y))
        nearestIdx = i;
    }
    // A confident flick jumps one snap point further in that direction,
    // even if the release position was closer to the current one.
    if (Math.abs(velocity) > 700) {
      const dir = velocity > 0 ? 1 : -1; // y grows downward
      nearestIdx = Math.min(points.length - 1, Math.max(0, nearestIdx + dir));
    }
    setDrawerOpen(points[nearestIdx].open);
    setMobileSheetTall(points[nearestIdx].tall);
  };

  const cycleMobileSheet = () => {
    if (!drawerOpen) {
      setDrawerOpen(true);
      setMobileSheetTall(false);
    } else if (!mobileSheetTall) {
      setMobileSheetTall(true);
    } else {
      setDrawerOpen(false);
      setMobileSheetTall(false);
    }
  };

  const handleSelectLocation = useCallback(
    (id: string) => setSelected((s) => (s === id ? null : id)),
    [],
  );
  const handleSearchChange = useCallback((v: string) => {
    setSearch(v);
    setSelected(null);
  }, []);

  const toggle = useCallback(
    (id: LayerId) => setActive((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id])),
    [],
  );

  // ── Fetch map data ─────────────────────────────────────────────────────────
  const {
    data: mapDataResponse,
    isSuccess: mapLoaded,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["cityMapData", city.id],
    queryFn: () => environmentalApi.getCityMapData(city.id),
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
    enabled: isApiConnected,
    throwOnError: false,
  });

  // ── Fetch city history for timeline ───────────────────────────────────────
  const historyDays = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 1;
  const { data: historyResp } = useQuery({
    queryKey: ["cityHistory", city.id, historyDays],
    queryFn: () => environmentalApi.getCityHistory(city.id, historyDays),
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
    enabled: isApiConnected && timeRange !== "live",
    throwOnError: false,
  });
  const hasHistory = (historyResp?.data?.history?.length ?? 0) > 0;

  // ── Recent events (Phase 3B) — real citizen complaints, same queryKey as
  //    SmartMapCanvas's own complaint-markers query, so React Query serves
  //    both from one shared cache entry rather than fetching twice. ─────────
  const { data: complaintsResp } = useQuery({
    queryKey: ["mapComplaints", city.id],
    queryFn: () => environmentalApi.getMapComplaints(city.id),
    staleTime: 3 * 60_000,
    gcTime: 10 * 60_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
    enabled: isApiConnected,
    throwOnError: false,
  });
  const recentEvents: MapComplaint[] = useMemo(
    () =>
      [...(complaintsResp?.data ?? EMPTY_HISTORY)]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6),
    [complaintsResp],
  );
  // Phase 9: full complaints list for the Digital Twin panel (recentEvents is
  // limited to 6 for the existing Intel tab; allComplaints is the full set).
  const allComplaints: MapComplaint[] = useMemo(
    () => complaintsResp?.data ?? EMPTY_HISTORY,
    [complaintsResp],
  );

  // ── Resolve data ──────────────────────────────────────────────────────────
  // Phase 3 (React Performance): memoized so downstream effects that depend
  // on `hotspots`/`waterBodies`/`zones` don't run on every MapPage re-render
  // (e.g. every `drawerSearch` keystroke or mobile-sheet drag update).
  const fallback = CITY_MAP_DATA[city.id] ?? CITY_MAP_DATA["belagavi"];
  const apiData = mapDataResponse?.data;
  const hotspots: MapLocation[] = useMemo(
    () => apiData?.locations ?? (fallback.hotspots as unknown as MapLocation[]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiData, city.id],
  );
  const waterBodies: WaterBody[] = useMemo(
    () => apiData?.waterBodies ?? fallback.waterBodies,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiData, city.id],
  );
  const zones: EnvZones = useMemo(
    () => apiData?.zones ?? fallback.zones,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiData, city.id],
  );

  // ── Filtered hotspots (header search) ────────────────────────────────────
  const filteredHotspots = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hotspots;
    return hotspots.filter((h) => h.name.toLowerCase().includes(q));
  }, [hotspots, search]);

  // Phase 10: Nearby Environmental Intelligence — nearest sensor and open
  // complaint to the user's GPS position (Section bonus). Placed here because
  // both filteredHotspots and allComplaints are now in scope.
  const nearestSensor = useMemo(() => {
    if (!geo.position || !filteredHotspots.length) return null;
    const { lat, lng } = geo.position;
    let nearest = filteredHotspots[0];
    let nearestDist = Infinity;
    for (const h of filteredHotspots) {
      const d = Math.hypot(h.latitude - lat, h.longitude - lng);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = h;
      }
    }
    return { sensor: nearest, distKm: nearestDist * 111 };
  }, [geo.position, filteredHotspots]);

  const nearestComplaint = useMemo(() => {
    if (!geo.position || !allComplaints.length) return null;
    const { lat, lng } = geo.position;
    const open = allComplaints.filter((c) => c.status !== "resolved" && c.lat && c.lng);
    if (!open.length) return null;
    let nearest = open[0];
    let nearestDist = Infinity;
    for (const c of open) {
      const d = Math.hypot((c.lat ?? 0) - lat, (c.lng ?? 0) - lng);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = c;
      }
    }
    return { complaint: nearest, distKm: nearestDist * 111 };
  }, [geo.position, allComplaints]);

  const band = aqiBand(city.aqi);
  const sensorsOnline = hotspots.filter((h) => h.sensor).length;
  const highRisk = hotspots.filter((h) => h.level > 150).length;
  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "–";

  // ── AI Insights: computed further below, once historyAqi exists ──────────
  const selectedHotspot = selected ? (hotspots.find((h) => h.id === selected) ?? null) : null;

  // ── Drawer zone list with sort + filter + drawer search ──────────────────
  const categories = useMemo(
    () => ["all", ...Array.from(new Set(hotspots.map((h) => h.category)))],
    [hotspots],
  );

  const drawerHotspots = useMemo(() => {
    let list = [...filteredHotspots];
    if (filterCategory !== "all") list = list.filter((h) => h.category === filterCategory);
    if (drawerSearch.trim()) {
      const q = drawerSearch.trim().toLowerCase();
      list = list.filter((h) => h.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => (sortDesc ? b.level - a.level : a.level - b.level));
    return list;
  }, [filteredHotspots, filterCategory, drawerSearch, sortDesc]);

  // ── Trend sparklines per hotspot (Phase 2: seeded from the location's own
  //    stable id, not its current momentary level — two locations that
  //    happen to share a level no longer produce identical trend shapes,
  //    and a location's shape no longer drifts every time its reading
  //    changes. Same fix as SmartMapCanvas.tsx's popup sparkline.) ─────────
  const sparkForHotspot = (h: MapLocation) =>
    trendSeries(stableSeed(h.id), h.level, 12, 10).map((p) => p.aqi);

  // ── Zone breakdown ─────────────────────────────────────────────────────────
  const zoneRows = [
    { l: "Residential", c: "var(--color-success)", v: zones.residential, icon: "🏘" },
    { l: "Industrial", c: "var(--color-destructive)", v: zones.industrial, icon: "🏭" },
    { l: "Commercial", c: "var(--color-warning)", v: zones.commercial, icon: "🏢" },
    { l: "Green Cover", c: "oklch(0.72 0.19 145)", v: zones.greenCover, icon: "🌳" },
  ];

  // ── History trend spark ────────────────────────────────────────────────────
  const historyAqi = useMemo(
    () =>
      (historyResp?.data?.history ?? [])
        .map((d: { aqi: { avg: number } }) => d.aqi?.avg ?? 0)
        .filter(Boolean),
    [historyResp],
  );

  // ── AQI KPI trend + prediction (Phase 3B) — real data only. Trend is the
  //    actual first-vs-latest delta in the fetched history window (nothing
  //    shown unless real history has loaded); prediction reuses the same
  //    forecastSeries() already driving the Intel tab's 6h forecast bars. ──
  const aqiTrend = useMemo(() => {
    if (historyAqi.length < 2) return undefined;
    const delta = historyAqi[historyAqi.length - 1] - historyAqi[0];
    return {
      direction: trendArrow(historyAqi[historyAqi.length - 1], historyAqi[0]),
      delta: Math.round(delta),
    };
  }, [historyAqi]);
  const aqiForecast6h = useMemo(() => {
    const fc = forecastSeries(city.aqi, city.aqi, 6);
    return fc[fc.length - 1]?.predicted;
  }, [city.aqi]);

  // ── AI Insights (Phase 4: now includes real spatial-proximity findings and
  //    a history-gated stability check, alongside the existing city-level
  //    threshold insights) ───────────────────────────────────────────────────
  const aiInsights = useMemo(() => {
    const base = generateAiInsights(city, selectedHotspot?.level);
    const spatial = generateSpatialInsights(hotspots, 2);
    // Only a real finding when real history has loaded and shows AQI held
    // roughly flat (±5) despite the city currently running warm (>32°C).
    const stability: typeof base = [];
    if (historyAqi.length > 1) {
      const delta = Math.abs(historyAqi[historyAqi.length - 1] - historyAqi[0]);
      if (delta <= 5 && city.temp > 32) {
        stability.push({
          icon: "📊",
          level: "good",
          label: "AQI holding steady despite heat",
          detail: `AQI moved only ${delta.toFixed(0)} points over the fetched window while temperature sits at ${city.temp}°C — dispersion is currently keeping pace with the thermal load.`,
        });
      }
    }
    return [...base, ...spatial, ...stability];
  }, [city, selectedHotspot, hotspots, historyAqi]);

  // ── KPI definitions — single source of data for the desktop header strip,
  //    tablet grid, and mobile scroll row (Sections 2–4 of Phase 1). ────────
  const kpiItems: Array<{
    label: string;
    value: string | number;
    unit?: string;
    accent?: string;
    icon?: LucideIcon;
    trend?: { direction: "up" | "down" | "stable"; delta?: number };
    sub?: string;
  }> = [
    {
      label: "AQI",
      value: city.aqi,
      icon: Wind,
      accent: band.color,
      trend: aqiTrend,
      sub: aqiForecast6h != null ? `→ ${aqiForecast6h} in 6h` : undefined,
    },
    {
      label: "Water QI",
      value: city.water,
      unit: "/100",
      icon: Droplets,
      accent: "var(--color-info)",
    },
    {
      label: "Temp",
      value: `${city.temp}°`,
      unit: "C",
      icon: Thermometer,
      accent: "oklch(0.72 0.18 50)",
    },
    {
      label: "Humidity",
      value: city.humidity,
      unit: "%",
      icon: Droplets,
      accent: "var(--color-info)",
    },
    {
      label: "Alerts",
      value: city.alerts,
      icon: AlertTriangle,
      accent: city.alerts > 5 ? "var(--color-destructive)" : "var(--color-warning)",
    },
    {
      label: "Sensors",
      value: `${sensorsOnline}/${hotspots.length}`,
      icon: Cpu,
      accent: "var(--color-success)",
    },
    {
      label: "Risk",
      value: city.risk,
      unit: "/100",
      icon: Shield,
      accent: city.risk > 60 ? "var(--color-destructive)" : "var(--color-warning)",
    },
    {
      label: "Coverage",
      value: `${Math.round((sensorsOnline / Math.max(hotspots.length, 1)) * 100)}`,
      unit: "%",
      icon: Gauge,
      accent: "oklch(0.6 0.02 240)",
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-background">

      {/* ── Phase 4A: Location Switch Confirmation Dialog ──────────────────
          Rendered via Radix AlertDialog (Portal) so it floats above the
          Smart Map canvas at all times. Only appears when the user taps
          "Current Location" and the detected nearest city differs from the
          active monitoring city. Dismissing keeps the current city; confirming
          switches it and persists the choice via setCityId / localStorage.
      ──────────────────────────────────────────────────────────────────────── */}
      <AlertDialog open={!!pendingSwitch} onOpenChange={(open) => { if (!open) setPendingSwitch(null); }}>
        <AlertDialogContent className="max-w-sm rounded-2xl border border-border/60 bg-background shadow-2xl p-0 overflow-hidden">
          {/* Header */}
          <AlertDialogHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center shrink-0">
                <Navigation className="size-5 text-primary" />
              </div>
              <div>
                <AlertDialogTitle className="text-base font-semibold">
                  Location Detected
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Your device location was found
                </AlertDialogDescription>
              </div>
            </div>

            {/* Detected location */}
            <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 mb-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
                📍 You are currently in
              </p>
              <p className="text-sm font-semibold text-foreground">
                {pendingSwitch?.nearestName}
              </p>
              <p className="text-xs text-muted-foreground">{pendingSwitch?.nearestRegion}</p>
            </div>

            {/* Current monitoring city */}
            <div className="rounded-xl bg-muted/50 border border-border/50 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
                🗺 Current monitoring city
              </p>
              <p className="text-sm font-semibold text-foreground">{city.name}</p>
              <p className="text-xs text-muted-foreground">
                AQI {city.aqi} · {aqiBand(city.aqi).label}
              </p>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="px-6 pb-6 flex-col gap-2 sm:flex-col">
            {/* Switch action — primary */}
            <button
              onClick={() => {
                if (pendingSwitch) {
                  setCityId(pendingSwitch.nearestId);
                }
                setPendingSwitch(null);
              }}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Switch to {pendingSwitch?.nearestName}
            </button>

            {/* Keep current — secondary */}
            <button
              onClick={() => setPendingSwitch(null)}
              className="w-full h-10 rounded-xl border border-border/60 bg-muted/40 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Keep {city.name}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ══════════════════════════════════════════════════════════════════════
          ENTERPRISE HEADER
      ════════════════════════════════════════════════════════════════════════ */}
      <header className="shrink-0 glass-panel border-b border-border/50 px-3 py-2 sm:px-4 z-30">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Identity */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div
              className="size-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "color-mix(in oklab, var(--color-primary) 15%, transparent)",
                border: "1px solid color-mix(in oklab, var(--color-primary) 30%, transparent)",
              }}
            >
              <MapPin className="size-4 text-primary" />
            </div>
            <div className="min-w-0">
              {/* Breadcrumb — hidden on phones to keep the header to one
                  compact row; title + city are still legible via the h1. */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
                  Environmental GIS
                </span>
                <span className="text-muted-foreground/40 text-[10px]">/</span>
                <span className="text-[9px] uppercase tracking-[0.18em] text-primary">
                  {city.name}
                </span>
              </div>
              <h1 className="text-[13px] sm:text-[15px] font-semibold tracking-tight leading-tight truncate">
                <span className="sm:hidden text-primary">{city.name} · </span>Smart Map
              </h1>
            </div>
          </div>

          {/* KPI Strip (Desktop/Laptop only, ≥1024px) — varied semantic
              palette instead of defaulting to primary green everywhere; only
              AQI (the flagship metric) carries a trend/prediction line, and
              only when backed by real data. Tablet/mobile get the same data
              in the responsive KPI band rendered just below the header. */}
          <div className="hidden lg:flex items-center gap-2 flex-1 max-w-3xl justify-center">
            {kpiItems.map((k) => (
              <KpiChip key={k.label} {...k} />
            ))}
          </div>

          {/* Right status */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <StatusChip tone={mapLoaded ? "good" : "neutral"} pulse={mapLoaded}>
              {mapLoaded ? "Live" : "Offline"}
            </StatusChip>
            {mapLoaded && (
              <span className="hidden sm:flex text-[10px] text-muted-foreground items-center gap-1">
                <Clock3 className="size-2.5" /> {lastUpdated}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          RESPONSIVE KPI BAND (Tablet + Mobile, <1024px) — Section 3/4 of the
          Phase 1 spec: tablet gets a wrapping card grid so nothing overflows,
          mobile gets a single horizontally-scrollable row of metric chips.
          Desktop/Laptop keep the inline strip in the header above instead.
      ════════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden shrink-0 border-b border-border/40 bg-background/40">
        {/* Tablet (≥768px): responsive card grid, wraps instead of scrolling */}
        <div className="hidden md:grid grid-cols-4 gap-2 px-4 py-2.5">
          {kpiItems.map((k) => (
            <KpiChip key={k.label} {...k} />
          ))}
        </div>
        {/* Mobile (<768px): horizontally scrollable chip row, never overflows.
            Scroll-snap + `overscroll-x-contain` gives it the same settled,
            native feel as the tablet/desktop presentations (Section 2). */}
        <div
          className="flex md:hidden gap-2 overflow-x-auto snap-x snap-mandatory overscroll-x-contain scroll-smooth px-3 py-2.5 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {kpiItems.map((k) => (
            <KpiChip key={k.label} {...k} className="shrink-0 w-[108px] snap-start" />
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MAIN CONTENT — the map is the hero; toolbar, layers, legend and
          timeline all now live as overlays inside SmartMapCanvas itself so
          this row is 100% map viewport with no extra chrome bars.
      ════════════════════════════════════════════════════════════════════════ */}
      <div ref={mapAreaRef} className="flex-1 flex min-h-0 relative smartmap-area">
        {/* MAP CANVAS */}
        <SmartMapCanvas
          city={city}
          hotspots={filteredHotspots}
          mapData={apiData ?? null}
          waterBodies={waterBodies}
          activeLayers={active}
          selectedId={selected}
          onSelectLocation={handleSelectLocation}
          onToggleLayer={toggle}
          sensorsOnline={sensorsOnline}
          highRisk={highRisk}
          band={band}
          isApiConnected={isApiConnected}
          mapLoaded={mapLoaded}
          lastUpdated={lastUpdated}
          search={search}
          onSearchChange={handleSearchChange}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          hasHistory={hasHistory}
          historyData={historyResp?.data?.history ?? EMPTY_HISTORY}
          userPosition={geo.position}
          geoStatus={geo.status}
          isTracking={geo.isTracking}
          onLocate={geo.locate}
          onToggleTracking={geo.isTracking ? geo.stopTracking : geo.startTracking}
        />

        {/* ══════════════════════════════════════════════════════════════════
            NEARBY ENVIRONMENTAL INTELLIGENCE (Phase 10, Section bonus)
            Appears as a compact floating card above the mobile sheet /
            tablet bottom panel when a GPS position has been granted.
            Shows the nearest sensor, AQI at that sensor, the nearest
            open complaint, and the user's GPS accuracy tier — making
            the map feel personally relevant rather than just centred.
        ═════════════════════════════════════════════════════════════════════ */}
        <AnimatePresence>
          {geo.position && (nearestSensor || nearestComplaint) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-3 right-3 sm:left-4 sm:right-auto sm:w-80 z-30"
              style={{
                bottom: `calc(${isMobile ? "var(--nb-bottom, 116px)" : "4rem"} + 0.75rem)`,
              }}
            >
              <div
                className="rounded-2xl p-3 flex flex-col gap-2"
                style={{
                  background: "var(--panel-bg)",
                  border: "1px solid var(--panel-border)",
                  boxShadow: "var(--panel-shadow)",
                }}
              >
                {/* Header */}
                <div className="flex items-center gap-2">
                  <span
                    className="size-6 rounded-lg grid place-items-center shrink-0"
                    style={{ background: "oklch(0.55 0.18 240 / 0.18)" }}
                  >
                    <MapPin className="size-3.5 text-blue-400" />
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex-1">
                    Nearby Environmental Intelligence
                  </span>
                  <span
                    className="text-[7.5px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      background:
                        geo.position.accuracyTier === "excellent" ||
                        geo.position.accuracyTier === "good"
                          ? "color-mix(in oklab, var(--color-success) 14%, transparent)"
                          : "color-mix(in oklab, var(--color-warning) 14%, transparent)",
                      color:
                        geo.position.accuracyTier === "excellent" ||
                        geo.position.accuracyTier === "good"
                          ? "var(--color-success)"
                          : "var(--color-warning)",
                    }}
                  >
                    GPS {geo.position.accuracyTier} ±{Math.round(geo.position.accuracy)}m
                  </span>
                </div>

                {/* Nearest sensor */}
                {nearestSensor && (
                  <div
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                    style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
                  >
                    <Activity className="size-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-semibold truncate">
                        {nearestSensor.sensor.name}
                      </div>
                      <div className="text-[8px] text-muted-foreground/70">
                        Nearest sensor ·{" "}
                        {nearestSensor.distKm < 1
                          ? `${Math.round(nearestSensor.distKm * 1000)} m`
                          : `${nearestSensor.distKm.toFixed(1)} km`}
                      </div>
                    </div>
                    <div>
                      <div
                        className="text-[13px] font-bold tabular-nums"
                        style={{ color: band.color }}
                      >
                        {nearestSensor.sensor.level ?? city.aqi}
                      </div>
                      <div className="text-[7px] text-muted-foreground/60 text-right">AQI</div>
                    </div>
                  </div>
                )}

                {/* Nearest open complaint */}
                {nearestComplaint && (
                  <div
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                    style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
                  >
                    <AlertTriangle className="size-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-semibold truncate">
                        {nearestComplaint.complaint.title}
                      </div>
                      <div className="text-[8px] text-muted-foreground/70">
                        Nearby complaint ·{" "}
                        {nearestComplaint.distKm < 1
                          ? `${Math.round(nearestComplaint.distKm * 1000)} m`
                          : `${nearestComplaint.distKm.toFixed(1)} km`}
                      </div>
                    </div>
                    <span
                      className="text-[7.5px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                      style={{
                        background:
                          nearestComplaint.complaint.severity === "critical"
                            ? "color-mix(in oklab, var(--color-destructive) 16%, transparent)"
                            : "color-mix(in oklab, var(--color-warning) 16%, transparent)",
                        color:
                          nearestComplaint.complaint.severity === "critical"
                            ? "var(--color-destructive)"
                            : "var(--color-warning)",
                      }}
                    >
                      {nearestComplaint.complaint.severity}
                    </span>
                  </div>
                )}

                {/* Geo error messages */}
                {(geo.status === "denied" ||
                  geo.status === "unavailable" ||
                  geo.status === "timeout") && (
                  <div className="text-[8.5px] text-muted-foreground/70 text-center py-0.5">
                    {geo.statusMessage}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════════════════════════════════════════════════════════════
            INTELLIGENCE PANEL — one element, responsive per breakpoint:
              • Desktop/Laptop (≥1024px): unchanged side rail, toggled by width.
              • Tablet (768–1023px): bottom-docked panel, toggled by height —
                no longer permanently consumes horizontal space.
              • Mobile (<768px): draggable bottom sheet with collapsed / half /
                full states (drag the handle, or tap it to cycle).
            `drawerOpen` is the single "expanded?" source of truth shared by
            all three; `mobileSheetTall` only distinguishes half vs. full on
            mobile. The tab content below is written once and reused as-is
            at every breakpoint — Section 12 of the Phase 1 spec.
        ════════════════════════════════════════════════════════════════════ */}
        {/* ── Resize divider (desktop only) ────────────────────────────────
            A thin 8px hover-target sits between the map and the panel.
            Pointer events on this strip update panelWidth via the ref-based
            drag handler above; the panel's `--ic-width` CSS var follows. */}
        {drawerOpen && (
          <div
            ref={resizeDividerRef}
            className="hidden lg:flex absolute right-0 top-0 bottom-0 z-30 items-center justify-center cursor-col-resize group"
            style={{ width: 10, right: panelWidth - 2 }}
            onPointerDown={onDividerPointerDown}
            onPointerMove={onDividerPointerMove}
            onPointerUp={onDividerPointerUp}
            onPointerCancel={onDividerPointerUp}
            aria-label="Resize intelligence panel"
            role="separator"
            aria-orientation="vertical"
          >
            <div
              className="w-px h-12 rounded-full opacity-0 group-hover:opacity-60 group-active:opacity-100 transition-opacity duration-150"
              style={{ background: "var(--color-border)" }}
            />
          </div>
        )}

        <motion.div
          drag={isMobile ? "y" : false}
          dragControls={mobileDragControls}
          dragListener={false}
          dragConstraints={{ top: mobileFullY, bottom: mobileCollapsedY }}
          dragElastic={0.05}
          dragMomentum={false}
          onDragEnd={onMobileSheetDragEnd}
          style={
            {
              y: mobileSheetY,
              "--sheet-h": `${mobileSheetMaxH}px`,
              "--ic-width": `${panelWidth}px`,
            } as React.ComponentProps<typeof motion.div>["style"]
          }
          className={cn(
            "glass-panel flex flex-col z-20 border-border/50 overflow-hidden",
            // Mobile (base): draggable bottom sheet
            "absolute inset-x-0 bottom-0 border-t rounded-t-2xl h-[var(--sheet-h)]",
            // Tablet: bottom-docked collapsible panel
            drawerOpen ? "md:h-[46vh]" : "md:h-12",
            // Desktop/Laptop: side rail using resizable --ic-width
            "lg:static lg:inset-auto lg:h-auto lg:shrink-0 lg:border-t-0 lg:border-l lg:rounded-none",
            drawerOpen ? "lg:w-[var(--ic-width)]" : "lg:w-12",
            !drawerOpen && "lg:transition-[width] lg:duration-300",
          )}
        >
          {/* Desktop toggle (≥1024px) */}
          <button
            onClick={() => setDrawerOpen((o) => !o)}
            className="hidden lg:flex w-full items-center justify-center py-3 hover:bg-white/5 transition-colors shrink-0 border-b border-border/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset"
            aria-label={drawerOpen ? "Collapse intelligence panel" : "Expand intelligence panel"}
            aria-expanded={drawerOpen}
          >
            {drawerOpen ? (
              <ChevronRight className="size-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="size-4 text-muted-foreground" />
            )}
          </button>

          {/* Tablet toggle bar (768–1023px) */}
          <button
            onClick={() => setDrawerOpen((o) => !o)}
            className="hidden md:flex lg:hidden w-full items-center justify-between px-4 h-12 shrink-0 hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset"
            aria-label={drawerOpen ? "Collapse intelligence panel" : "Expand intelligence panel"}
            aria-expanded={drawerOpen}
          >
            <span className="flex items-center gap-2 min-w-0">
              <Shield className="size-3.5 text-primary shrink-0" />
              <span className="text-[11px] font-medium truncate">{city.name} Insights</span>
              <StatusChip tone={highRisk > 0 ? "critical" : "good"} pulse size="xs">
                {sensorsOnline} online · {highRisk} critical
              </StatusChip>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              <span
                className="text-[10px] font-semibold tabular-nums"
                style={{ color: band.color }}
              >
                AQI {city.aqi}
              </span>
              {drawerOpen ? (
                <ChevronDown className="size-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="size-4 text-muted-foreground" />
              )}
            </span>
          </button>

          {/* Mobile drag handle + summary (<768px) — drag the handle to
              resize the sheet with real spring/velocity physics; tap it to
              cycle collapsed → half → full → collapsed. Drag is scoped to
              this handle only (dragListener=false + dragControls.start), so
              scrolling the zones/intel/summary list below never fights the
              gesture. */}
          <div
            className="md:hidden shrink-0 select-none cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => mobileDragControls.start(e)}
            style={{ touchAction: "none" }}
          >
            <div className="flex justify-center pt-2.5 pb-1.5">
              <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>
            <button
              type="button"
              onClick={cycleMobileSheet}
              className="w-full flex items-center justify-between gap-2 px-4 pb-2.5 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset rounded-lg"
              aria-label={
                !drawerOpen
                  ? "Expand intelligence panel to half height"
                  : !mobileSheetTall
                    ? "Expand intelligence panel to full height"
                    : "Collapse intelligence panel"
              }
            >
              <span className="flex items-center gap-2 min-w-0">
                <Shield className="size-3.5 text-primary shrink-0" />
                <span className="text-[12px] font-semibold truncate">{city.name} Insights</span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-bold tabular-nums" style={{ color: band.color }}>
                  AQI {city.aqi}
                </span>
                {drawerOpen ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="size-4 text-muted-foreground" />
                )}
              </span>
            </button>
          </div>

          {drawerOpen && (
            <>
              {/* ── Desktop-only header (sticky, Section 2) ──────────────────── */}
              <div className="hidden lg:flex flex-col gap-3 px-5 pt-4 pb-3 border-b border-border/30 shrink-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[8px] font-bold uppercase tracking-[0.28em] text-muted-foreground/55 mb-1.5">
                      Intelligence Center
                    </div>
                    <div className="text-[18px] font-bold leading-none tracking-tight">
                      {city.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground/65 mt-1 font-medium">
                      Environmental Operations
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0 mt-0.5">
                    <StatusChip tone={highRisk > 0 ? "critical" : "good"} pulse size="xs">
                      {highRisk > 0 ? `${highRisk} critical` : "All clear"}
                    </StatusChip>
                    <span className="text-[8.5px] text-muted-foreground/55 tabular-nums">
                      {sensorsOnline} sensors online
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: band.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(city.aqi / 3, 100)}%` }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <span
                    className="text-[9px] font-bold tabular-nums shrink-0"
                    style={{ color: band.color }}
                  >
                    AQI {city.aqi}
                  </span>
                  <span className="text-[8px] text-muted-foreground/55 shrink-0">{band.label}</span>
                </div>
              </div>

              {/* ── Tab navigation (Section 3) ────────────────────────────────
                  Desktop (≥1024px): 2-row 4-col icon+label grid — each tab has
                    a larger click area, bigger icon, contextual accent colour.
                  Tablet (768–1023px): single horizontal snap-scroll row.
                  Mobile (<768px): <select> dropdown + icon preview. */}
              {(() => {
                const TABS: Array<{
                  id: typeof drawerTab;
                  label: string;
                  icon: typeof Gauge;
                  accent: string;
                }> = [
                  { id: "stats", label: "Summary", icon: Gauge, accent: "var(--color-primary)" },
                  { id: "zones", label: "Zones", icon: MapPin, accent: "var(--color-success)" },
                  { id: "insights", label: "Intel", icon: Zap, accent: "oklch(0.72 0.18 50)" },
                  {
                    id: "weather",
                    label: "Weather",
                    icon: CloudRain,
                    accent: "oklch(0.70 0.14 240)",
                  },
                  { id: "air", label: "Air", icon: Leaf, accent: "oklch(0.72 0.19 160)" },
                  {
                    id: "hazard",
                    label: "Hazard",
                    icon: TriangleAlert,
                    accent: "oklch(0.68 0.22 35)",
                  },
                  { id: "ai", label: "AI", icon: Sparkles, accent: "oklch(0.65 0.20 290)" },
                  { id: "twin", label: "Twin", icon: Globe, accent: "oklch(0.70 0.16 200)" },
                ];
                const activeTab = TABS.find((t) => t.id === drawerTab) ?? TABS[0];

                return (
                  <>
                    {/* Desktop: 4-column × 2-row grid */}
                    <div
                      className="hidden lg:grid grid-cols-4 border-b border-border/30 shrink-0"
                      role="tablist"
                      aria-label="Intelligence panel sections"
                    >
                      {TABS.map((tab) => {
                        const isActive = drawerTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setDrawerTab(tab.id)}
                            className="relative flex flex-col items-center justify-center gap-1.5 py-3 px-1 min-h-[60px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                            style={
                              {
                                "--tw-ring-color": tab.accent,
                                background: isActive
                                  ? `color-mix(in oklab, ${tab.accent} 9%, transparent)`
                                  : "transparent",
                                borderBottom: `2px solid ${isActive ? tab.accent : "transparent"}`,
                              } as React.CSSProperties
                            }
                          >
                            <tab.icon
                              className="size-4 transition-all duration-150"
                              style={{
                                color: isActive ? tab.accent : "var(--color-muted-foreground)",
                              }}
                            />
                            <span
                              className="text-[9px] font-semibold tracking-[0.08em]"
                              style={{
                                color: isActive ? tab.accent : "var(--color-muted-foreground)",
                              }}
                            >
                              {tab.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Tablet: horizontal snap-scroll row with overflow hints */}
                    <div className="hidden md:block lg:hidden shrink-0 border-b border-border/30">
                      <div
                        className="flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
                        style={{ scrollbarWidth: "none" }}
                        role="tablist"
                        aria-label="Intelligence panel sections"
                      >
                        {TABS.map((tab) => {
                          const isActive = drawerTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              role="tab"
                              aria-selected={isActive}
                              onClick={() => setDrawerTab(tab.id)}
                              className="snap-start shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 min-w-[72px] min-h-[52px] relative transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                              style={
                                {
                                  "--tw-ring-color": tab.accent,
                                  background: isActive
                                    ? `color-mix(in oklab, ${tab.accent} 9%, transparent)`
                                    : "transparent",
                                  borderBottom: `2px solid ${isActive ? tab.accent : "transparent"}`,
                                } as React.CSSProperties
                              }
                            >
                              <tab.icon
                                className="size-3.5"
                                style={{
                                  color: isActive ? tab.accent : "var(--color-muted-foreground)",
                                }}
                              />
                              <span
                                className="text-[9px] font-semibold tracking-[0.06em] whitespace-nowrap"
                                style={{
                                  color: isActive ? tab.accent : "var(--color-muted-foreground)",
                                }}
                              >
                                {tab.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mobile: compact <select> dropdown */}
                    <div className="md:hidden shrink-0 px-3 py-2.5 border-b border-border/30">
                      <div className="relative">
                        <activeTab.icon
                          className="absolute left-3 top-1/2 -translate-y-1/2 size-4 pointer-events-none z-10"
                          style={{ color: activeTab.accent }}
                        />
                        <select
                          value={drawerTab}
                          onChange={(e) => setDrawerTab(e.target.value as typeof drawerTab)}
                          aria-label="Select intelligence module"
                          className="w-full pl-9 pr-8 py-2.5 rounded-xl text-[12px] font-semibold appearance-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                          style={{
                            background: `color-mix(in oklab, ${activeTab.accent} 10%, var(--card-bg))`,
                            border: `1px solid color-mix(in oklab, ${activeTab.accent} 25%, transparent)`,
                            color: activeTab.accent,
                          }}
                        >
                          {TABS.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 pointer-events-none"
                          style={{ color: activeTab.accent }}
                        />
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* ── Drawer content ─────────────────────────────────────────────── */}
              <div className="flex-1 overflow-y-auto">
                {/* ══ TAB: ZONES ══════════════════════════════════════════════════ */}
                {drawerTab === "zones" && (
                  <div className="p-3 space-y-2">
                    <SectionHeader icon={MapPin} label="Top Risk Zones" />

                    {/* Controls bar */}
                    <div className="flex items-center gap-1.5 mb-2">
                      {/* Drawer search */}
                      <div className="flex-1 glass-card rounded-lg flex items-center gap-1.5 px-2 py-1.5">
                        <Search className="size-2.5 text-muted-foreground shrink-0" />
                        <input
                          value={drawerSearch}
                          onChange={(e) => setDrawerSearch(e.target.value)}
                          placeholder="Filter zones…"
                          className="bg-transparent outline-none text-[10px] w-full placeholder:text-muted-foreground/50"
                        />
                        {drawerSearch && (
                          <button
                            onClick={() => setDrawerSearch("")}
                            className="text-muted-foreground text-[9px]"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      {/* Sort toggle */}
                      <button
                        onClick={() => setSortDesc((d) => !d)}
                        title={sortDesc ? "Sorted: worst first" : "Sorted: best first"}
                        className="glass-card rounded-lg p-1.5 hover:bg-white/5 transition-colors"
                      >
                        {sortDesc ? (
                          <SortDesc className="size-3 text-primary" />
                        ) : (
                          <SortAsc className="size-3 text-muted-foreground" />
                        )}
                      </button>
                      {/* Category filter */}
                      <div className="relative">
                        <select
                          value={filterCategory}
                          onChange={(e) => setFilterCat(e.target.value)}
                          className="glass-card rounded-lg text-[9px] py-1.5 pl-2 pr-5 appearance-none cursor-pointer text-muted-foreground focus:outline-none"
                        >
                          {categories.map((c) => (
                            <option key={c} value={c}>
                              {c === "all" ? "All types" : c}
                            </option>
                          ))}
                        </select>
                        <Filter className="size-2.5 text-muted-foreground absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Summary row */}
                    <div className="grid grid-cols-3 gap-1 mb-2">
                      {[
                        { label: "Locations", value: drawerHotspots.length },
                        {
                          label: "Critical",
                          value: drawerHotspots.filter((h) => h.level > 150).length,
                          accent: "var(--color-destructive)",
                        },
                        {
                          label: "W/ Sensor",
                          value: drawerHotspots.filter((h) => h.sensor).length,
                          accent: "var(--color-success)",
                        },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="glass-card rounded-lg px-2 py-1.5 text-center"
                        >
                          <div className="text-[9px] text-muted-foreground">{s.label}</div>
                          <div
                            className="text-xs font-bold tabular-nums mt-0.5"
                            style={{ color: s.accent }}
                          >
                            {s.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Hotspot list */}
                    {drawerHotspots.map((h, idx) => {
                      const col = aqiColor(h.level);
                      const isSelected = selected === h.id;
                      const spark = sparkForHotspot(h);
                      const prevLevel = spark[0] ?? h.level;
                      const direction = trendArrow(h.level, prevLevel);

                      return (
                        <button
                          key={h.id}
                          onClick={() => setSelected((s) => (s === h.id ? null : h.id))}
                          className={cn(
                            "w-full text-left rounded-xl border p-2.5 transition-all duration-150",
                            isSelected
                              ? "border-primary/40 bg-primary/6"
                              : "border-border/40 hover:bg-white/5 hover:border-border/70",
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {/* Rank + icon */}
                            <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                              <span className="text-[8px] font-mono text-muted-foreground/40 tabular-nums">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <span className="text-base leading-none">
                                {categoryIcon(h.category)}
                              </span>
                            </div>

                            {/* Name + meta */}
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-medium leading-snug truncate">
                                {h.name}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span
                                  className="size-1.5 rounded-full shrink-0"
                                  style={{ background: categoryColor(h.category) }}
                                />
                                <span className="text-[11px] text-muted-foreground">
                                  {CATEGORY_LABEL[h.category] ?? h.category}
                                </span>
                                {h.sensor && (
                                  <span className="text-[11px] text-[var(--color-success)] flex items-center gap-0.5 ml-auto">
                                    <span className="size-1 rounded-full bg-current animate-pulse inline-block" />
                                    Live
                                  </span>
                                )}
                              </div>

                              {/* Mini sparkline */}
                              <div className="mt-1.5">
                                <MiniSpark data={spark} color={col} height={18} />
                              </div>
                            </div>

                            {/* AQI + trend */}
                            <div className="shrink-0 text-right flex flex-col items-end gap-0.5">
                              <div
                                className="text-sm font-bold tabular-nums"
                                style={{ color: col }}
                              >
                                {h.level}
                              </div>
                              <div className="text-[8px] font-medium" style={{ color: col }}>
                                {aqiLabel(h.level)}
                              </div>
                              <TrendBadge direction={direction} />
                            </div>
                          </div>

                          {/* AQI progress bar */}
                          <div className="mt-2 h-1 rounded-full bg-white/8 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(h.level / 3, 100)}%`, background: col }}
                            />
                          </div>

                          {/* Severity badge */}
                          {h.level > 150 && (
                            <div className="mt-1.5">
                              <StatusChip tone="critical" size="xs">
                                <AlertTriangle className="size-2.5" />
                                Critical zone — monitoring required
                              </StatusChip>
                            </div>
                          )}
                        </button>
                      );
                    })}

                    {drawerHotspots.length === 0 && (
                      <EmptyState
                        icon={MapPin}
                        message="No zones match your filter"
                        hint="Try clearing the search or category filter"
                      />
                    )}

                    {/* Zone breakdown */}
                    <div className="mt-4 pt-3 border-t border-border/30">
                      <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
                        Land Use
                      </div>
                      {zoneRows.map((z) => (
                        <div key={z.l} className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              {z.icon} {z.l}
                            </span>
                            <span
                              className="text-[10px] font-bold tabular-nums"
                              style={{ color: z.c }}
                            >
                              {z.v}%
                            </span>
                          </div>
                          <div className="h-1 rounded-full bg-white/8 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${z.v}%`, background: z.c }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Water bodies */}
                    {waterBodies.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/30">
                        <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
                          Water Bodies
                        </div>
                        {waterBodies.slice(0, 5).map((wb) => (
                          <div
                            key={wb.id}
                            className="flex items-center gap-2 px-1 py-1 text-[10px]"
                          >
                            <span className="size-2 rounded-full bg-[var(--color-info)] shrink-0" />
                            <span className="text-muted-foreground">{wb.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ══ TAB: AI INSIGHTS ════════════════════════════════════════════ */}
                {drawerTab === "insights" && (
                  <div className="p-3 space-y-2">
                    <SectionHeader icon={Zap} label="AI Insight Summary" />

                    {/* Header with selected context */}
                    {selectedHotspot && (
                      <div
                        className="rounded-xl p-3 mb-1"
                        style={{
                          background: `color-mix(in oklab, ${aqiColor(selectedHotspot.level)} 8%, transparent)`,
                          border: `1px solid color-mix(in oklab, ${aqiColor(selectedHotspot.level)} 20%, transparent)`,
                        }}
                      >
                        <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
                          Selected Zone
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold truncate">
                            {selectedHotspot.name}
                          </span>
                          <span
                            className="text-sm font-bold tabular-nums ml-2 shrink-0"
                            style={{ color: aqiColor(selectedHotspot.level) }}
                          >
                            AQI {selectedHotspot.level}
                          </span>
                        </div>
                      </div>
                    )}

                    {aiInsights.map((insight, i) => {
                      const levelColors = {
                        critical: {
                          bg: "color-mix(in oklab, var(--color-destructive) 10%, transparent)",
                          border: "color-mix(in oklab, var(--color-destructive) 25%, transparent)",
                          text: "var(--color-destructive)",
                        },
                        warning: {
                          bg: "color-mix(in oklab, var(--color-warning) 8%, transparent)",
                          border: "color-mix(in oklab, var(--color-warning) 22%, transparent)",
                          text: "var(--color-warning)",
                        },
                        info: {
                          bg: "color-mix(in oklab, var(--color-info) 8%, transparent)",
                          border: "color-mix(in oklab, var(--color-info) 20%, transparent)",
                          text: "var(--color-info)",
                        },
                        good: {
                          bg: "color-mix(in oklab, var(--color-success) 8%, transparent)",
                          border: "color-mix(in oklab, var(--color-success) 20%, transparent)",
                          text: "var(--color-success)",
                        },
                      }[insight.level];
                      return (
                        <div
                          key={i}
                          className="rounded-xl p-3"
                          style={{
                            background: levelColors.bg,
                            border: `1px solid ${levelColors.border}`,
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-base shrink-0 mt-0.5">{insight.icon}</span>
                            <div className="min-w-0">
                              <div
                                className="text-[11px] font-semibold mb-0.5"
                                style={{ color: levelColors.text }}
                              >
                                {insight.label}
                              </div>
                              <div className="text-[10px] text-muted-foreground leading-relaxed">
                                {insight.detail}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Recommendations — forecast + policy guidance, same
                      computations as before, grouped under one named
                      section per Phase 3B */}
                    <div className="mt-4 pt-3 border-t border-border/30">
                      <SectionHeader icon={Lightbulb} label="Recommendations" />

                      <div className="glass-card rounded-xl p-3 mb-2">
                        <div className="text-[8px] uppercase tracking-[0.14em] text-muted-foreground mb-2 flex items-center gap-1.5">
                          <TrendingUp className="size-2.5" /> 6-Hour Forecast
                        </div>
                        {(() => {
                          const fc = forecastSeries(city.aqi, city.aqi, 6);
                          return (
                            <div className="flex items-end gap-1 h-10">
                              {fc.map((pt, i) => {
                                const col = aqiColor(pt.predicted);
                                const h = Math.max(20, Math.min(100, (pt.predicted / 250) * 100));
                                return (
                                  <div
                                    key={i}
                                    className="flex-1 flex flex-col items-center gap-0.5"
                                  >
                                    <div
                                      className="w-full rounded-sm transition-all duration-300"
                                      style={{ height: `${h}%`, background: col, opacity: 0.8 }}
                                      title={`+${pt.hour}h: AQI ${pt.predicted}`}
                                    />
                                    <span className="text-[7px] text-muted-foreground/60 tabular-nums">
                                      +{pt.hour}h
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>

                      <div
                        className="rounded-xl p-3"
                        style={{
                          background: "color-mix(in oklab, var(--color-primary) 7%, transparent)",
                          border:
                            "1px solid color-mix(in oklab, var(--color-primary) 18%, transparent)",
                        }}
                      >
                        <div className="flex items-center gap-1.5 text-primary text-[9px] uppercase tracking-[0.14em] mb-1.5">
                          <Cpu className="size-3" /> GreenGuard Intelligence Center
                        </div>
                        <div className="text-[10px] text-muted-foreground leading-relaxed">
                          {city.aqi > 150
                            ? `Immediate action advised. Restrict ${city.name} industrial output and issue public health advisory. Expect AQI reduction of 20–35 points with traffic restrictions.`
                            : city.aqi > 80
                              ? `Consider advisory for sensitive groups in high-pollution zones. Increasing green buffer zones by 12% could reduce average AQI by ~15 points.`
                              : `Current conditions within acceptable range. Continue monitoring industrial zones. Maintain green cover targets above ${city.eco}%.`}
                        </div>
                      </div>
                    </div>

                    {/* Recent Events — Phase 3B: real citizen complaints,
                      newest first. No synthetic data — this is empty until
                      the city actually has logged complaints. */}
                    <div className="mt-4 pt-3 border-t border-border/30">
                      <SectionHeader icon={Clock3} label="Recent Events" />
                      {recentEvents.length === 0 ? (
                        <EmptyState
                          icon={Clock3}
                          message="No recent events"
                          hint="Citizen-reported issues will appear here as they come in"
                        />
                      ) : (
                        <div className="space-y-1.5">
                          {recentEvents.map((ev) => {
                            const col = SEV_COLOR[ev.severity] ?? "var(--color-warning)";
                            const mins = Math.max(
                              1,
                              Math.round((Date.now() - new Date(ev.createdAt).getTime()) / 60_000),
                            );
                            const ago =
                              mins < 60
                                ? `${mins}m ago`
                                : mins < 1440
                                  ? `${Math.round(mins / 60)}h ago`
                                  : `${Math.round(mins / 1440)}d ago`;
                            return (
                              <div
                                key={ev.id}
                                className="flex items-start gap-2 rounded-lg px-2.5 py-2 bg-white/[0.03] border border-white/[0.06]"
                              >
                                <span
                                  className="size-1.5 rounded-full shrink-0 mt-1"
                                  style={{ background: col }}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-medium truncate">
                                      {ev.title}
                                    </span>
                                    <span className="text-[8px] text-muted-foreground shrink-0">
                                      {ago}
                                    </span>
                                  </div>
                                  <div className="text-[9px] text-muted-foreground truncate mt-0.5">
                                    {ev.address}
                                  </div>
                                </div>
                                <StatusChip
                                  tone={
                                    ev.status === "resolved"
                                      ? "good"
                                      : ev.status === "in-progress"
                                        ? "info"
                                        : ev.severity === "critical" || ev.severity === "high"
                                          ? "critical"
                                          : "warning"
                                  }
                                  size="xs"
                                >
                                  {ev.status}
                                </StatusChip>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ══ TAB: STATS ══════════════════════════════════════════════════ */}
                {drawerTab === "stats" && (
                  <div className="p-3 space-y-4">
                    {/* ── Environmental Summary ──────────────────────────────── */}
                    <div>
                      <SectionHeader icon={Activity} label="Environmental Summary" />
                      <div
                        className="rounded-xl p-3 mb-2"
                        style={{
                          background: `color-mix(in oklab, ${band.color} 10%, transparent)`,
                          border: `1px solid color-mix(in oklab, ${band.color} 25%, transparent)`,
                        }}
                      >
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                            Air Quality Index
                          </span>
                          <span className="text-[10px] font-medium" style={{ color: band.color }}>
                            {band.label}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                          <span
                            className="text-3xl font-bold tabular-nums"
                            style={{ color: band.color }}
                          >
                            {city.aqi}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(city.aqi / 3, 100)}%`,
                              background: band.color,
                            }}
                          />
                        </div>
                      </div>

                      {/* Historical AQI trend if available */}
                      {historyAqi.length > 1 && (
                        <div className="glass-card rounded-xl p-3 mb-2">
                          <div className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground mb-2 flex items-center gap-1.5">
                            <Activity className="size-3" /> Historical AQI —{" "}
                            {timeRange !== "live" ? timeRange : "7d"}
                          </div>
                          <MiniSpark data={historyAqi} color={band.color} height={32} />
                          <div className="flex justify-between text-[8px] text-muted-foreground mt-1">
                            <span>Min {Math.min(...historyAqi).toFixed(0)}</span>
                            <span>
                              Avg{" "}
                              {(historyAqi.reduce((a, b) => a + b, 0) / historyAqi.length).toFixed(
                                0,
                              )}
                            </span>
                            <span>Max {Math.max(...historyAqi).toFixed(0)}</span>
                          </div>
                        </div>
                      )}

                      {/* Pollutant grid */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <MetricTile
                          label="PM2.5"
                          unit="µg/m³"
                          value={city.pm25}
                          accent="var(--color-warning)"
                        />
                        <MetricTile
                          label="PM10"
                          unit="µg/m³"
                          value={city.pm10}
                          accent="var(--color-warning)"
                        />
                        <MetricTile
                          label="NO₂"
                          unit="ppb"
                          value={city.no2}
                          accent="oklch(0.72 0.18 50)"
                        />
                        <MetricTile
                          label="O₃"
                          unit="ppb"
                          value={city.o3}
                          accent="var(--color-info)"
                        />
                        <MetricTile label="CO₂" unit="ppm" value={city.co2} />
                        <MetricTile label="Carbon" unit="t/cap" value={city.carbon} />
                      </div>
                    </div>

                    {/* ── Health Overview ────────────────────────────────────── */}
                    <div>
                      <SectionHeader icon={Droplets} label="Health Overview" />
                      <div className="glass-card rounded-xl p-3 space-y-2">
                        {[
                          {
                            label: "Temperature",
                            value: `${city.temp}°C`,
                            icon: Thermometer,
                            accent: "oklch(0.72 0.18 50)",
                          },
                          {
                            label: "Humidity",
                            value: `${city.humidity}%`,
                            icon: Droplets,
                            accent: "var(--color-info)",
                          },
                          {
                            label: "Water QI",
                            value: `${city.water}/100`,
                            icon: Droplets,
                            accent: "var(--color-info)",
                          },
                          {
                            label: "Eco Score",
                            value: `${city.eco}/100`,
                            icon: Activity,
                            accent: "oklch(0.72 0.19 145)",
                          },
                          {
                            label: "Risk Index",
                            value: `${city.risk}/100`,
                            icon: AlertTriangle,
                            accent:
                              city.risk > 60 ? "var(--color-destructive)" : "var(--color-warning)",
                          },
                        ].map((row) => (
                          <div key={row.label} className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <row.icon className="size-3 shrink-0" />
                              {row.label}
                            </span>
                            <span
                              className="text-[10px] font-semibold tabular-nums"
                              style={{ color: row.accent }}
                            >
                              {row.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ── Sensor Status ───────────────────────────────────────── */}
                    <div>
                      <SectionHeader icon={Radio} label="Sensor Status" />
                      <div className="grid grid-cols-3 gap-1.5">
                        <MetricTile
                          label="Online"
                          value={sensorsOnline}
                          unit={`/ ${hotspots.length}`}
                          accent="var(--color-success)"
                        />
                        <MetricTile
                          label="Critical"
                          value={highRisk}
                          accent={
                            highRisk > 0 ? "var(--color-destructive)" : "var(--color-success)"
                          }
                        />
                        <MetricTile label="Updated" value={mapLoaded ? lastUpdated : "offline"} />
                      </div>
                    </div>

                    {/* ── Critical Alerts ─────────────────────────────────────── */}
                    <div>
                      <SectionHeader icon={AlertTriangle} label="Critical Alerts" />
                      <div className="space-y-1.5">
                        {[...Array(Math.min(city.alerts, 3))].map((_, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px]"
                            style={{
                              background:
                                i === 0
                                  ? "color-mix(in oklab, var(--color-destructive) 10%, transparent)"
                                  : "color-mix(in oklab, var(--color-warning) 8%, transparent)",
                              border: `1px solid color-mix(in oklab, ${i === 0 ? "var(--color-destructive)" : "var(--color-warning)"} 20%, transparent)`,
                            }}
                          >
                            <AlertTriangle
                              className="size-3 shrink-0"
                              style={{
                                color:
                                  i === 0 ? "var(--color-destructive)" : "var(--color-warning)",
                              }}
                            />
                            <span className="text-muted-foreground">
                              {i === 0
                                ? "Critical PM2.5 spike detected"
                                : i === 1
                                  ? "Water turbidity rising"
                                  : "Traffic NO₂ elevated"}
                            </span>
                          </div>
                        ))}
                        {city.alerts === 0 && (
                          <EmptyState
                            icon={Shield}
                            message="No active alerts"
                            hint="You'll see critical conditions here as they're detected"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {/* ── Weather Intelligence Tab (Phase 5) ─────────────────── */}
                {drawerTab === "weather" && <WeatherIntelligencePanel city={city} />}

                {/* ── Air Quality Intelligence Tab (Phase 6) ─────────────── */}
                {drawerTab === "air" && <AirQualityPanel city={city} />}

                {/* ── Hazard Intelligence Tab (Phase 7) ──────────────────── */}
                {drawerTab === "hazard" && <HazardIntelligencePanel city={city} />}

                {/* ── AI Command Center Tab (Phase 8) ────────────────────── */}
                {drawerTab === "ai" && <AiCommandPanel city={city} />}

                {/* ── Digital Twin Tab (Phase 9) ──────────────────────────── */}
                {drawerTab === "twin" && (
                  <DigitalTwinPanel
                    city={city}
                    hotspots={filteredHotspots}
                    zones={zones}
                    complaints={allComplaints}
                    selectedId={selected}
                    onSelectLocation={handleSelectLocation}
                  />
                )}
              </div>

              {/* Drawer footer */}
              <div className="shrink-0 border-t border-border/30 px-3 py-2 flex items-center justify-between">
                <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                  <RefreshCw className="size-2.5" />
                  {mapLoaded ? `Live · ${lastUpdated}` : "Offline mode"}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  {drawerHotspots.length} / {hotspots.length} zones
                </span>
              </div>
            </>
          )}

          {/* Collapsed vertical label — desktop only */}
          {!drawerOpen && (
            <div className="hidden lg:flex flex-1 items-center justify-center">
              <span
                className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground whitespace-nowrap"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              >
                Intelligence
              </span>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
