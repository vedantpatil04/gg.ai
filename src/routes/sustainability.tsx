import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { useCity } from "@/lib/city-context";
import { findAqiBand, ecoGradeFallback } from "@/lib/mock-data";
import { Leaf, Wind, Droplets, Zap, Recycle } from "lucide-react";
import { useTranslation } from "react-i18next";

// Sustainability Components
import { SustainabilityBackground } from "@/components/sustainability/background";
import { SustainabilityHero } from "@/components/sustainability/hero";
import { ExecutiveKpiStrip, type KpiItem } from "@/components/sustainability/kpi-strip";
import { SustainabilitySectionHeading } from "@/components/sustainability/section-heading";
import { SustainabilityHistorySection } from "@/components/sustainability/history-chart";
import { EcoScoreBreakdownPanel } from "@/components/sustainability/ecoscore-breakdown";
import { SustainabilityTargets } from "@/components/sustainability/targets";
import { SustainabilityPerformance } from "@/components/sustainability/performance";
import { SustainabilityTransparency } from "@/components/sustainability/transparency";

export const Route = createFileRoute("/sustainability")({
  head: () => ({ meta: [{ title: "Sustainability Analytics — GreenGuard" }] }),
  component: () => (
    <AppLayout>
      <Sustainability />
    </AppLayout>
  ),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function bandTone(label: string): "good" | "warning" | "critical" {
  if (label === "Good") return "good";
  if (label === "Moderate" || label === "Unhealthy (SG)") return "warning";
  return "critical";
}

function targetStatus(
  value: number | null | undefined,
  target: number,
  unit = "%",
): KpiItem["status"] {
  if (value == null || Number.isNaN(value)) {
    return { label: "Data Unavailable", tone: "warning" };
  }
  const delta = value - target;
  if (delta >= 0) {
    return {
      label: delta === 0 ? "Target achieved" : `Above target (+${delta.toFixed(0)}${unit})`,
      tone: "good",
    };
  }
  return {
    label: `${Math.abs(delta).toFixed(0)}${unit} below target`,
    tone: "warning",
  };
}

function Sustainability() {
  const { t } = useTranslation("sustainability");
  const { city: rawCity, isApiConnected } = useCity();

  // Consistent data extraction from authoritative context
  const city = {
    ...rawCity,
    eco: rawCity.ecoScore?.score ?? rawCity.eco,
  };

  const renewableShare = city.renewableShare ?? 0;
  const greenCover = city.greenCover ?? 0;
  const wasteDiversion = city.ecoScore?.breakdown?.wasteDiversion?.rawValue ?? null;

  const band = findAqiBand(city.aqi);
  const tone = bandTone(band.label);
  const grade = rawCity.ecoScore?.grade ?? ecoGradeFallback(city.eco);

  // Section 2: 5 core environmental KPI items
  const kpis: KpiItem[] = [
    {
      icon: Wind,
      label: t("kpis.aqi", "AQI"),
      value: city.aqi,
      accent: "var(--color-info)",
      target: 100,
      targetLabel: "Ref: < 100 AQI",
      status: { label: band.label, tone },
    },
    {
      icon: Leaf,
      label: t("kpis.greenCover", "Green Cover"),
      value: greenCover,
      suffix: "%",
      accent: "var(--color-success)",
      target: 30,
      targetLabel: "Target: 30%",
      status: targetStatus(greenCover, 30, "%"),
    },
    {
      icon: Zap,
      label: t("kpis.renewable", "Renewable Energy"),
      value: renewableShare,
      suffix: "%",
      accent: "var(--color-info)",
      target: 35,
      targetLabel: "Target: 35%",
      status: targetStatus(renewableShare, 35, "%"),
    },
    {
      icon: Droplets,
      label: t("kpis.water", "Water Quality"),
      value: city.water,
      suffix: "%",
      accent: "var(--color-info)",
      target: 75,
      targetLabel: "Target: 75%",
      status: targetStatus(city.water, 75, "%"),
    },
    {
      icon: Recycle,
      label: t("kpis.waste", "Waste Diversion"),
      value: wasteDiversion != null ? wasteDiversion : 0,
      suffix: "%",
      accent: "var(--color-primary)",
      target: 60,
      targetLabel: "Target: 60%",
      status: wasteDiversion != null ? targetStatus(wasteDiversion, 60, "%") : { label: "Unmonitored", tone: "warning" },
    },
  ];

  return (
    <div className="relative">
      <SustainabilityBackground />
      <div className="relative p-3 sm:p-4 md:p-8 space-y-8 sm:space-y-10 md:space-y-12 w-full overflow-hidden">
        {/* ── SECTION 1: SUSTAINABILITY OVERVIEW ──────────────────────────── */}
        <section id="hero" aria-label="Sustainability Overview">
          <SustainabilityHero
            city={city}
            isApiConnected={isApiConnected}
            grade={grade}
            band={band.label}
            tone={tone}
          />
        </section>

        {/* ── SECTION 2: ENVIRONMENTAL OVERVIEW ─────────────────────────── */}
        <section id="environmental-overview" aria-label="Environmental Overview">
          <SustainabilitySectionHeading
            icon={Leaf}
            title={t("overview", "Environmental Overview")}
            description={`Current sustainability conditions in ${city.name}.`}
          />
          <ExecutiveKpiStrip items={kpis} />
        </section>

        {/* ── SECTIONS 3 & 4: ENVIRONMENTAL HISTORY & WHAT CHANGED? ─────── */}
        <SustainabilityHistorySection cityId={city.id} cityName={city.name} />

        {/* ── SECTION 5: ECOSCORE EXPLAINED ─────────────────────────────── */}
        <section id="ecoscore-breakdown" aria-label="EcoScore Explained">
          <EcoScoreBreakdownPanel city={city} />
        </section>

        {/* ── SECTION 6: SUSTAINABILITY TARGETS ─────────────────────────── */}
        <section id="sustainability-targets" aria-label="Sustainability Targets">
          <SustainabilityTargets city={city} />
        </section>

        {/* ── SECTION 7: SUSTAINABILITY PERFORMANCE ─────────────────────── */}
        <section id="sustainability-performance" aria-label="Sustainability Performance">
          <SustainabilityPerformance city={city} />
        </section>

        {/* ── SECTION 8: DATA & METHODOLOGY ─────────────────────────────── */}
        <section id="data-methodology" aria-label="Data and Methodology">
          <SustainabilityTransparency city={city} isApiConnected={isApiConnected} />
        </section>
      </div>
    </div>
  );
}
