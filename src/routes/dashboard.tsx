import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute } from "@/components/protected-route";
import { Panel, SectionTitle } from "@/components/ui-bits";
import { useCity } from "@/lib/city-context";
import { useAuth } from "@/lib/auth-context";
import { AUTHORITY_ROLES } from "@/lib/role-routing";
import { aqiBand, ALERTS, INSIGHTS } from "@/lib/mock-data";
import { computeEnvHealthScore } from "@/lib/environmental-health";
import { formatRelativeTime } from "@/lib/format-time";
import { computeDataFreshness } from "@/lib/data-freshness";
import { getPollutionTrend, deriveThingsToWatch, deriveWhatMattersNow } from "@/lib/ai-brief";
import { useQuery } from "@tanstack/react-query";
import { alertApi, copilotApi, adminApi, complaintApi } from "@/lib/api/services.api";
import { environmentalApi } from "@/lib/api/environmental.api";
import { generateAndDownloadPdf, ReportDownloadError } from "@/lib/download-file";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { STAGGER, FADE_UP } from "@/lib/motion";

const PAGE_STAGGER = STAGGER(0.07, 0);
const PAGE_SECTION = FADE_UP;
import { Sparkles, ArrowUpRight, Loader2 } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { WelcomeHero } from "@/components/dashboard/welcome-hero";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { CurrentConditions } from "@/components/dashboard/current-conditions";
import { WhatMattersNow } from "@/components/dashboard/what-matters-now";
import { TodaysOutlook } from "@/components/dashboard/todays-outlook";
import { HealthGuidance } from "@/components/dashboard/health-guidance";
import { MyEnvironment } from "@/components/dashboard/my-environment";
import { LiveEnvironmentalActivity } from "@/components/dashboard/live-environmental-activity";
import { Aqi24hChart, type Aqi24hPoint } from "@/components/dashboard/aqi-24h-chart";
import { AroundYou } from "@/components/dashboard/around-you";
import { AlertsCard, type DashboardAlert } from "@/components/dashboard/alerts-card";

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
  const { city, cities, isApiConnected, refreshCity } = useCity();
  const { user } = useAuth();
  const band = aqiBand(city.aqi);
  const showReports = !!user && AUTHORITY_ROLES.includes(user.role);

  // Real 7-day history, used to derive a coarse pollution trend ("What
  // Matters Now").
  const {
    data: historyData,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ["city-history", city.id, 7],
    queryFn: () => environmentalApi.getHistory(city.id, 7),
    staleTime: 15 * 60 * 1000,
    enabled: !!city.id,
  });

  const trendHistory: Array<{ aqi: number }> = historyData?.data?.history?.length
    ? historyData.data.history.map((d: { aqi: { avg: number } }) => ({ aqi: d.aqi?.avg ?? 0 }))
    : [];

  // Real 24h hourly trend for the single "AQI Today" chart.
  const { data: trend24hData, isLoading: trend24hLoading, refetch: refetchTrend24h } = useQuery({
    queryKey: ["city-trend-24h", city.id],
    queryFn: () => environmentalApi.getCityTrend(city.id, 24),
    staleTime: 5 * 60 * 1000,
    enabled: !!city.id,
    throwOnError: false,
  });

  const aqi24hPoints: Aqi24hPoint[] = useMemo(() => {
    const trend = trend24hData?.data?.trend;
    if (!Array.isArray(trend) || trend.length === 0) return [];

    return trend
      .map((t: { timestamp: string; aqi: number }) => {
        const ts = new Date(t.timestamp).getTime();
        return { timestamp: t.timestamp, aqi: t.aqi, ts };
      })
      .filter((p) => !Number.isNaN(p.ts))
      .sort((a, b) => a.ts - b.ts)
      .map(({ timestamp, aqi }) => ({
        timestamp,
        aqi,
        label: new Date(timestamp).toLocaleTimeString([], { hour: "numeric" }),
      }));
  }, [trend24hData]);

  const isAdmin = user?.role === "administrator";

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

  // Insights query
  const { data: insightData, refetch: refetchInsights } = useQuery({
    queryKey: ["insights", city.id],
    queryFn: () => copilotApi.getInsights(city.id).then((r) => r.data.insights),
    staleTime: 5 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  // Admin AI summary
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

  // Authenticated citizen's reported issues
  const { data: myComplaintsData } = useQuery({
    queryKey: ["my-complaints-count", user?._id],
    queryFn: () => complaintApi.getMine().then((r) => r.data?.complaints ?? []),
    staleTime: 30_000,
    enabled: !!user && isApiConnected,
    throwOnError: false,
  });

  const reportedIssuesCount = Array.isArray(myComplaintsData) ? myComplaintsData.length : 0;

  const alerts = alertData ?? ALERTS;
  const insights = insightData ?? INSIGHTS;
  const adminSummary = adminSummaryData?.summary;

  const envHealth = computeEnvHealthScore({ aqi: city.aqi, risk: city.risk, water: city.water });
  const dataLastUpdatedLabel = formatRelativeTime(city.updatedAt);
  const dataFreshness = computeDataFreshness(city.updatedAt, isApiConnected);

  const realAlerts: DashboardAlert[] = Array.isArray(alertData) ? alertData : [];

  const pollutionTrend = getPollutionTrend(trendHistory);
  const hasReliableHistory = trendHistory.length >= 2;
  const thingsToWatch = deriveThingsToWatch({
    pollutionTrend,
    humidity: city.humidity,
    windSpeed: city.windSpeed,
    risk: city.risk,
    water: city.water,
    aqi: city.aqi,
  });
  const whatMattersItems = deriveWhatMattersNow({
    aqi: city.aqi,
    band,
    pollutionTrend,
    hasHistory: hasReliableHistory,
    watchItems: thingsToWatch,
    activeAlertsCount: realAlerts.length,
  });

  // Concise GreenGuard AI interpretation
  const aiInterpretation = useMemo(() => {
    if (Array.isArray(insights) && insights.length > 0) {
      const top = insights[0] as { body?: string; description?: string };
      if (top.body || top.description) {
        return top.body || top.description;
      }
    }
    if (city.aqi <= 50) {
      return "Conditions are generally suitable for normal outdoor activity, with excellent air quality and comfortable baseline metrics.";
    } else if (city.aqi <= 100) {
      return `Conditions are generally suitable for normal outdoor activity, with ${
        city.humidity && city.humidity > 75 ? "higher humidity" : "routine urban particulate levels"
      } being the main comfort concern.`;
    } else if (city.aqi <= 150) {
      return `Air quality is moderately elevated. Sensitive individuals should consider reducing prolonged outdoor exertion during peak hours.`;
    } else {
      return `Unhealthy air quality detected. Citizens are advised to minimize prolonged outdoor exposure and utilize protective measures.`;
    }
  }, [insights, city.aqi, city.humidity]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  type PdfExportStatus = { state: "idle" | "pending" | "success" | "error"; message?: string };
  const [exportStatus, setExportStatus] = useState<PdfExportStatus>({ state: "idle" });
  const [advisoryStatus, setAdvisoryStatus] = useState<PdfExportStatus>({ state: "idle" });

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      // 1. Explicitly trigger fresh upstream Open-Meteo ingestion (bypasses 20-min DB freshness gate)
      try {
        await environmentalApi.refreshEnvironmentalData();
      } catch (err) {
        console.warn("[dashboard] Manual environmental refresh request failed:", err);
      }

      // 2. Refetch all active dashboard queries with updated database state
      await Promise.all([
        refreshCity(),
        refetchAlerts(),
        refetchInsights(),
        refetchHistory(),
        refetchTrend24h(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // ============================================================
  // 1) ENVIRONMENTAL ASSESSMENT REPORT  (multi-page, enterprise)
  // ============================================================
  const handleExport = async () => {
    setExportStatus({ state: "pending" });
    const doc = new jsPDF("p", "mm", "a4");
    const PW = 210;
    const PH = 297;

    const BRAND: [number, number, number] = [13, 94, 76];
    const BRAND_DARK: [number, number, number] = [8, 58, 47];
    const ACCENT: [number, number, number] = [34, 197, 144];
    const INK: [number, number, number] = [22, 31, 38];
    const MUTED: [number, number, number] = [110, 122, 130];
    const LINE: [number, number, number] = [220, 226, 230];
    const BG_SOFT: [number, number, number] = [240, 247, 244];

    const reportId =
      "GG-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random() * 900000);
    const generatedOn = new Date().toLocaleString();

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

    const drawHeader = (subtitle: string) => {
      doc.setFillColor(...BRAND);
      doc.rect(0, 0, PW, 18, "F");
      doc.setFillColor(...ACCENT);
      doc.rect(0, 18, PW, 1.2, "F");

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

    // ---- PAGE 1: COVER ----
    doc.setFillColor(...BRAND_DARK);
    doc.rect(0, 0, PW, PH, "F");

    doc.setFillColor(...BRAND);
    doc.rect(0, 90, PW, 80, "F");
    doc.setFillColor(...ACCENT);
    doc.rect(0, 168, PW, 2, "F");

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

    doc.setFillColor(...aqiClass.color);
    doc.roundedRect(20, 150, 95, 12, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`AQI ${city.aqi} · ${aqiClass.label}`, 22.5, 158);

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

    // ---- PAGE 2: EXECUTIVE SUMMARY ----
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

    // Apply footers
    const total = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      if (p > 1) drawFooter(p, total);
    }

    const filename = `${city.name}_Environmental_Report_${reportId}.pdf`;
    try {
      const blob = doc.output("blob");
      await generateAndDownloadPdf(() => blob, filename);
      setExportStatus({ state: "success" });
    } catch (err) {
      setExportStatus({
        state: "error",
        message:
          err instanceof ReportDownloadError
            ? err.message
            : "The report could not be generated. Please try again.",
      });
    }
  };

  // ============================================================
  // 2) OFFICIAL ENVIRONMENTAL ADVISORY  (single-page, official)
  // ============================================================
  const handleAdvisory = async () => {
    setAdvisoryStatus({ state: "pending" });
    const doc = new jsPDF("p", "mm", "a4");
    const PW = 210;
    const PH = 297;

    const BRAND: [number, number, number] = [13, 94, 76];
    const BRAND_DARK: [number, number, number] = [8, 58, 47];
    const INK: [number, number, number] = [22, 31, 38];
    const MUTED: [number, number, number] = [110, 122, 130];
    const LINE: [number, number, number] = [220, 226, 230];
    const BG_SOFT: [number, number, number] = [240, 247, 244];

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

    doc.setTextColor(245, 248, 246);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(80);
    doc.text("OFFICIAL ADVISORY", PW / 2, PH / 2, { align: "center", angle: 30 });

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

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND_DARK);
    doc.text("Advisory Summary", 14, 94);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(doc.splitTextToSize(recommendation, PW - 28), 14, 101);

    const colY = 125;
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

    doc.setFillColor(...sevColor);
    doc.roundedRect(14, 215, PW - 28, 20, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("EMERGENCY RESPONSE GUIDANCE", 19, 223);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(doc.splitTextToSize(emergencyGuidance, PW - 40), 19, 229);

    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(14, 250, PW - 14, 250);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND_DARK);
    doc.text("OFFICIAL NOTICE", 14, 256);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      "This advisory is issued by the GreenGuard AI Environmental Monitoring & Alert Authority for public",
      14,
      260,
    );
    doc.text("awareness. Citizens are advised to comply with the recommendations.", 14, 263.5);

    const filename = `${city.name}_Advisory_${ref}.pdf`;
    try {
      const blob = doc.output("blob");
      await generateAndDownloadPdf(() => blob, filename);
      setAdvisoryStatus({ state: "success" });
    } catch (err) {
      setAdvisoryStatus({
        state: "error",
        message:
          err instanceof ReportDownloadError
            ? err.message
            : "The advisory could not be generated. Please try again.",
      });
    }
  };

  const prefersReduced = useReducedMotion();

  return (
    <>
      <motion.div
        className="p-4 md:p-8 space-y-6 w-full max-w-7xl mx-auto"
        variants={PAGE_STAGGER}
        initial={prefersReduced ? false : "hidden"}
        animate="show"
      >
        {/* ============================================================ */}
        {/* 1. LOCKED HERO                                              */}
        {/* ============================================================ */}
        <DashboardHeader
          cityName={city.name}
          country={city.country}
          band={band}
          envBand={envHealth.band}
          isApiConnected={isApiConnected}
          freshness={dataFreshness}
          lastUpdatedLabel={dataLastUpdatedLabel}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onExport={handleExport}
          onAdvisory={handleAdvisory}
          exportStatus={exportStatus}
          advisoryStatus={advisoryStatus}
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
            lastUpdated={dataLastUpdatedLabel}
          />
        </motion.div>

        {/* Admin AI Executive Bulletin — admin-only */}
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

        {/* ============================================================ */}
        {/* 2. WHAT MATTERS NOW                                         */}
        {/* ============================================================ */}
        <motion.div variants={PAGE_SECTION}>
          <WhatMattersNow
            items={whatMattersItems}
            aiInterpretation={aiInterpretation}
            isLoading={isApiConnected && alertsLoading}
          />
        </motion.div>

        {/* ============================================================ */}
        {/* 3. CURRENT CONDITIONS                                       */}
        {/* ============================================================ */}
        <motion.div variants={PAGE_SECTION}>
          <CurrentConditions
            aqi={city.aqi}
            band={band}
            temp={city.temp}
            humidity={city.humidity}
            windSpeed={city.windSpeed}
            pm25={city.pm25}
            freshness={dataFreshness}
            lastUpdatedLabel={dataLastUpdatedLabel}
          />
        </motion.div>

        {/* ============================================================ */}
        {/* 4. TODAY'S OUTLOOK                                          */}
        {/* ============================================================ */}
        <motion.div variants={PAGE_SECTION}>
          <TodaysOutlook
            cityId={city.id}
            cityName={city.name}
            currentTemp={city.temp}
            currentHumidity={city.humidity}
            currentAqi={city.aqi}
          />
        </motion.div>

        {/* ============================================================ */}
        {/* 5. AQI QUICK TREND + 6. HEALTH & OUTDOOR GUIDANCE           */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <motion.div variants={PAGE_SECTION} className="lg:col-span-7 flex flex-col">
            <Aqi24hChart
              points={aqi24hPoints}
              currentAqi={city.aqi}
              isLoading={trend24hLoading}
            />
          </motion.div>

          <motion.div variants={PAGE_SECTION} className="lg:col-span-5 flex flex-col">
            <HealthGuidance
              aqi={city.aqi}
              temp={city.temp}
              humidity={city.humidity}
              windSpeed={city.windSpeed}
            />
          </motion.div>
        </div>

        {/* ============================================================ */}
        {/* 7. ALERTS & ADVISORIES + 8. AROUND YOU                      */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <motion.div variants={PAGE_SECTION} className="flex flex-col">
            <AlertsCard
              alerts={realAlerts}
              onAdvisory={handleAdvisory}
              isLoading={isApiConnected && alertsLoading}
            />
          </motion.div>

          <motion.div variants={PAGE_SECTION} className="flex flex-col">
            <AroundYou currentCity={city} cities={cities} />
          </motion.div>
        </div>

        {/* ============================================================ */}
        {/* 9. MY ENVIRONMENT + 10. ENVIRONMENTAL ACTIVITY              */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <motion.div variants={PAGE_SECTION} className="lg:col-span-7 flex flex-col">
            <MyEnvironment
              cityName={city.name}
              country={city.country}
              aqi={city.aqi}
              activeAlertsCount={realAlerts.length}
              reportedIssuesCount={reportedIssuesCount}
              userName={user?.name}
            />
          </motion.div>

          <motion.div variants={PAGE_SECTION} className="lg:col-span-5 flex flex-col">
            <LiveEnvironmentalActivity
              alerts={realAlerts}
              cityName={city.name}
              updatedAt={city.updatedAt}
              isLoading={isApiConnected && alertsLoading}
            />
          </motion.div>
        </div>

        {/* ============================================================ */}
        {/* 11. EXPLORE GREENGUARD                                      */}
        {/* ============================================================ */}
        <motion.div variants={PAGE_SECTION} className="space-y-4">
          <SectionTitle eyebrow="Navigation" title="Explore GreenGuard" />
          <QuickActions showReports={showReports} />
        </motion.div>
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
