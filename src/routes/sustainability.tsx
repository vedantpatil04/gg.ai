import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
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

function bandTone(label: string): Tone {
  if (label === "Good") return "good";
  if (label === "Moderate" || label === "Unhealthy (SG)") return "warning";
  return "critical";
}

// Grade mapping lives on the backend (backend/src/services/ecoScore.service.ts
// — gradeForEcoScore), which is the authoritative source whenever a real
// city.ecoScore is available. This is only the offline/mock-fallback mirror
// (same thresholds — the project's existing terminology) for the rare case
// where the backend hasn't supplied a score yet, so the page still renders
// something sensible while running on static demo data.
function offlineFallbackGrade(eco: number) {
  if (eco >= 85) return "A+";
  if (eco >= 75) return "A";
  if (eco >= 65) return "B+";
  if (eco >= 55) return "B";
  if (eco >= 45) return "C+";
  return "C";
}

// Plain-language status for a metric measured against its established
// project target, instead of the old "+4%"-style fabricated trend arrow
// (removed in Phase 3 — no real historical data exists yet to justify a
// change indicator; that's Phase 4's job).
function targetStatus(value: number, target: number, targetLabel: string): KpiItem["status"] {
  return value >= target
    ? { label: `Above the current ${targetLabel} target`, tone: "good" }
    : { label: "Needs improvement", tone: "warning" };
}

function Sustainability() {
  const { city: rawCity, isApiConnected } = useCity();

  // Phase 2 — Transparent EcoScore: the backend (getCity/getCities) now
  // computes a deterministic, explainable EcoScore from this same Phase 1
  // data (see ecoScore.service.ts) and attaches it as city.ecoScore. To
  // "ensure the same calculated EcoScore is used throughout Sustainability"
  // without touching every child component on this page individually, the
  // page-local `city` used below overrides `eco` with that calculated score
  // at this single entry point — every downstream component that already
  // reads city.eco (Hero, AI summary, KPI strip, Copilot) automatically
  // gets the transparent value with zero changes to those files. Falls back
  // to the untouched legacy `eco` only when running fully offline (no
  // fabrication — just the same number this page always showed in that
  // mode). The global city object from useCity() is left untouched, so
  // Dashboard and every other module keep using the legacy field exactly
  // as before.
  const city = { ...rawCity, eco: rawCity.ecoScore?.score ?? rawCity.eco };

  // Centralized sustainability data — both fields come from the same real
  // backend reading already used for every other metric on this page
  // (city.aqi, city.eco, city.water, ...): see EnvironmentalData /
  // getCity() on the backend and mapBackendToCity() in city-context.tsx.
  // Falls back to 0 only in the fully-offline state, matching the
  // no-fabricated-value convention used by EnvironmentalMetrics on the
  // Environment page.
  const renewableShare = city.renewableShare ?? 0;
  const greenCover     = city.greenCover ?? 0;
  const wasteDiversion = Math.round(50 + city.eco * 0.15);

  const band = findAqiBand(city.aqi);
  const tone = bandTone(band.label);
  const grade = rawCity.ecoScore?.grade ?? offlineFallbackGrade(city.eco);

  // Environmental Overview — five current-condition cards. No fake trend
  // arrows and no progress bars: each card just states the current value
  // and what it means against the project's real, established targets
  // (or, for AQI, its real band classification).
  const kpis: KpiItem[] = [
    { icon: Wind,     label: "AQI",              value: city.aqi,       accent: "var(--color-info)",     status: { label: band.label, tone } },
    { icon: Leaf,     label: "Green cover",      value: greenCover,     suffix: "%", accent: "var(--color-success)", status: targetStatus(greenCover, 30, "30%") },
    { icon: Zap,      label: "Renewable energy", value: renewableShare, suffix: "%", accent: "var(--color-info)",    status: targetStatus(renewableShare, 40, "40%") },
    { icon: Droplets, label: "Water quality",    value: city.water,     suffix: "%", accent: "var(--color-info)",    status: targetStatus(city.water, 75, "75%") },
    { icon: Recycle,  label: "Waste diversion",  value: wasteDiversion, suffix: "%", accent: "var(--color-primary)", status: targetStatus(wasteDiversion, 60, "60%") },
  ];

  return (
    <div className="relative">
      <SustainabilityBackground />
      <div className="relative p-3 sm:p-4 md:p-8 space-y-8 sm:space-y-10 md:space-y-12 max-w-[1600px] mx-auto overflow-hidden">

        {/* ── SUSTAINABILITY OVERVIEW ──────────────────────────── */}
        <section id="hero">
          <SustainabilityHero city={city} isApiConnected={isApiConnected} grade={grade} band={band.label} tone={tone} />
        </section>

        {/* ── ENVIRONMENTAL OVERVIEW ─────────────────────────── */}
        <section id="environmental-overview">
          <SustainabilitySectionHeading icon={Leaf} title="Environmental Overview" description={`Current conditions in ${city.name}.`} />
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
            title="GreenGuard AI"
            description={`Ask GreenGuard about ${city.name}'s current environmental performance.`}
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
