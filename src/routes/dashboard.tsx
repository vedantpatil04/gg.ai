import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { Panel, SectionTitle, StatCard } from "@/components/ui-bits";
import { useCity } from "@/lib/city-context";
import { useAuth } from "@/lib/auth-context";
import { AUTHORITY_ROLES } from "@/lib/role-routing";
import { aqiBand, ALERTS, INSIGHTS, trendSeries } from "@/lib/mock-data";
import { computeEnvHealthScore, getMainPollutant } from "@/lib/environmental-health";
import { formatRelativeTime, getGreetingText } from "@/lib/format-time";
import { EnvironmentalTimeline } from "@/components/dashboard/environmental-timeline";
import {
  getOutdoorGuidance,
  getPollutionTrend,
  getWeatherImpact,
  getHealthRiskLabel,
  getActivityGuidance,
  computeAIConfidence,
  findInsightByTag,
  deriveThingsToWatch,
} from "@/lib/ai-brief";
import { useQuery } from "@tanstack/react-query";
import { alertApi, copilotApi, adminApi } from "@/lib/api/services.api";
import { environmentalApi } from "@/lib/api/environmental.api";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SceneBackground } from "@/components/dashboard/motion-primitives";
import { STAGGER, FADE_UP } from "@/lib/motion";

const PAGE_STAGGER = STAGGER(0.07, 0);
const PAGE_SECTION = FADE_UP;
import {
  Droplets,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { WelcomeHero } from "@/components/dashboard/welcome-hero";
import { EnvironmentalHealthHero } from "@/components/dashboard/environmental-health-hero";
import { AIDailyBriefCard } from "@/components/dashboard/ai-daily-brief";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { HighlightsGrid } from "@/components/dashboard/highlights-grid";
import { AlertsCard } from "@/components/dashboard/alerts-card";
import { MiniTrendCard } from "@/components/dashboard/mini-trend-card";
import { MapPreviewCard } from "@/components/dashboard/map-preview-card";
import { CommunityActivityCard } from "@/components/dashboard/community-activity-card";
import { EcoTipCard } from "@/components/dashboard/eco-tip-card";
import { PollutantBreakdownCard } from "@/components/dashboard/pollutant-breakdown-card";
import { WeatherInsightsCard } from "@/components/dashboard/weather-insights-card";
import { NearbyCitiesCard } from "@/components/dashboard/nearby-cities-card";
import { LiveActivityFeed } from "@/components/dashboard/live-activity-feed";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Citizen Dashboard — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    </AppLayout>
  ),
});

function Dashboard() {
  const [currentTime, setCurrentTime] = useState("");
  const { city, isApiConnected, refreshCity } = useCity();
  const { user } = useAuth();
  const band = aqiBand(city.aqi);
  const series = trendSeries(city.aqi, city.aqi, 24, 24);
  const showReports = !!user && AUTHORITY_ROLES.includes(user.role);

  // Phase 4: real 7-day history for chart — falls back to mock series above
  const {
    data: historyData,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["city-history", city.id, 7],
    queryFn: () => environmentalApi.getHistory(city.id, 7),
    staleTime: 15 * 60 * 1000,
    enabled: !!city.id,
  });

  const chartSeries: Array<{ label: string; aqi: number; pm25: number; no2: number }> = historyData
    ?.data?.history?.length
    ? historyData.data.history.map(
        (d: { date: string; aqi: { avg: number }; pm25: number; no2: number }) => ({
          label: d.date.slice(5), // "MM-DD"
          aqi: d.aqi?.avg ?? 0,
          pm25: d.pm25 ?? 0,
          no2: d.no2 ?? 0,
        }),
      )
    : series;
  const isAdmin = user?.role === "administrator";

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString());
    };

    updateTime();

    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const {
    data: alertData,
    isLoading: alertsLoading,
    refetch: refetchAlerts,
  } = useQuery({
    queryKey: ["alerts-active", city.id],
    queryFn: () => alertApi.getActive(city.id).then((r) => r.data.alerts),
    staleTime: 30_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const {
    data: insightData,
    isLoading: insightsLoading,
    refetch: refetchInsights,
    dataUpdatedAt: insightsUpdatedAt,
    isError: insightsError,
    isFetching: insightsFetching,
  } = useQuery({
    queryKey: ["insights", city.id],
    queryFn: () => copilotApi.getInsights(city.id).then((r) => r.data.insights),
    staleTime: 5 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  // Admin AI summary (Feature 7)
  const {
    data: adminSummaryData,
    isFetching: summaryLoading,
    refetch: fetchSummary,
  } = useQuery({
    queryKey: ["admin-ai-summary"],
    queryFn: () => adminApi.getAISummary().then((r) => r.data),
    staleTime: 2 * 60 * 60_000,
    enabled: isAdmin && isApiConnected,
    throwOnError: false,
  });

  const alerts = alertData ?? ALERTS;
  const insights = insightData ?? INSIGHTS;
  const adminSummary = adminSummaryData?.summary;

  // Phase 2: real composite Environmental Health Score — see
  // src/lib/environmental-health.ts for the documented AQI/risk/water
  // weighting. Replaces the Phase 1 placeholder that just echoed city.eco.
  const envHealth = computeEnvHealthScore({ aqi: city.aqi, risk: city.risk, water: city.water });
  const mainPollutant = getMainPollutant({
    pm25: city.pm25,
    pm10: city.pm10,
    no2: city.no2,
    o3: city.o3,
  });
  const heroLastUpdated = formatRelativeTime(city.updatedAt);

  // Phase 3: AI Daily Brief. The lead/supporting paragraphs are genuine
  // Gemini-authored text pulled straight from the existing insights
  // response (see src/lib/ai-brief.ts for why chips/activity/confidence are
  // deterministic derivations rather than a second AI call).
  const safeInsights = Array.isArray(insights) ? insights : INSIGHTS;
  const briefLead = findInsightByTag(safeInsights, ["Air Quality"]);
  const briefSupporting = [
    findInsightByTag(safeInsights, ["Water"]),
    findInsightByTag(safeInsights, ["Risk", "Forecast"]),
    findInsightByTag(safeInsights, ["Sustainability"]),
  ].filter((i): i is NonNullable<typeof i> => !!i);
  const briefGreeting = getGreetingText();
  const outdoorGuidance = getOutdoorGuidance(city.aqi);
  const pollutionTrend = getPollutionTrend(chartSeries);
  const weatherImpact = getWeatherImpact(city.windSpeed);
  const healthRisk = getHealthRiskLabel(city.risk);
  const activityGuidance = getActivityGuidance(city.aqi);
  const aiConfidence = computeAIConfidence({
    isApiConnected,
    temp: city.temp,
    humidity: city.humidity,
    windSpeed: city.windSpeed,
    water: city.water,
    historyPoints: chartSeries.length,
  });
  const briefGeneratedAgo = formatRelativeTime(
    insightsUpdatedAt ? new Date(insightsUpdatedAt).toISOString() : undefined,
  );
  const briefIsError = isApiConnected && insightsError;
  const briefIsEmpty = !insightsLoading && !briefIsError && safeInsights.length === 0;
  const thingsToWatch = deriveThingsToWatch({
    pollutionTrend,
    humidity: city.humidity,
    windSpeed: city.windSpeed,
    risk: city.risk,
    water: city.water,
    aqi: city.aqi,
  });

  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const handleRefreshInsights = async () => {
    // Phase 3: AI-only refresh -- regenerates just the Daily Brief, not the
    // whole dashboard, with its own duplicate-request guard.
    if (isRefreshingInsights) return;
    setIsRefreshingInsights(true);
    try {
      await refetchInsights();
    } finally {
      setIsRefreshingInsights(false);
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    // Phase 2: guard against duplicate/overlapping refresh requests if the
    // button is clicked again (or re-triggered) while one is already in flight.
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([refreshCity(), refetchAlerts(), refetchInsights(), refetchHistory()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // ============================================================
  // 1) ENVIRONMENTAL ASSESSMENT REPORT  (multi-page, enterprise)
  // ============================================================
  const handleExport = () => {
    const doc = new jsPDF("p", "mm", "a4");
    const PW = 210;
    const PH = 297;

    // Brand palette
    const BRAND: [number, number, number] = [13, 94, 76]; // deep teal-green
    const BRAND_DARK: [number, number, number] = [8, 58, 47];
    const ACCENT: [number, number, number] = [34, 197, 144]; // green
    const INK: [number, number, number] = [22, 31, 38];
    const MUTED: [number, number, number] = [110, 122, 130];
    const LINE: [number, number, number] = [220, 226, 230];
    const BG_SOFT: [number, number, number] = [240, 247, 244];

    const reportId =
      "GG-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000);
    const generatedOn = new Date().toLocaleString();

    // AQI classification
    const classify = (aqi: number) => {
      if (aqi <= 50) return { label: "GOOD", color: [34, 160, 90] as [number, number, number] };
      if (aqi <= 100)
        return { label: "MODERATE", color: [212, 170, 0] as [number, number, number] };
      if (aqi <= 150)
        return {
          label: "UNHEALTHY (SENSITIVE)",
          color: [222, 120, 30] as [number, number, number],
        };
      if (aqi <= 200)
        return { label: "UNHEALTHY", color: [210, 70, 60] as [number, number, number] };
      if (aqi <= 300)
        return { label: "VERY UNHEALTHY", color: [140, 50, 130] as [number, number, number] };
      return { label: "HAZARDOUS", color: [110, 30, 30] as [number, number, number] };
    };
    const aqiClass = classify(city.aqi);

    const scoreColor = (v: number, inverse = false): [number, number, number] => {
      const good = inverse ? v < 40 : v > 70;
      const mid = inverse ? v < 70 : v > 40;
      if (good) return [34, 160, 90];
      if (mid) return [212, 170, 0];
      return [210, 70, 60];
    };

    // ---- Page chrome (header + footer on every page) -------------
    const drawHeader = (subtitle: string) => {
      doc.setFillColor(...BRAND);
      doc.rect(0, 0, PW, 18, "F");
      doc.setFillColor(...ACCENT);
      doc.rect(0, 18, PW, 1.2, "F");

      // Logo mark
      doc.setFillColor(255, 255, 255);
      doc.circle(14, 9, 4.2, "F");
      doc.setTextColor(...BRAND);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("GG", 14, 10.6, { align: "center" });

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("GREENGUARD AI", 22, 8.5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(subtitle, 22, 13.5);

      doc.setFontSize(8);
      doc.text(`Report ID: ${reportId}`, PW - 14, 8.5, { align: "right" });
      doc.text(generatedOn, PW - 14, 13.5, { align: "right" });
    };

    const drawFooter = (page: number, total: number) => {
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.2);
      doc.line(14, PH - 14, PW - 14, PH - 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text("GreenGuard AI · Intelligent Environmental Monitoring & Alert System", 14, PH - 9);
      doc.text(`Page ${page} of ${total}   ·   ${reportId}`, PW - 14, PH - 9, {
        align: "right",
      });
      doc.setTextColor(...INK);
    };

    // ---- PAGE 1: COVER -------------------------------------------
    doc.setFillColor(...BRAND_DARK);
    doc.rect(0, 0, PW, PH, "F");

    // Decorative bands
    doc.setFillColor(...BRAND);
    doc.rect(0, 90, PW, 80, "F");
    doc.setFillColor(...ACCENT);
    doc.rect(0, 168, PW, 2, "F");

    // Logo block
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(20, 22, 22, 22, 4, 4, "F");
    doc.setTextColor(...BRAND);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("GG", 31, 37, { align: "center" });

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("GREENGUARD AI", 46, 32);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Intelligent Environmental Monitoring & Alert System", 46, 38);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(220, 240, 232);
    doc.text("ENVIRONMENTAL ASSESSMENT REPORT", 20, 110);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(34);
    doc.setTextColor(255, 255, 255);
    doc.text(city.name.toUpperCase(), 20, 130);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.text(city.country, 20, 140);

    // Status badge
    doc.setFillColor(...aqiClass.color);
    doc.roundedRect(20, 150, 95, 12, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`AQI ${city.aqi} · ${aqiClass.label}`, 22.5, 158);

    // Cover metadata block
    const metaY = 200;
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);
    doc.line(20, metaY - 6, PW - 20, metaY - 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(180, 200, 192);

    const metaRows = [
      ["REPORT ID", reportId],
      ["LOCATION", `${city.name}, ${city.country}`],
      ["GENERATED", generatedOn],
      ["CLASSIFICATION", aqiClass.label],
      ["PREPARED BY", "GreenGuard AI Analytics Engine"],
      ["CONFIDENTIALITY", "Official Use · Environmental Authority"],
    ];
    metaRows.forEach((r, i) => {
      const yy = metaY + i * 9;
      doc.setTextColor(160, 190, 180);
      doc.text(r[0], 20, yy);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text(r[1], 75, yy);
      doc.setFont("helvetica", "normal");
    });

    doc.setFontSize(8);
    doc.setTextColor(180, 200, 192);
    doc.text(
      "This document contains environmental telemetry, AI-derived insights and policy recommendations.",
      20,
      PH - 18,
    );

    // ---- PAGE 2: EXECUTIVE SUMMARY -------------------------------
    doc.addPage();
    drawHeader("Environmental Assessment Report");

    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Executive Summary", 14, 32);
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.8);
    doc.line(14, 35, 50, 35);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text(
      `Snapshot of key environmental indicators for ${city.name}, ${city.country} based on the latest`,
      14,
      44,
    );
    doc.text(
      "sensor telemetry and AI analytical models. All values are rounded to operational precision.",
      14,
      49,
    );

    // KPI cards
    const kpis = [
      {
        label: "AIR QUALITY INDEX",
        value: String(city.aqi),
        unit: "AQI",
        tone: aqiClass.color,
        hint: aqiClass.label,
      },
      {
        label: "WATER QUALITY",
        value: String(city.water),
        unit: "WQI",
        tone: scoreColor(city.water),
        hint: city.water > 75 ? "EXCELLENT" : city.water > 50 ? "ACCEPTABLE" : "POOR",
      },
      {
        label: "RISK SCORE",
        value: String(city.risk),
        unit: "/100",
        tone: scoreColor(city.risk, true),
        hint: city.risk > 70 ? "ELEVATED" : city.risk > 40 ? "MODERATE" : "LOW",
      },
      {
        label: "ECO SCORE",
        value: String(city.eco),
        unit: "/100",
        tone: scoreColor(city.eco),
        hint: city.eco > 70 ? "SUSTAINABLE" : city.eco > 40 ? "DEVELOPING" : "AT RISK",
      },
    ];

    const cardW = 88,
      cardH = 38,
      gap = 6;
    kpis.forEach((k, i) => {
      const col = i % 2,
        row = Math.floor(i / 2);
      const x = 14 + col * (cardW + gap);
      const y = 58 + row * (cardH + gap);

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");
      doc.setFillColor(...k.tone);
      doc.rect(x, y, 2, cardH, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text(k.label, x + 6, y + 8);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(26);
      doc.setTextColor(...INK);
      doc.text(k.value, x + 6, y + 24);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text(k.unit, x + 6 + doc.getTextWidth(k.value) + 2, y + 24);

      doc.setFillColor(...k.tone);
      doc.roundedRect(x + 6, y + 28, doc.getTextWidth(k.hint) + 6, 5, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(k.hint, x + 9, y + 31.6);
    });

    // Environmental Health Assessment
    const assessY = 58 + 2 * (cardH + gap) + 6;
    doc.setFillColor(...BG_SOFT);
    doc.roundedRect(14, assessY, PW - 28, 56, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...BRAND_DARK);
    doc.text("Environmental Health Assessment", 20, assessY + 10);

    const overall =
      city.aqi > 150 || city.risk > 70
        ? "critical and requires immediate intervention"
        : city.aqi > 100 || city.risk > 50
          ? "elevated and warrants close monitoring"
          : "within acceptable operational limits";

    const summary =
      `Environmental telemetry for ${city.name} indicates that current conditions are ${overall}. ` +
      `The recorded Air Quality Index of ${city.aqi} corresponds to a ${aqiClass.label.toLowerCase()} classification, ` +
      `while the Water Quality Index of ${city.water} and composite Risk Score of ${city.risk}/100 ` +
      `suggest a sustainability posture rated at ${city.eco}/100. GreenGuard AI recommends the mitigation ` +
      `actions outlined in Section 5 to maintain or improve the environmental baseline of the region.`;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(doc.splitTextToSize(summary, PW - 40), 20, assessY + 18);

    // ---- PAGE 3: ENVIRONMENTAL ANALYSIS --------------------------
    doc.addPage();
    drawHeader("Environmental Assessment Report");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...INK);
    doc.text("Environmental Analysis", 14, 32);
    doc.setDrawColor(...ACCENT);
    doc.line(14, 35, 50, 35);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text("Pollutant concentrations benchmarked against WHO and CPCB guideline values.", 14, 43);

    const pollutantRow = (label: string, val: number, limit: number, unit: string) => {
      const ratio = val / limit;
      const status = ratio <= 1 ? "WITHIN LIMIT" : ratio <= 2 ? "ELEVATED" : "EXCEEDED";
      return [label, `${val} ${unit}`, `${limit} ${unit}`, `${ratio.toFixed(2)}×`, status];
    };

    autoTable(doc, {
      startY: 50,
      head: [["Pollutant", "Measured", "Guideline", "Ratio", "Status"]],
      body: [
        pollutantRow("PM2.5", city.pm25 ?? Math.round(city.aqi * 0.55), 25, "µg/m³"),
        pollutantRow("PM10", city.pm10 ?? Math.round(city.aqi * 0.9), 50, "µg/m³"),
        pollutantRow("NO₂", city.no2 ?? Math.round(city.aqi * 0.35), 40, "ppb"),
        pollutantRow("O₃", city.o3 ?? Math.round(city.aqi * 0.45), 60, "ppb"),
        pollutantRow("CO₂", city.co2 ?? 420, 450, "ppm"),
      ],
      theme: "grid",
      styles: { font: "helvetica", fontSize: 9, cellPadding: 3, textColor: INK, lineColor: LINE },
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold", fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 251, 250] },
      columnStyles: { 4: { fontStyle: "bold" } },
    });

    const afterPollutants = (doc as any).lastAutoTable.finalY + 10;

    autoTable(doc, {
      startY: afterPollutants,
      head: [["Indicator", "Value", "Classification", "Interpretation"]],
      body: [
        ["AQI", String(city.aqi), aqiClass.label, "Composite air quality status"],
        [
          "Water Quality",
          String(city.water),
          city.water > 75 ? "EXCELLENT" : city.water > 50 ? "ACCEPTABLE" : "POOR",
          "Surface & potable water index",
        ],
        [
          "Risk Score",
          `${city.risk}/100`,
          city.risk > 70 ? "HIGH" : city.risk > 40 ? "MODERATE" : "LOW",
          "Composite exposure & vulnerability",
        ],
        [
          "Sustainability",
          `${city.eco}/100`,
          city.eco > 70 ? "STRONG" : city.eco > 40 ? "DEVELOPING" : "WEAK",
          "Long-term ecological posture",
        ],
      ],
      theme: "grid",
      styles: { font: "helvetica", fontSize: 9, cellPadding: 3, textColor: INK, lineColor: LINE },
      headStyles: { fillColor: BRAND_DARK, textColor: 255, fontStyle: "bold", fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 251, 250] },
    });

    // ---- PAGE 4: ACTIVE ALERTS -----------------------------------
    doc.addPage();
    drawHeader("Environmental Assessment Report");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...INK);
    doc.text("Active Alerts & Monitoring", 14, 32);
    doc.setDrawColor(...ACCENT);
    doc.line(14, 35, 70, 35);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text(
      `Currently tracking ${alerts.length} active environmental incident(s) across the monitored region.`,
      14,
      43,
    );

    const alertRows = alerts
      .slice(0, 10)
      .map((a: any, i: number) => [
        String(i + 1).padStart(2, "0"),
        (a.severity || "info").toUpperCase(),
        a.title || "—",
        a.area || a.location || "City-wide",
        a.time || "Recent",
        "ACTIVE",
      ]);

    autoTable(doc, {
      startY: 50,
      head: [["#", "Severity", "Alert", "Area", "Detected", "Status"]],
      body: alertRows.length
        ? alertRows
        : [["—", "—", "No active alerts at this time.", "—", "—", "—"]],
      theme: "grid",
      styles: { font: "helvetica", fontSize: 9, cellPadding: 3, textColor: INK, lineColor: LINE },
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 251, 250] },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 24, fontStyle: "bold" },
        5: { cellWidth: 20, halign: "center", fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          const v = String(data.cell.raw).toUpperCase();
          if (v === "CRITICAL") data.cell.styles.textColor = [210, 70, 60];
          else if (v === "WARNING" || v === "HIGH") data.cell.styles.textColor = [212, 130, 0];
          else if (v === "INFO") data.cell.styles.textColor = [40, 110, 180];
        }
      },
    });

    const afterAlerts = (doc as any).lastAutoTable.finalY + 12;
    doc.setFillColor(...BG_SOFT);
    doc.roundedRect(14, afterAlerts, PW - 28, 34, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND_DARK);
    doc.text("Monitoring Summary", 20, afterAlerts + 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    const monSum =
      `Real-time sensor mesh across ${city.name} is operational. Anomaly detection models flagged ` +
      `${alerts.length} event(s) in the latest cycle. Response coordination is recommended for all ` +
      `incidents classified Warning or above. Escalation channels and field-team dispatch remain on standby.`;
    doc.text(doc.splitTextToSize(monSum, PW - 40), 20, afterAlerts + 16);

    // ---- PAGE 5: AI INSIGHTS & RECOMMENDATIONS -------------------
    doc.addPage();
    drawHeader("Environmental Assessment Report");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...INK);
    doc.text("AI Insights & Recommendations", 14, 32);
    doc.setDrawColor(...ACCENT);
    doc.line(14, 35, 80, 35);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND_DARK);
    doc.text("Key AI-Derived Insights", 14, 46);

    let cursor = 52;
    (insights.slice(0, 4) as any[]).forEach((ins, i) => {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...LINE);
      doc.roundedRect(14, cursor, PW - 28, 18, 2, 2, "FD");
      doc.setFillColor(...ACCENT);
      doc.rect(14, cursor, 2, 18, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...INK);
      doc.text(`${String(i + 1).padStart(2, "0")}.  ${ins.title || "Insight"}`, 20, cursor + 7);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.8);
      doc.setTextColor(...MUTED);
      const body = ins.body || ins.description || "AI-derived environmental insight.";
      doc.text(doc.splitTextToSize(body, PW - 40), 20, cursor + 13);
      cursor += 22;
    });

    cursor += 4;
    const recs =
      city.aqi > 150
        ? [
            [
              "Restrict heavy-vehicle entry during 06:00–10:00",
              "Expected AQI reduction: 15–20 pts",
              "HIGH",
            ],
            [
              "Activate misting / dust-suppression in high-PM zones",
              "Targets PM10 reduction up to 12%",
              "HIGH",
            ],
            [
              "Issue public advisory for sensitive groups",
              "Health-risk exposure mitigation",
              "HIGH",
            ],
            [
              "Audit industrial cluster emissions on priority",
              "Long-term PM2.5 reduction",
              "MEDIUM",
            ],
          ]
        : city.aqi > 100
          ? [
              [
                "Increase frequency of street sweeping in core wards",
                "PM10 reduction 5–8%",
                "MEDIUM",
              ],
              ["Promote public transit during peak commute hours", "NO₂ reduction 6–10%", "MEDIUM"],
              [
                "Expand green-cover plantation in Ward clusters",
                "Long-term carbon offset",
                "MEDIUM",
              ],
            ]
          : [
              ["Maintain ongoing monitoring cadence", "Sustains current baseline", "LOW"],
              ["Continue community sustainability programs", "Builds ecological resilience", "LOW"],
              ["Quarterly review of sensor calibration", "Ensures data fidelity", "LOW"],
            ];

    autoTable(doc, {
      startY: cursor,
      head: [["Recommended Action", "Projected Impact", "Priority"]],
      body: recs,
      theme: "grid",
      styles: { font: "helvetica", fontSize: 9, cellPadding: 3, textColor: INK, lineColor: LINE },
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 251, 250] },
      columnStyles: { 2: { halign: "center", fontStyle: "bold", cellWidth: 24 } },
    });

    const afterRecs = (doc as any).lastAutoTable.finalY + 10;
    doc.setFillColor(...BRAND_DARK);
    doc.roundedRect(14, afterRecs, PW - 28, 32, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("Future Outlook", 20, afterRecs + 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(220, 240, 232);
    const outlook =
      `Predictive models forecast ${
        city.aqi > 120
          ? "a continued elevated pollutant load"
          : "a stabilising environmental trajectory"
      } over the next 72 hours. ` +
      `Sustained execution of the recommendations above is projected to improve the composite Eco Score from ` +
      `${city.eco} toward ${Math.min(100, city.eco + 6)} within one operational quarter.`;
    doc.text(doc.splitTextToSize(outlook, PW - 40), 20, afterRecs + 16);

    // ---- Apply footers to every page -----------------------------
    const total = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      if (p > 1) drawFooter(p, total);
    }

    doc.save(`${city.name}_Environmental_Report_${reportId}.pdf`);
  };

  // ============================================================
  // 2) OFFICIAL ENVIRONMENTAL ADVISORY  (single-page, official)
  // ============================================================
  const handleAdvisory = () => {
    const doc = new jsPDF("p", "mm", "a4");
    const PW = 210;
    const PH = 297;

    const BRAND: [number, number, number] = [13, 94, 76];
    const BRAND_DARK: [number, number, number] = [8, 58, 47];
    const INK: [number, number, number] = [22, 31, 38];
    const MUTED: [number, number, number] = [110, 122, 130];
    const LINE: [number, number, number] = [220, 226, 230];
    const BG_SOFT: [number, number, number] = [240, 247, 244];

    // Severity profile
    let severity = "NORMAL";
    let sevColor: [number, number, number] = [34, 160, 90];
    let recommendation =
      "Environmental conditions are currently within acceptable limits. Routine monitoring continues.";
    let healthActions: string[] = [];
    let citizenActions: string[] = [];
    let emergencyGuidance =
      "No emergency response required at this time. Authorities remain on routine surveillance.";

    if (city.aqi > 200) {
      severity = "CRITICAL";
      sevColor = [180, 35, 35];
      recommendation =
        "Hazardous air quality detected. Outdoor activity must be suspended for all population groups. Schools, construction sites and outdoor industrial work should remain closed until conditions improve.";
      healthActions = [
        "Remain indoors with windows and ventilation sealed.",
        "Use N95 / FFP2 grade respirators for any unavoidable outdoor travel.",
        "Seek immediate medical attention for respiratory or cardiac distress.",
        "Vulnerable groups (children, elderly, pregnant, asthmatic) must avoid all exposure.",
      ];
      citizenActions = [
        "Suspend outdoor exercise, sports and recreational activity.",
        "Avoid private vehicle use; prefer public transport or remote work.",
        "Refrain from open burning of waste, leaves or biomass.",
        "Report visible polluters via the GreenGuard citizen channel.",
      ];
      emergencyGuidance =
        "Emergency response protocol Tier-1 activated. Mobile health units, traffic restrictions and industrial throttling may be enforced by local authorities.";
    } else if (city.aqi > 150) {
      severity = "HIGH";
      sevColor = [210, 90, 40];
      recommendation =
        "Air quality is unhealthy. Sensitive groups should avoid outdoor activity and the general population should significantly reduce prolonged outdoor exertion.";
      healthActions = [
        "Wear quality masks (N95 / FFP2) in outdoor environments.",
        "Limit time spent in heavily trafficked corridors.",
        "Use air purifiers in indoor spaces where available.",
        "Monitor sensitive family members for early symptoms.",
      ];
      citizenActions = [
        "Reduce private vehicle use during peak hours.",
        "Postpone non-essential outdoor events.",
        "Support local dust-suppression and greening initiatives.",
      ];
      emergencyGuidance =
        "Tier-2 advisory in effect. Health centres are placed on heightened readiness; mobile clinics may be deployed in high-exposure zones.";
    } else if (city.aqi > 100) {
      severity = "MODERATE";
      sevColor = [212, 170, 0];
      recommendation =
        "Air quality is acceptable for the general public, however sensitive individuals should consider reducing prolonged outdoor exertion.";
      healthActions = [
        "Sensitive groups should monitor symptoms during outdoor activity.",
        "Maintain hydration and avoid strenuous exercise outdoors.",
        "Keep prescribed medication accessible for respiratory conditions.",
      ];
      citizenActions = [
        "Prefer public or shared transport where possible.",
        "Avoid burning of waste and dry vegetation.",
        "Report unusual pollution sources via the citizen channel.",
      ];
      emergencyGuidance =
        "Standard advisory in effect. No emergency mobilisation required; monitoring frequency increased.";
    } else {
      healthActions = [
        "No specific health precautions required for the general public.",
        "Routine activity may continue as normal.",
      ];
      citizenActions = [
        "Continue supporting sustainability and green-cover programs.",
        "Maintain responsible waste-disposal practices.",
      ];
    }

    const ref =
      "ADV-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000);
    const issued = new Date().toLocaleString();

    // Watermark
    doc.setTextColor(245, 248, 246);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(80);
    doc.text("OFFICIAL ADVISORY", PW / 2, PH / 2, {
      align: "center",
      angle: 30,
    });

    // ---- Top brand band ------------------------------------------
    doc.setFillColor(...BRAND_DARK);
    doc.rect(0, 0, PW, 26, "F");
    doc.setFillColor(...sevColor);
    doc.rect(0, 26, PW, 2.5, "F");

    doc.setFillColor(255, 255, 255);
    doc.circle(16, 13, 5.5, "F");
    doc.setTextColor(...BRAND);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("GG", 16, 15, { align: "center" });

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("GREENGUARD AI", 25, 11.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Environmental Monitoring & Alert Authority", 25, 16.5);
    doc.setFontSize(8);
    doc.text("OFFICIAL ENVIRONMENTAL ADVISORY", 25, 21);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Ref: ${ref}`, PW - 14, 11.5, { align: "right" });
    doc.text(`Issued: ${issued}`, PW - 14, 16.5, { align: "right" });
    doc.text("Classification: Public", PW - 14, 21, { align: "right" });

    // ---- Severity band -------------------------------------------
    doc.setFillColor(...sevColor);
    doc.rect(0, 34, PW, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(`SEVERITY: ${severity}`, 14, 48);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`AQI ${city.aqi}  ·  WQI ${city.water}  ·  Risk ${city.risk}/100`, PW - 14, 48, {
      align: "right",
    });

    // ---- Region block --------------------------------------------
    doc.setTextColor(...INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("REGION UNDER ADVISORY", 14, 68);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(`${city.name}, ${city.country}`, 14, 78);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(14, 82, PW - 14, 82);

    // ---- Risk assessment grid -----------------------------------
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND_DARK);
    doc.text("Environmental Risk Assessment", 14, 92);

    const grid = [
      {
        l: "Air Quality",
        v: String(city.aqi),
        s: city.aqi > 150 ? "CRITICAL" : city.aqi > 100 ? "ELEVATED" : "NORMAL",
      },
      {
        l: "Water Quality",
        v: String(city.water),
        s: city.water < 50 ? "POOR" : city.water < 75 ? "FAIR" : "GOOD",
      },
      {
        l: "Composite Risk",
        v: `${city.risk}/100`,
        s: city.risk > 70 ? "HIGH" : city.risk > 40 ? "MODERATE" : "LOW",
      },
      {
        l: "Eco Score",
        v: `${city.eco}/100`,
        s: city.eco > 70 ? "STRONG" : city.eco > 40 ? "MODERATE" : "WEAK",
      },
    ];
    const gw = (PW - 28) / 4;
    grid.forEach((g, i) => {
      const x = 14 + i * gw;
      doc.setFillColor(...BG_SOFT);
      doc.roundedRect(x + 1, 96, gw - 2, 24, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(g.l.toUpperCase(), x + 4, 102);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...INK);
      doc.text(g.v, x + 4, 112);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...sevColor);
      doc.text(g.s, x + 4, 117);
    });

    // ---- Advisory summary ----------------------------------------
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND_DARK);
    doc.text("Advisory Summary", 14, 132);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(doc.splitTextToSize(recommendation, PW - 28), 14, 139);

    // ---- Two-column guidance -------------------------------------
    const colY = 165;
    const colW = (PW - 34) / 2;

    const drawList = (x: number, y: number, title: string, items: string[]) => {
      doc.setFillColor(...BG_SOFT);
      doc.roundedRect(x, y, colW, 78, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...BRAND_DARK);
      doc.text(title, x + 5, y + 8);
      doc.setDrawColor(...sevColor);
      doc.setLineWidth(0.6);
      doc.line(x + 5, y + 10.5, x + 5 + 22, y + 10.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...INK);
      let yy = y + 17;
      items.forEach((it) => {
        doc.setTextColor(...sevColor);
        doc.text("■", x + 5, yy);
        doc.setTextColor(...INK);
        const lines = doc.splitTextToSize(it, colW - 14);
        doc.text(lines, x + 10, yy);
        yy += lines.length * 4.4 + 2.5;
      });
    };

    drawList(14, colY, "HEALTH RECOMMENDATIONS", healthActions);
    drawList(14 + colW + 6, colY, "CITIZEN SAFETY ACTIONS", citizenActions);

    // ---- Emergency guidance --------------------------------------
    doc.setFillColor(...sevColor);
    doc.roundedRect(14, 250, PW - 28, 20, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("EMERGENCY RESPONSE GUIDANCE", 19, 258);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(emergencyGuidance, PW - 40), 19, 264);

    // ---- Official notice + signature -----------------------------
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(14, 277, PW - 14, 277);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND_DARK);
    doc.text("OFFICIAL NOTICE", 14, 282);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      "This advisory is issued by the GreenGuard AI Environmental Monitoring & Alert Authority for public",
      14,
      286,
    );
    doc.text(
      "awareness. Citizens are advised to comply with the recommendations until rescinded.",
      14,
      289.5,
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text("Authorised Signatory", PW - 14, 282, { align: "right" });
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND_DARK);
    doc.text("GreenGuard AI", PW - 14, 287, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("Chief Environmental Officer", PW - 14, 291, { align: "right" });

    doc.save(`${city.name}_Advisory_${ref}.pdf`);
  };

  const prefersReduced = useReducedMotion();

  return (
    <>
      <SceneBackground aqi={city.aqi} />
      <motion.div
        className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto"
        variants={PAGE_STAGGER}
        initial={prefersReduced ? false : "hidden"}
        animate="show"
      >
        <DashboardHeader
          cityName={city.name}
          country={city.country}
          band={band}
          envBand={envHealth.band}
          isApiConnected={isApiConnected}
          lastUpdated={currentTime}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onExport={handleExport}
          onAdvisory={handleAdvisory}
        />

        <motion.div variants={PAGE_SECTION}>
          <WelcomeHero
            cityId={city.id}
            userName={user?.name}
            cityName={city.name}
            country={city.country}
            aqi={city.aqi}
            temp={city.temp}
            humidity={city.humidity}
            windSpeed={city.windSpeed}
          />
        </motion.div>

        {/* Admin AI Executive Bulletin (Feature 7) — unchanged, admin-only */}
        {isAdmin && (
          <motion.div variants={PAGE_SECTION}>
            <Panel
              eyebrow="Gemini AI · Admin Intelligence"
              title={
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  Executive bulletin
                </div>
              }
              action={
                <button
                  onClick={() => fetchSummary()}
                  className="text-[11px] text-primary hover:underline inline-flex items-center gap-1"
                >
                  {summaryLoading ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <ArrowUpRight className="size-3" />
                  )}
                  Refresh
                </button>
              }
            >
              {adminSummary ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <BulletinRow label="Executive bulletin" text={adminSummary.executiveBulletin} />
                    <BulletinRow label="Weekly trends" text={adminSummary.weeklyTrends} />
                    <BulletinRow label="Most polluted" text={adminSummary.mostPollutedCities} />
                  </div>
                  <div className="space-y-3">
                    <BulletinRow label="Risk summary" text={adminSummary.riskSummary} />
                    <BulletinRow label="Complaint analysis" text={adminSummary.complaintAnalysis} />
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                        Priority actions
                      </div>
                      <ul className="space-y-1.5">
                        {(adminSummary.priorityActions as string[]).map((a: string, i: number) => (
                          <li key={i} className="flex gap-2 text-sm">
                            <span className="mt-1.5 size-1.5 rounded-full bg-[var(--color-destructive)] shrink-0" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  {summaryLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> Generating AI briefing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />{" "}
                      {isApiConnected
                        ? "Click Refresh to generate executive AI briefing."
                        : "Backend required for AI briefings."}
                    </>
                  )}
                </div>
              )}
            </Panel>
          </motion.div>
        )}

        <motion.div variants={PAGE_SECTION}>
          <EnvironmentalHealthHero
            score={envHealth.score}
            band={envHealth.band}
            aqi={city.aqi}
            aqiBand={band}
            mainPollutant={mainPollutant}
            temp={city.temp}
            humidity={city.humidity}
            windSpeed={city.windSpeed}
            lastUpdated={heroLastUpdated}
          />
        </motion.div>

        <motion.div variants={PAGE_SECTION}>
          <AIDailyBriefCard
            greeting={briefGreeting}
            userName={user?.name}
            cityName={city.name}
            leadInsight={briefLead}
            supportingInsights={briefSupporting}
            aqi={city.aqi}
            aqiLabel={band.label}
            outdoorGuidance={outdoorGuidance}
            pollutionTrend={pollutionTrend}
            weatherImpact={weatherImpact}
            healthRisk={healthRisk}
            activityGuidance={activityGuidance}
            confidence={aiConfidence}
            generatedAgo={briefGeneratedAgo}
            isLoading={isApiConnected && insightsLoading}
            isRefreshing={isRefreshingInsights || (insightsFetching && !insightsLoading)}
            onRefresh={handleRefreshInsights}
            isError={briefIsError}
            isEmpty={briefIsEmpty}
            watchItems={thingsToWatch}
          />
        </motion.div>

        <motion.div variants={PAGE_SECTION}>
          <QuickActions showReports={showReports} />
        </motion.div>

        <motion.div variants={PAGE_SECTION}>
          <HighlightsGrid
            aqi={city.aqi}
            band={band}
            temp={city.temp}
            humidity={city.humidity}
            windSpeed={city.windSpeed}
          />
        </motion.div>

        <motion.div variants={PAGE_SECTION} className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <AlertsCard
              alerts={Array.isArray(alerts) ? alerts : ALERTS}
              isLoading={isApiConnected && alertsLoading}
            />
          </div>
          <div className="lg:col-span-5">
            <MiniTrendCard
              series={chartSeries.map((d) => ({ label: d.label, aqi: d.aqi }))}
              isLoading={isApiConnected && historyLoading}
            />
          </div>
        </motion.div>

        <motion.div variants={PAGE_SECTION}>
          <EnvironmentalTimeline
            series={chartSeries.map((d) => ({ label: d.label, aqi: d.aqi }))}
            isLoading={isApiConnected && historyLoading}
          />
        </motion.div>

        <motion.div variants={PAGE_SECTION}>
          <MapPreviewCard cityName={city.name} aqi={city.aqi} aqiBand={band} />
        </motion.div>

        <motion.div variants={PAGE_SECTION} className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <CommunityActivityCard cityName={city.name} />
          </div>
          <div className="lg:col-span-5">
            <EcoTipCard />
          </div>
        </motion.div>

        {/*
        Detailed environmental analytics — retained from the previous
        dashboard build (full pollutant trend, composite scores, sensor
        network health). These don't have a named slot in the Phase 1
        Citizen Dashboard Foundation yet, so rather than dropping working
        functionality they stay here, below the new foundation, ready to
        be folded into a later phase.
      */}
        {/* ── Phase 2: Pollutant Breakdown ── */}
        <motion.div variants={PAGE_SECTION}>
          <PollutantBreakdownCard
            pm25={city.pm25}
            pm10={city.pm10}
            no2={city.no2}
            o3={city.o3}
            aqi={city.aqi}
          />
        </motion.div>

        {/* ── Phase 2: Weather Insights ── */}
        <motion.div variants={PAGE_SECTION}>
          <WeatherInsightsCard
            temp={city.temp}
            humidity={city.humidity}
            windSpeed={city.windSpeed}
            aqi={city.aqi}
            lat={city.lat}
          />
        </motion.div>

        {/* ── Phase 2: Nearby Cities ── */}
        <motion.div variants={PAGE_SECTION}>
          <NearbyCitiesCard
            currentCityId={city.id}
            currentLat={city.lat}
            currentLng={city.lng}
          />
        </motion.div>

        {/* ── Phase 2: Live Activity Feed ── */}
        <motion.div variants={PAGE_SECTION}>
          <LiveActivityFeed />
        </motion.div>

        <div id="detailed-analytics" className="space-y-6">
          <SectionTitle eyebrow="Deep dive" title="Detailed environmental analytics" />

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <StatCard
              label="Water Quality"
              value={city.water}
              unit="WQI"
              accent="info"
              hint={city.water > 75 ? "Excellent" : "Acceptable"}
              trend={{ value: 3, direction: "down" }}
              icon={<Droplets className="size-4" />}
            />
            <StatCard
              label="Risk Score"
              value={city.risk}
              unit="/100"
              accent={city.risk > 60 ? "destructive" : "warning"}
              hint="Composite exposure"
              trend={{ value: 4, direction: "up" }}
              icon={<ShieldAlert className="size-4" />}
            />
            <StatCard
              label="Active Alerts"
              value={Array.isArray(alerts) ? alerts.length : city.alerts}
              accent="destructive"
              hint="Check alert feed"
              icon={<AlertTriangle className="size-4" />}
            />
          </div>

          <Panel
            eyebrow="Telemetry"
            title="7-day pollutant trend"
            action={
              <div className="flex gap-1 text-[11px]">
                {["AQI", "PM2.5", "NO₂"].map((l, i) => (
                  <span
                    key={l}
                    className="flex items-center gap-1 text-muted-foreground px-2 py-0.5 rounded border border-border"
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{
                        background: [
                          "var(--color-primary)",
                          "var(--color-info)",
                          "var(--color-warning)",
                        ][i],
                      }}
                    />
                    {l}
                  </span>
                ))}
              </div>
            }
          >
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={chartSeries}>
                  <defs>
                    <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-info)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-info)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="aqi"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fill="url(#g1)"
                  />
                  <Area
                    type="monotone"
                    dataKey="pm25"
                    stroke="var(--color-info)"
                    strokeWidth={2}
                    fill="url(#g2)"
                  />
                  <Line
                    type="monotone"
                    dataKey="no2"
                    stroke="var(--color-warning)"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <div className="grid md:grid-cols-2 gap-6">
            <Panel eyebrow="Composition" title="Pollutant breakdown">
              <div className="h-60">
                <ResponsiveContainer>
                  <BarChart
                    data={[
                      { k: "PM2.5", v: city.pm25, lim: 25 },
                      { k: "PM10", v: city.pm10, lim: 50 },
                      { k: "NO₂", v: city.no2, lim: 40 },
                      { k: "O₃", v: city.o3, lim: 60 },
                      { k: "CO₂", v: city.co2 - 380, lim: 50 },
                    ]}
                  >
                    <CartesianGrid
                      stroke="var(--color-border)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="k"
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-popover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 10,
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="lim"
                      fill="color-mix(in oklab, var(--color-muted-foreground) 20%, transparent)"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar dataKey="v" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel eyebrow="Sustainability" title="EcoScore, carbon & renewables">
              <div className="flex flex-col h-full justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  EcoScore, carbon intensity, renewable share, green cover, waste diversion and
                  water recycling for {city.name} now live on the Sustainability page.
                </p>
                <a
                  href="/sustainability"
                  className="text-sm font-medium text-primary inline-flex items-center gap-1.5"
                >
                  View Sustainability <ArrowUpRight className="size-3.5" />
                </a>
              </div>
            </Panel>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function BulletinRow({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <p className="text-sm mt-0.5">{text}</p>
    </div>
  );
}
