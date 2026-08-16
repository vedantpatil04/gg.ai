import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Radar, AlertTriangle, Leaf, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { intelligenceApi, environmentalApi } from "@/lib/api/environmental.api";
import { Panel, StatCard, Pill, WorkspaceHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function RiskZoneCard({
  cityName,
  country,
  aqi,
  risk,
  eco,
}: {
  cityName: string;
  country: string;
  aqi: number;
  risk: number;
  eco: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const { data: riskRes, isLoading } = useQuery({
    queryKey: ["risk-analysis-card", cityName.toLowerCase()],
    queryFn: () => intelligenceApi.getRiskAnalysis(cityName.toLowerCase()),
    enabled: expanded,
    staleTime: 15 * 60 * 1000,
  });

  const { data: sustRes, isLoading: sustLoading } = useQuery({
    queryKey: ["sustainability-card", cityName.toLowerCase()],
    queryFn: () => intelligenceApi.getSustainabilityRecommendations(cityName.toLowerCase()),
    enabled: expanded,
    staleTime: 15 * 60 * 1000,
  });

  const riskTone = risk > 65 ? "destructive" : risk > 40 ? "warning" : "success";

  const riskLabel = risk > 65 ? "High Risk" : risk > 40 ? "Moderate Risk" : "Low Risk";

  return (
    <div className="glass rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-4 p-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="size-2.5 rounded-full shrink-0"
            style={{
              background:
                aqi > 150
                  ? "var(--color-destructive)"
                  : aqi > 100
                    ? "var(--color-warning)"
                    : "var(--color-success)",
            }}
          />
          <div className="min-w-0">
            <div className="font-medium text-sm">{cityName}</div>
            <div className="text-xs text-muted-foreground">{country}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-xs text-muted-foreground">AQI</div>
            <div className="font-semibold tabular-nums text-sm">{aqi}</div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs text-muted-foreground">Risk</div>
            <div className="font-semibold tabular-nums text-sm">{risk}</div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs text-muted-foreground">Eco</div>
            <div className="font-semibold tabular-nums text-sm text-success">{eco}</div>
          </div>
          <Pill tone={riskTone}>{riskLabel}</Pill>
          {expanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-4 bg-muted/20">
          {(isLoading || sustLoading) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              <span>Loading Gemini analysis…</span>
            </div>
          )}

          {riskRes?.data?.analysis && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Environmental Risk Analysis
              </div>
              <div className="space-y-2 text-sm">
                {riskRes.data.analysis.overallRiskLevel && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Overall Risk:</span>
                    <Pill
                      tone={
                        riskRes.data.analysis.overallRiskLevel === "High" ||
                        riskRes.data.analysis.overallRiskLevel === "Critical"
                          ? "destructive"
                          : "warning"
                      }
                    >
                      {riskRes.data.analysis.overallRiskLevel}
                    </Pill>
                  </div>
                )}
                {riskRes.data.analysis.riskFactors?.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Risk Factors</div>
                    <ul className="space-y-1">
                      {riskRes.data.analysis.riskFactors.slice(0, 3).map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <AlertTriangle className="size-3 text-destructive mt-0.5 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {riskRes.data.analysis.mitigationPriorities?.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Mitigation Priorities</div>
                    <ul className="space-y-1">
                      {riskRes.data.analysis.mitigationPriorities
                        .slice(0, 3)
                        .map((p: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            <Zap className="size-3 text-warning mt-0.5 shrink-0" />
                            {p}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {sustRes?.data?.recommendations && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Sustainability Opportunities
              </div>
              <div className="space-y-2 text-sm">
                {sustRes.data.recommendations.quickWins?.slice(0, 2).map((w: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Leaf className="size-3 text-success mt-0.5 shrink-0" />
                    {w}
                  </div>
                ))}
                {sustRes.data.recommendations.longTermGoals
                  ?.slice(0, 1)
                  .map((g: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Leaf className="size-3 text-primary mt-0.5 shrink-0" />
                      {g}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function EnvironmentalIntelligence() {
  const { data: rankRes, isLoading } = useQuery({
    queryKey: ["env-rankings"],
    queryFn: () => environmentalApi.getRankings(),
    staleTime: 5 * 60 * 1000,
  });

  const rankings: Array<{
    rank: number;
    cityId: string;
    cityName: string;
    country: string;
    aqi: number;
    pm25: number;
    pm10: number;
    risk: number;
    eco: number;
  }> = rankRes?.data?.rankings ?? [];

  // Classify cities into operational zones (same logic as before)
  const hotspots = rankings.filter((c) => c.aqi > 150);
  const riskZones = rankings.filter((c) => c.risk > 60);
  const sustainableLeaders = rankings.filter((c) => c.eco > 65).sort((a, b) => b.eco - a.eco);
  const improvementAreas = rankings.filter((c) => c.aqi > 100 && c.eco < 50);
  const interventionPriorities = rankings
    .map((c) => ({ ...c, urgency: c.aqi * 0.5 + c.risk * 0.5 }))
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Loading environmental intelligence…
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Workspace Header ─────────────────────────────────────────────── */}
      {/* Phase 3A.3: replaces SectionTitle. Stats show classified city      */}
      {/* counts so officers immediately see the environmental picture.       */}
      <WorkspaceHeader
        eyebrow="ENVIRONMENTAL MONITORING · LIVE INTELLIGENCE"
        title="Risk Zones & Environmental Conditions"
        description="Identify pollution hotspots, risk zones, and sustainability opportunities across the network."
        stats={[
          {
            label: "Hotspots",
            value: hotspots.length,
            tone: hotspots.length > 2 ? "destructive" : "warning",
          },
          {
            label: "Risk Zones",
            value: riskZones.length,
            tone: riskZones.length > 2 ? "destructive" : "warning",
          },
          { label: "Leaders", value: sustainableLeaders.length, tone: "success" },
          {
            label: "Need Action",
            value: improvementAreas.length,
            tone: improvementAreas.length > 0 ? "info" : "muted",
          },
        ]}
      />

      {/* Zone summary KPIs — retained below header for quick-glance context */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Pollution Hotspots"
          value={hotspots.length}
          accent={hotspots.length > 2 ? "destructive" : "warning"}
          icon={<AlertTriangle className="size-4" />}
          hint="AQI > 150"
        />
        <StatCard
          label="Risk Zones"
          value={riskZones.length}
          accent={riskZones.length > 2 ? "destructive" : "warning"}
          icon={<AlertTriangle className="size-4" />}
          hint="Risk score > 60"
        />
        <StatCard
          label="Sustainable Leaders"
          value={sustainableLeaders.length}
          accent="success"
          icon={<Leaf className="size-4" />}
          hint="Eco score > 65"
        />
        <StatCard
          label="Improvement Areas"
          value={improvementAreas.length}
          accent="info"
          icon={<Zap className="size-4" />}
          hint="High AQI, low eco"
        />
      </div>

      {/* Intervention Priority Matrix — most actionable section, kept near top */}
      <Panel
        eyebrow="Intervention Priority Matrix"
        title="Top Priority Cities for Environmental Action"
      >
        <div className="space-y-2">
          {interventionPriorities.map((city, i) => {
            const urgencyPct = Math.min(Math.round(city.urgency), 100);
            const color =
              urgencyPct > 150
                ? "var(--color-destructive)"
                : urgencyPct > 100
                  ? "var(--color-warning)"
                  : "var(--color-info)";
            return (
              <div key={city.cityId} className="flex items-center gap-3">
                <span className="text-xs font-bold tabular-nums text-muted-foreground w-5 shrink-0">
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium">{city.cityName}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      AQI {city.aqi} · Risk {city.risk}
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((city.urgency / 200) * 100, 100)}%`,
                        background: color,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* Per-city expandable AI analysis */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Per-City Intelligence
            </div>
            <h3 className="text-base font-semibold mt-0.5">
              Expand any city for Gemini risk + sustainability analysis
            </h3>
          </div>
        </div>
        <div className="space-y-2">
          {rankings.map((city) => (
            <RiskZoneCard
              key={city.cityId}
              cityName={city.cityName}
              country={city.country}
              aqi={city.aqi}
              risk={city.risk}
              eco={city.eco}
            />
          ))}
        </div>
      </div>

      {/* Pollution Hotspots highlight */}
      {hotspots.length > 0 && (
        <Panel
          eyebrow="Pollution Hotspots"
          title="Cities Requiring Immediate Attention"
          className="border border-destructive/20"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {hotspots.map((city) => (
              <div
                key={city.cityId}
                className="rounded-lg border border-destructive/20 bg-destructive/5 p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{city.cityName}</span>
                  <Pill tone="destructive">Hotspot</Pill>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div>
                    <div className="text-destructive font-semibold text-sm">{city.aqi}</div>AQI
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{city.pm25}</div>PM2.5
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{city.risk}</div>Risk
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Sustainability Leaders */}
      {sustainableLeaders.length > 0 && (
        <Panel eyebrow="Sustainability Opportunities" title="Leading Cities — Best Practice Models">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sustainableLeaders.slice(0, 4).map((city) => (
              <div
                key={city.cityId}
                className="rounded-lg border border-success/20 bg-success/5 p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{city.cityName}</span>
                  <Pill tone="success">Leader</Pill>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div>
                    <div className="text-success font-semibold text-sm">{city.eco}</div>Eco Score
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{city.aqi}</div>AQI
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{city.risk}</div>Risk
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
