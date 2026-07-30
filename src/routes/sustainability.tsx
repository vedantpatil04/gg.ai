import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Panel } from "@/components/ui-bits";
import { useCity } from "@/lib/city-context";
import { findAqiBand } from "@/lib/mock-data";
import { useQuery } from "@tanstack/react-query";
import { copilotApi } from "@/lib/api/services.api";
import {
  Leaf, Wind, Droplets, Zap, Recycle, Sparkles,
  BarChart3, BotMessageSquare, Brain, Target, Award,
} from "lucide-react";
import type { Tone } from "@/components/map/intelligence-ui";

// Phase 1 components
import { SustainabilityBackground }       from "@/components/sustainability/background";
import { SustainabilityHero }              from "@/components/sustainability/hero";
import { LiveStatusRibbon }                from "@/components/sustainability/status-ribbon";
import { ExecutiveKpiStrip, type KpiItem } from "@/components/sustainability/kpi-strip";
import { SustainabilitySectionHeading }    from "@/components/sustainability/section-heading";
import { GlassPanelSkeleton }             from "@/components/sustainability/skeleton";

// Phase 2 components
import { AiExecutiveSummary } from "@/components/sustainability/ai-summary";

// Phase 5 components
import { SustainabilityCopilot } from "@/components/sustainability/copilot-panel";

// Phase 6 components
import { ForecastDashboard, EnvForecastCards } from "@/components/sustainability/forecast-dashboard";
import { RiskPredictions, OpportunityCards }  from "@/components/sustainability/risk-opportunity";

// Phase 7 components
import { EsgScoreCard, EsgPillars, ExecutiveEsgSummary } from "@/components/sustainability/esg-dashboard";
import { SdgAlignmentCenter, SdgProgressMatrix }         from "@/components/sustainability/sdg-center";

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

function ecoGrade(eco: number) {
  if (eco >= 85) return "A+";
  if (eco >= 75) return "A";
  if (eco >= 65) return "B+";
  if (eco >= 55) return "B";
  if (eco >= 45) return "C+";
  return "C";
}

function kpiStatus(value: number, target: number): KpiItem["status"] {
  const pct = value / target;
  if (pct >= 0.95) return { label: "On target",   tone: "good" };
  if (pct >= 0.7)  return { label: "Near target",  tone: "warning" };
  return              { label: "Below target", tone: "critical" };
}

function Sustainability() {
  const { city, isApiConnected } = useCity();

  const { data: aiInsightsData, isLoading: aiLoading } = useQuery({
    queryKey: ["city-ai-insights", city.id],
    queryFn:  () => copilotApi.cityInsights(city.id).then(r => r.data.insights),
    staleTime: 30 * 60_000,
    enabled:   isApiConnected,
    throwOnError: false,
  });

  const renewableShare = city.id === "london" ? 48 : city.id === "singapore" ? 42 : city.id === "tokyo" ? 44 : 38;
  const greenCover     = city.id === "singapore" ? 46 : city.id === "london" ? 42 : city.id === "tokyo" ? 38 : 27;

  const band = findAqiBand(city.aqi);
  const tone = bandTone(band.label);
  const grade = ecoGrade(city.eco);

  // Simplified Executive KPIs (6 metrics)
  const kpis: KpiItem[] = [
    { icon: Award,    label: "EcoScore",         value: city.eco, suffix: " pts", accent: "var(--color-primary)", target: 80, targetLabel: "Target 80+ pts", status: kpiStatus(city.eco, 80) },
    { icon: Leaf,     label: "Green cover",      value: greenCover, suffix: "%", accent: "var(--color-success)", target: 30, targetLabel: "Target 30% urban canopy", trend: { direction: greenCover >= 30 ? "up" : "flat", delta: Math.abs(greenCover - 30), unit: "%" }, status: kpiStatus(greenCover, 30) },
    { icon: Wind,     label: "Renewable energy", value: renewableShare, suffix: "%", accent: "var(--color-info)", target: 40, targetLabel: "Target 40% renewable mix", trend: { direction: renewableShare >= 40 ? "up" : "down", delta: Math.abs(renewableShare - 40), unit: "%" }, status: kpiStatus(renewableShare, 40) },
    { icon: Droplets, label: "Water quality",    value: city.water, suffix: "%", accent: "var(--color-info)", target: 75, targetLabel: "Target 75% quality index", trend: { direction: city.water >= 75 ? "up" : "down", delta: Math.abs(city.water - 75), unit: "%" }, status: kpiStatus(city.water, 75) },
    { icon: Recycle,  label: "Waste diversion",  value: Math.round(50 + city.eco * 0.15), suffix: "%", accent: "var(--color-primary)", target: 60, targetLabel: "Target 60% diversion", trend: { direction: "up", delta: 2, unit: "%" }, status: kpiStatus(Math.round(50 + city.eco * 0.15), 60) },
    { icon: Zap,      label: "Carbon intensity", value: Number(city.carbon.toFixed(1)), decimals: 1, suffix: " tCO₂", accent: "var(--color-warning)", target: 5, targetLabel: "Target < 5.0 tCO₂", trend: { direction: city.carbon <= 5 ? "down" : "up", delta: 0.3, unit: " tCO₂" }, status: kpiStatus(5, city.carbon) },
  ];

  return (
    <div className="relative">
      <SustainabilityBackground />
      <div className="relative p-3 sm:p-4 md:p-8 space-y-8 sm:space-y-10 md:space-y-12 max-w-[1600px] mx-auto overflow-hidden">

        {/* ── 1. HERO OVERVIEW & QUICK ACTIONS ─────────────────── */}
        <section id="hero">
          <SustainabilityHero city={city} isApiConnected={isApiConnected} grade={grade} band={band.label} tone={tone} trendDirection="up" trendValue={2} />
        </section>

        <LiveStatusRibbon city={city} />

        {/* ── EXECUTIVE SUMMARY ───────────────────────────────── */}
        <section id="executive-summary">
          <SustainabilitySectionHeading icon={Sparkles} title="AI Executive Summary" description={`Rule-based sustainability brief for ${city.name}.`} />
          <AiExecutiveSummary city={city} renewableShare={renewableShare} greenCover={greenCover} />
        </section>

        {/* ── EXECUTIVE KPIs ─────────────────────────────────── */}
        <section id="kpis">
          <SustainabilitySectionHeading icon={BarChart3} title="Executive KPIs" description="Core sustainability metrics for executive overview." />
          <ExecutiveKpiStrip items={kpis} />
        </section>

        {/* ── AI SUSTAINABILITY COPILOT ──────────────────────── */}
        <section id="copilot" aria-labelledby="copilot-heading">
          <SustainabilitySectionHeading
            icon={BotMessageSquare}
            title="AI Sustainability Copilot"
            description={`Ask Gemini anything about ${city.name}'s environmental data, EcoScore, or what to prioritise next.`}
            accent="var(--color-primary)"
          />
          <SustainabilityCopilot
            city={city}
            isApiConnected={isApiConnected}
            renewableShare={renewableShare}
            greenCover={greenCover}
          />
        </section>

        {/* ── PREDICTIVE INTELLIGENCE (ANALYTICS) ─────────────── */}
        <section id="analytics" aria-labelledby="predictive-heading">
          <SustainabilitySectionHeading
            icon={Brain}
            title="Predictive Sustainability Intelligence"
            description={`EcoScore forecast and environmental predictions for ${city.name}.`}
            accent="var(--color-info)"
          />
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <ForecastDashboard city={city} renewableShare={renewableShare} greenCover={greenCover} />
            </div>
            <div className="lg:col-span-5">
              <EnvForecastCards city={city} renewableShare={renewableShare} />
            </div>
          </div>
        </section>

        {/* ── AI INTELLIGENCE & RECOMMENDATIONS ──────────────── */}
        <section id="recommendations" aria-labelledby="ai-intelligence-heading">
          <SustainabilitySectionHeading
            icon={Sparkles}
            title="AI Intelligence & Recommendations"
            description="Unified AI risk predictions, opportunity matrix, and strategic recommendations."
            accent="var(--color-primary)"
          />
          <div className="grid lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6">
              <RiskPredictions city={city} renewableShare={renewableShare} greenCover={greenCover} />
            </div>
            <div className="lg:col-span-6">
              <OpportunityCards city={city} renewableShare={renewableShare} greenCover={greenCover} />
            </div>
            
            {/* AI Recommendations */}
            <div className="lg:col-span-12">
              {isApiConnected && aiLoading ? (
                <GlassPanelSkeleton rows={3} />
              ) : aiInsightsData ? (
                <Panel eyebrow="AI Strategic Insights" title="AI Recommendations">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {(Array.isArray(aiInsightsData) ? aiInsightsData : []).map((insight: { title: string; body: string; tag: string }) => (
                      <div key={insight.title} className="rounded-xl bg-muted/30 border border-border p-4 hover:border-primary/40 transition-colors">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{insight.tag}</div>
                        <div className="text-sm sm:text-base font-semibold mt-1">{insight.title}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">{insight.body}</div>
                      </div>
                    ))}
                  </div>
                </Panel>
              ) : (
                <Panel eyebrow="AI Strategic Insights" title="AI Recommendations">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-muted/30 border border-border p-4 hover:border-primary/40 transition-colors">
                      <div className="text-[10px] uppercase tracking-wider text-primary font-semibold">Priority Recommendation</div>
                      <div className="text-sm sm:text-base font-semibold mt-1">Accelerate Solar & Microgrid Integration</div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        Expand rooftop photovoltaic installations across municipal buildings in {city.name} to push renewable share beyond target thresholds.
                      </div>
                    </div>
                    <div className="rounded-xl bg-muted/30 border border-border p-4 hover:border-primary/40 transition-colors">
                      <div className="text-[10px] uppercase tracking-wider text-info font-semibold">Urban Planning</div>
                      <div className="text-sm sm:text-base font-semibold mt-1">Expand Urban Forest & Canopy Cover</div>
                      <div className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        Deploy targeted native afforestation in high-density corridors to mitigate urban heat island effects and improve carbon sequestration.
                      </div>
                    </div>
                  </div>
                </Panel>
              )}
            </div>
          </div>
        </section>

        {/* ── ESG INTELLIGENCE ───────────────────────────────── */}
        <section id="esg" aria-labelledby="esg-heading">
          <SustainabilitySectionHeading
            icon={Award}
            title="ESG Intelligence"
            description={`Environmental, Social and Governance scoring for ${city.name}.`}
            accent="var(--color-success)"
          />
          <div className="space-y-5">
            <div className="grid lg:grid-cols-12 gap-5">
              <div className="lg:col-span-4">
                <EsgScoreCard city={city} renewableShare={renewableShare} greenCover={greenCover} />
              </div>
              <div className="lg:col-span-8">
                <ExecutiveEsgSummary city={city} renewableShare={renewableShare} greenCover={greenCover} />
              </div>
            </div>
            <EsgPillars city={city} renewableShare={renewableShare} greenCover={greenCover} />
          </div>
        </section>

        {/* ── SDG ALIGNMENT ──────────────────────────────────── */}
        <section id="sdg" aria-labelledby="sdg-heading">
          <SustainabilitySectionHeading
            icon={Target}
            title="SDG Alignment Center"
            description="UN Sustainable Development Goal alignment across 6 sustainability-relevant goals."
            accent="oklch(0.62 0.17 220)"
          />
          <div className="space-y-5">
            <SdgAlignmentCenter city={city} renewableShare={renewableShare} greenCover={greenCover} />
            <SdgProgressMatrix  city={city} renewableShare={renewableShare} greenCover={greenCover} />
          </div>
        </section>

      </div>
    </div>
  );
}
