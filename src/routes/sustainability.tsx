import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { useCity } from "@/lib/city-context";
import { findAqiBand, ecoGradeFallback } from "@/lib/mock-data";
import {
  Leaf, Wind, Droplets, Zap, Recycle, BotMessageSquare,
} from "lucide-react";
import type { Tone } from "@/components/map/intelligence-ui";

// Phase 1 components
import { SustainabilityBackground }       from "@/components/sustainability/background";
import { SustainabilityHero }              from "@/components/sustainability/hero";
import { ExecutiveKpiStrip, type KpiItem } from "@/components/sustainability/kpi-strip";
import { SustainabilitySectionHeading }    from "@/components/sustainability/section-heading";

// Phase 2 components
import { AiExecutiveSummary } from "@/components/sustainability/ai-summary";
import { EcoScoreBreakdownPanel } from "@/components/sustainability/ecoscore-breakdown";

// Phase 4 component
import { SustainabilityHistoryChart } from "@/components/sustainability/history-chart";

// Phase 5 components
import { SustainabilityCopilot } from "@/components/sustainability/copilot-panel";

export const Route = createFileRoute("/sustainability")({
  head: () => ({ meta: [{ title: "Sustainability — GreenGuard AI" }] }),
  component: () => (<AppLayout><Sustainability /></AppLayout>),
});

// ─── helpers ─────────────────────────────────────────────────────────────────

function bandTone(label: string): "good" | "warning" | "critical" {
  if (label === "Good") return "good";
  if (label === "Moderate" || label === "Unhealthy (SG)") return "warning";
  return "critical";
}

// Grade mapping lives on the backend (backend/src/services/ecoScore.service.ts
// — gradeForEcoScore), which is the authoritative source whenever a real
// city.ecoScore is available. ecoGradeFallback() (mock-data.ts) mirrors the
// same thresholds only for the fully-offline demo state — shared with
// copilot-panel.tsx so the fallback can't drift between the two.

// Plain-language status for a metric measured against its established
// project target, instead of the old "+4%"-style fabricated trend arrow
// (removed in Phase 3 — no real historical data exists yet to justify a
// change indicator; that's Phase 4's job).
import { useTranslation } from "react-i18next";

function targetStatus(value: number, target: number, targetLabel: string, t: (k: any, opts?: any) => string): KpiItem["status"] {
  return value >= target
    ? { label: t("targets.above", { target: targetLabel }), tone: "good" }
    : { label: t("targets.needsImprovement"), tone: "warning" };
}

function Sustainability() {
  const { t } = useTranslation("sustainability");
  const { city: rawCity, isApiConnected } = useCity();

  const city = { ...rawCity, eco: rawCity.ecoScore?.score ?? rawCity.eco };
  const renewableShare = city.renewableShare ?? 0;
  const greenCover     = city.greenCover ?? 0;
  const wasteDiversion = Math.round(50 + city.eco * 0.15);

  const band = findAqiBand(city.aqi);
  const tone = bandTone(band.label);
  const grade = rawCity.ecoScore?.grade ?? ecoGradeFallback(city.eco);

  const kpis: KpiItem[] = [
    { icon: Wind,     label: t("kpis.aqi"),              value: city.aqi,       accent: "var(--color-info)",     status: { label: band.label, tone } },
    { icon: Leaf,     label: t("kpis.greenCover"),      value: greenCover,     suffix: "%", accent: "var(--color-success)", status: targetStatus(greenCover, 30, "30%", t) },
    { icon: Zap,      label: t("kpis.renewable"), value: renewableShare, suffix: "%", accent: "var(--color-info)",    status: targetStatus(renewableShare, 40, "40%", t) },
    { icon: Droplets, label: t("kpis.water"),    value: city.water,     suffix: "%", accent: "var(--color-info)",    status: targetStatus(city.water, 75, "75%", t) },
    { icon: Recycle,  label: t("kpis.waste"),  value: wasteDiversion, suffix: "%", accent: "var(--color-primary)", status: targetStatus(wasteDiversion, 60, "60%", t) },
  ];

  return (
    <div className="relative">
      <SustainabilityBackground />
      <div className="relative p-3 sm:p-4 md:p-8 space-y-8 sm:space-y-10 md:space-y-12 w-full overflow-hidden">

        {/* ── SUSTAINABILITY OVERVIEW ──────────────────────────── */}
        <section id="hero">
          <SustainabilityHero city={city} isApiConnected={isApiConnected} grade={grade} band={band.label} tone={tone} />
        </section>

        {/* ── ENVIRONMENTAL OVERVIEW ─────────────────────────── */}
        <section id="environmental-overview">
          <SustainabilitySectionHeading icon={Leaf} title={t("overview")} description={t("currentConditions", { city: city.name })} />
          <ExecutiveKpiStrip items={kpis} />
        </section>

        {/* ── ENVIRONMENTAL HISTORY (Phase 4 — real historical trend) ── */}
        <section id="environmental-history">
          <SustainabilityHistoryChart cityId={city.id} cityName={city.name} />
        </section>

        {/* ── WHY IS THE ECOSCORE X? (Phase 2 — transparent breakdown) ── */}
        <section id="ecoscore-breakdown">
          <EcoScoreBreakdownPanel city={city} />
        </section>

        {/* ── GREENGUARD AI ───────────────────────────────────── */}
        <section id="greenguard-ai" aria-labelledby="greenguard-ai-heading">
          <SustainabilitySectionHeading
            icon={BotMessageSquare}
            title={t("aiSummary")}
            description={t("aiSummaryDesc", { city: city.name })}
            accent="var(--color-primary)"
          />
          <div className="space-y-6">
            <AiExecutiveSummary city={city} renewableShare={renewableShare} greenCover={greenCover} />
            <SustainabilityCopilot
              city={city}
              isApiConnected={isApiConnected}
              renewableShare={renewableShare}
              greenCover={greenCover}
            />
          </div>
        </section>

      </div>
    </div>
  );
}
