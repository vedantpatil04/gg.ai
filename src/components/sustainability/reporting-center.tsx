/**
 * reporting-center.tsx — Phase 8 Enterprise Reporting Center
 *
 * Sustainability-specific report panel embedded in the Sustainability page.
 * Reuses:
 *   reportApi.generateAI()   — existing Gemini AI report endpoint
 *   reportApi.download()     — existing PDF download endpoint
 *
 * When the API is offline a "preview only" mode renders a structured
 * document from existing city data — no backend required for the preview.
 *
 * Report types supported:
 *   Executive Summary · EcoScore · ESG Dashboard ·
 *   SDG Progress · Carbon · Water · Climate · AI Insights
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import {
  FileText, Download, Loader2, CheckCircle, AlertTriangle,
  X, BarChart3, Leaf, Droplets, CloudLightning, Sparkles,
  Target, Factory, ScrollText, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { reportApi } from "@/lib/api/services.api";
import { esgScores } from "@/components/sustainability/esg-dashboard";
import type { City } from "@/lib/mock-data";

// ─── report type catalogue ────────────────────────────────────────────────────

const REPORT_TYPES = [
  { id: "Sustainability", label: "Executive Summary",   icon: ScrollText,     description: "Full sustainability overview with KPIs, trends and recommendations" },
  { id: "ecoscore",      label: "EcoScore Report",      icon: BarChart3,      description: "EcoScore breakdown, grade analysis and 12-month trend" },
  { id: "esg",           label: "ESG Dashboard",        icon: Target,         description: "Environmental, Social and Governance scoring with pillar details" },
  { id: "sdg",           label: "SDG Progress",         icon: Leaf,           description: "UN SDG 6/7/11/12/13/15 alignment progress and matrix" },
  { id: "carbon",        label: "Carbon Intelligence",  icon: Factory,        description: "Carbon intensity, sector split and reduction trajectory" },
  { id: "water",         label: "Water Intelligence",   icon: Droplets,       description: "Water quality, reuse rate, efficiency and conservation plan" },
  { id: "climate",       label: "Climate Intelligence", icon: CloudLightning, description: "Heat stress, flood, air and water risk profile" },
  { id: "ai",            label: "AI Insights",          icon: Sparkles,       description: "Gemini-generated sustainability narrative and recommendations" },
] as const;

type ReportId = typeof REPORT_TYPES[number]["id"];

// ─── report preview ───────────────────────────────────────────────────────────

function ReportPreviewModal({
  city, reportId, generatedText, renewableShare, greenCover, onClose,
}: {
  city: City;
  reportId: ReportId;
  generatedText: string | null;
  renewableShare: number;
  greenCover: number;
  onClose: () => void;
}) {
  const esg        = useMemo(() => esgScores(city, renewableShare, greenCover), [city, renewableShare, greenCover]);
  const dateStr    = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const wasteScore = Math.round(50 + city.eco * 0.15);

  const metrics = [
    { label: "EcoScore",         value: `${city.eco}/100` },
    { label: "AQI",              value: `${city.aqi}` },
    { label: "Carbon",           value: `${city.carbon} tCO₂/cap` },
    { label: "Water quality",    value: `${city.water}%` },
    { label: "Renewables",       value: `${renewableShare}%` },
    { label: "Green cover",      value: `${greenCover}%` },
    { label: "ESG score",        value: `${esg.overall}/100` },
    { label: "Waste diverted",   value: `${wasteScore}%` },
  ];

  const recommendations = [
    city.aqi > 100   && `Implement traffic-management measures to reduce PM2.5 below 35 µg/m³.`,
    city.carbon > 6  && `Introduce sector carbon budgets targeting a 20% intensity reduction.`,
    renewableShare < 40 && `Accelerate solar and wind procurement to close the ${40 - renewableShare}% renewable gap.`,
    greenCover < 30  && `Launch urban forestry programme to reach 30% canopy target.`,
    city.water < 70  && `Scale grey-water reuse and treatment capacity for water index above 70%.`,
  ].filter(Boolean) as string[];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 backdrop-blur-md p-4 pt-8"
      role="dialog"
      aria-modal="true"
      aria-label="Report preview"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-3xl glass rounded-3xl overflow-hidden shadow-2xl mb-8"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <FileText className="size-4 text-primary" aria-hidden="true" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Report Preview</div>
              <div className="text-sm font-semibold">{REPORT_TYPES.find(r => r.id === reportId)?.label ?? "Sustainability Report"}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-7 rounded-lg grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close preview"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Document */}
        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          {/* Cover */}
          <div className="aurora rounded-2xl p-6 text-white space-y-1">
            <div className="text-[10px] uppercase tracking-widest opacity-80">GreenGuard AI · Enterprise Sustainability Intelligence</div>
            <h1 className="text-xl font-semibold mt-1">{REPORT_TYPES.find(r => r.id === reportId)?.label ?? "Sustainability Report"}</h1>
            <div className="text-sm opacity-80 mt-0.5">{city.name} · {dateStr}</div>
          </div>

          {/* Executive summary */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Executive Summary</h2>
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm leading-relaxed">
              {generatedText
                ? generatedText.slice(0, 600) + (generatedText.length > 600 ? "…" : "")
                : `${city.name} recorded a composite EcoScore of ${city.eco}/100 with an ESG rating of ${esg.overall}/100. ` +
                  `Air quality stands at AQI ${city.aqi} and water sustainability at ${city.water}%. ` +
                  `Carbon intensity is ${city.carbon} tCO₂ per capita with ${renewableShare}% renewable energy in the grid mix. ` +
                  `${esg.overall >= 70 ? "Overall environmental governance is strong." : "Targeted interventions are recommended across carbon, water, and green cover dimensions."}`}
            </div>
          </section>

          {/* Key metrics */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Key Metrics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {metrics.map(m => (
                <div key={m.label} className="rounded-xl border border-border bg-card p-3 text-center">
                  <div className="text-[10px] text-muted-foreground">{m.label}</div>
                  <div className="text-sm font-semibold tabular-nums mt-0.5">{m.value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* ESG snapshot */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">ESG Snapshot</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Environmental", value: esg.environmental, color: "var(--color-success)" },
                { label: "Social",        value: esg.social,        color: "var(--color-info)" },
                { label: "Governance",    value: esg.governance,    color: "var(--color-warning)" },
              ].map(e => (
                <div key={e.label} className="rounded-xl border border-border bg-card p-3 text-center">
                  <div className="text-[10px] text-muted-foreground">{e.label}</div>
                  <div className="text-lg font-semibold tabular-nums mt-0.5" style={{ color: e.color }}>{e.value}</div>
                  <div className="h-1 rounded-full bg-muted mt-1.5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${e.value}%`, background: e.color }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Priority Recommendations</h2>
              <ol className="space-y-2">
                {recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <span className="size-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold grid place-items-center shrink-0 mt-0.5">{i + 1}</span>
                    {r}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <div className="text-[10px] text-muted-foreground border-t border-border pt-3">
            Generated by GreenGuard AI · {dateStr} · Data reflects live city metrics for {city.name}.
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── main reporting center ────────────────────────────────────────────────────

export function ReportingCenter({
  city, isApiConnected, renewableShare, greenCover,
}: {
  city: City;
  isApiConnected: boolean;
  renewableShare: number;
  greenCover: number;
}) {
  const [selected, setSelected]         = useState<ReportId>("Sustainability");
  const [previewOpen, setPreviewOpen]   = useState(false);
  const [generatedText, setGeneratedText] = useState<string | null>(null);
  const [downloadedId, setDownloadedId] = useState<string | null>(null);
  const [error, setError]               = useState<string | null>(null);

  // AI generation mutation — reuses reportApi.generateAI (same as /reports route)
  const generateMutation = useMutation({
    mutationFn: () =>
      reportApi.generateAI({
        type: selected === "ecoscore" || selected === "esg" || selected === "sdg" ||
              selected === "carbon" || selected === "water" || selected === "climate" || selected === "ai"
          ? "Sustainability"
          : (selected as "Daily" | "Weekly" | "Monthly" | "City" | "Sustainability"),
        cityId: city.id,
        save: true,
      }),
    onSuccess: (res) => {
      const data = res?.data ?? res as Record<string, unknown>;
      const text = (data?.executiveSummary ?? data?.text ?? "") as string;
      setGeneratedText(text || null);
      const id = data?._id as string | undefined;
      if (id) setDownloadedId(id);
      setError(null);
      setPreviewOpen(true);
    },
    onError: () => {
      setError("AI report generation failed. Check backend connection.");
      setGeneratedText(null);
      setPreviewOpen(true); // still show preview with local data
    },
  });

  // PDF download mutation — reuses reportApi.download
  const downloadMutation = useMutation({
    mutationFn: (id: string) => reportApi.download(id),
    onSuccess: (blob) => {
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `greenguard-sustainability-${city.id}-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onError: () => setError("PDF download failed. Try again."),
  });

  const handlePreview = () => {
    setError(null);
    if (isApiConnected) {
      generateMutation.mutate();
    } else {
      setGeneratedText(null);
      setPreviewOpen(true);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass rounded-2xl p-5 space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Enterprise Reporting Center</div>
            <div className="text-sm font-semibold mt-0.5">Generate sustainability reports for {city.name}</div>
          </div>
          {!isApiConnected && (
            <span className="text-[10px] text-muted-foreground bg-muted/40 rounded-full px-2.5 py-1 border border-border">
              Preview only — connect API to save &amp; download
            </span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/8 px-3 py-2.5 text-xs text-destructive">
            <AlertTriangle className="size-3.5 shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto underline" aria-label="Dismiss error">Dismiss</button>
          </div>
        )}

        {/* Report type grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {REPORT_TYPES.map(rt => (
            <button
              key={rt.id}
              onClick={() => setSelected(rt.id)}
              className={cn(
                "flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                selected === rt.id
                  ? "border-primary/50 bg-primary/8"
                  : "border-border bg-muted/20 hover:border-border/80 hover:bg-muted/40",
              )}
              aria-pressed={selected === rt.id}
            >
              <div className={cn(
                "size-7 rounded-lg grid place-items-center shrink-0 mt-0.5 transition-colors",
                selected === rt.id ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground",
              )}>
                <rt.icon className="size-3.5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{rt.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{rt.description}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1 border-t border-border flex-wrap">
          <button
            onClick={handlePreview}
            disabled={generateMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl aurora text-primary-foreground text-sm font-medium disabled:opacity-60 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {generateMutation.isPending
              ? <Loader2 className="size-4 animate-spin" />
              : <Eye className="size-4" />}
            {generateMutation.isPending ? "Generating…" : "Preview Report"}
          </button>

          {downloadedId && isApiConnected && (
            <button
              onClick={() => downloadMutation.mutate(downloadedId)}
              disabled={downloadMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-muted/30 text-sm font-medium hover:bg-muted/60 disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {downloadMutation.isPending
                ? <Loader2 className="size-4 animate-spin" />
                : downloadMutation.isSuccess
                ? <CheckCircle className="size-4 text-success" />
                : <Download className="size-4" />}
              Download PDF
            </button>
          )}

          <span className="text-[11px] text-muted-foreground ml-auto">
            {REPORT_TYPES.find(r => r.id === selected)?.label} selected
          </span>
        </div>
      </motion.div>

      {/* Preview modal */}
      <AnimatePresence>
        {previewOpen && (
          <ReportPreviewModal
            city={city}
            reportId={selected}
            generatedText={generatedText}
            renewableShare={renewableShare}
            greenCover={greenCover}
            onClose={() => setPreviewOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
