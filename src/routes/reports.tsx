import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { ProtectedRoute, AUTHORITY_ROLES } from "@/components/protected-route";
import { Panel, Pill } from "@/components/ui-bits";
import { Download, FileText, Search, Filter, Sparkles, Loader2, CheckCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { reportApi, complaintApi } from "@/lib/api/services.api";
import { generateAndDownloadPdf, ReportDownloadError } from "@/lib/download-file";
import { useCity } from "@/lib/city-context";
import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports Center — GreenGuard AI" }] }),
  component: () => (
    <AppLayout>
      <ProtectedRoute roles={AUTHORITY_ROLES}>
        <Reports />
      </ProtectedRoute>
    </AppLayout>
  ),
});

const AI_REPORT_TYPES = ["Daily", "Weekly", "Monthly", "City", "Sustainability"] as const;
type AIReportType = (typeof AI_REPORT_TYPES)[number];

interface GeneratedReport {
  _id?: string;
  title: string;
  executiveSummary: string;
  aqiAnalysis: string;
  waterQualityAnalysis: string;
  riskAssessment: string;
  keyFindings: string[];
  recommendations: string[];
  outlook: string;
}

function Reports() {
  const { t } = useTranslation("reports");
  const { city, isApiConnected } = useCity();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showGenerator, setShowGenerator] = useState(false);
  const [aiReportType, setAiReportType] = useState<AIReportType>("Daily");
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  // Per-item pending state for the report library grid below, mirroring the
  // pattern already used in the admin Reports Center page, so only the
  // clicked card shows a spinner rather than the whole list.
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const canGenerate = user?.role === "authority" || user?.role === "administrator";

  const { data: reportData, isLoading: reportsLoading } = useQuery({
    queryKey: ["reports", city.id],
    queryFn: () => reportApi.getAll({ cityId: city.id, limit: 20 }).then((r) => r.data),
    staleTime: 5 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["report-stats", city.id],
    queryFn: () => reportApi.getStats(city.id).then((r) => r.data),
    staleTime: 5 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const { data: complaintData, isLoading: complaintLoading } = useQuery({
    queryKey: ["reports-complaints-count", city.id],
    queryFn: () => complaintApi.getAll({ cityId: city.id, limit: 1 }).then((r) => r.data),
    staleTime: 5 * 60_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      reportApi
        .generateAI({ type: aiReportType, cityId: city.id, save: true })
        .then((r) => (r?.report ?? r?.data?.report ?? r?.data ?? r) as GeneratedReport),
    onSuccess: (data) => {
      setGeneratedReport(data);
      qc.invalidateQueries({ queryKey: ["reports", city.id] });
      qc.invalidateQueries({ queryKey: ["report-stats", city.id] });
    },
  });

  const rawReports: Array<{
    id?: string;
    _id?: string;
    title: string;
    type: string;
    pages?: number;
    fileSize?: string;
    size?: string;
    date?: string;
    createdAt?: string;
    summary?: string;
  }> = reportData?.reports ?? [];
  const reports = rawReports.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()));
  const stats = {
    total: statsData?.total,
    monthly: statsData?.monthly,
    compliance: statsData?.compliance,
  };
  const totalComplaints: number | undefined = (
    complaintData as { data?: { pagination?: { total?: number } } } | undefined
  )?.data?.pagination?.total;

  // Shared by both the "generated report" download button above the list
  // and each report card's Download button below — a single fetch-then-save
  // pipeline instead of two separately-drifting implementations. Failures
  // are surfaced via toast with an accurate reason (report couldn't be
  // retrieved vs. couldn't be saved to the device) instead of being
  // swallowed or shown as nothing at all.
  const handleDownloadReport = async (id: string | undefined, title: string) => {
    if (!id) {
      toast.error("This report can't be downloaded yet.");
      return;
    }
    setDownloadingId(id);
    try {
      await generateAndDownloadPdf(
        () => reportApi.download(id),
        `${title.replace(/[^a-z0-9]/gi, "_")}.pdf`,
        {
          generateFailed: "The report could not be retrieved. Please try again.",
          saveFailed: "The report was retrieved but could not be saved to your device.",
        },
      );
    } catch (err) {
      toast.error(err instanceof ReportDownloadError ? err.message : "Download failed. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 w-full">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {t("title")}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">{t("subtitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass rounded-lg flex items-center px-3 py-1.5 text-sm w-60">
            <Search className="size-3.5 text-muted-foreground mr-2" />
            <input
              placeholder={t("searchPlaceholder")}
              className="bg-transparent outline-none w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="glass rounded-lg px-3 py-2 text-sm inline-flex items-center gap-1.5">
            <Filter className="size-3.5" /> {t("filter")}
          </button>
          {canGenerate && (
            <button
              onClick={() => {
                setShowGenerator((v) => !v);
                setGeneratedReport(null);
              }}
              className="aurora text-primary-foreground rounded-lg px-3 py-2 text-sm inline-flex items-center gap-1.5"
            >
              <Sparkles className="size-3.5" /> {t("aiReport")}
            </button>
          )}
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(
          [
            [stats.total, t("stats.total"), statsLoading],
            [stats.monthly, t("stats.monthly"), statsLoading],
            [stats.compliance, t("stats.compliance"), statsLoading],
            [totalComplaints, t("stats.citizenReports"), complaintLoading],
          ] as [number | undefined, string, boolean][]
        ).map(([v, l, loading]) => (
          <div key={l} className="glass rounded-2xl p-5">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{l}</div>
            {loading ? (
              <div className="h-9 w-16 rounded-md bg-muted/60 animate-pulse mt-2" />
            ) : (
              <div className="text-3xl font-semibold tabular-nums mt-2">
                {v !== undefined ? String(v) : "—"}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* AI Report Generator */}
      {showGenerator && canGenerate && (
        <Panel
          eyebrow="AI Report Generator"
          title={
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Generate AI report · {city.name}
            </div>
          }
        >
          {!generatedReport ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Gemini will analyse current environmental data and generate a structured{" "}
                {aiReportType.toLowerCase()} report with executive summary, AQI analysis, water
                quality assessment, risk evaluation, key findings, and recommendations.
              </p>
              <div className="flex flex-wrap gap-2">
                {AI_REPORT_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setAiReportType(t)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${aiReportType === t ? "aurora text-primary-foreground border-transparent shadow-[var(--shadow-glow)]" : "border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending || !isApiConnected}
                  className="aurora text-primary-foreground rounded-lg px-5 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-60"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Generating with Gemini…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" /> Generate {aiReportType} report
                    </>
                  )}
                </button>
                {!isApiConnected && (
                  <p className="text-xs text-muted-foreground">Backend required for AI reports</p>
                )}
                {generateMutation.isError && (
                  <p className="text-sm text-destructive">
                    {t("aiGenerator.failed")}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-5 text-[var(--color-success)]" />
                <div className="font-semibold">{generatedReport.title}</div>
                <Pill tone="success">{t("generated")}</Pill>
              </div>

              <Section label={t("sections.executiveSummary")} text={generatedReport.executiveSummary} />

              <div className="grid md:grid-cols-3 gap-4">
                <Section label={t("sections.aqiAnalysis")} text={generatedReport.aqiAnalysis} />
                <Section label={t("sections.waterQuality")} text={generatedReport.waterQualityAnalysis} />
                <Section label={t("sections.riskAssessment")} text={generatedReport.riskAssessment} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                    {t("sections.keyFindings")}
                  </div>
                  <ul className="space-y-1.5">
                    {generatedReport.keyFindings.map((f, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                    {t("sections.recommendations")}
                  </div>
                  <ul className="space-y-1.5">
                    {generatedReport.recommendations.map((r, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="mt-1.5 size-1.5 rounded-full bg-[var(--color-success)] shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-xl bg-muted/40 p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("sections.outlook")}
                </div>
                <div className="text-sm mt-1">{generatedReport.outlook}</div>
              </div>

              <div className="flex gap-2">
                <button
                  className="text-xs aurora text-primary-foreground rounded-md px-3 py-1.5 inline-flex items-center gap-1.5 ml-auto disabled:opacity-60"
                  disabled={downloadingId === generatedReport._id}
                  onClick={() => handleDownloadReport(generatedReport._id, generatedReport.title)}
                >
                  {downloadingId === generatedReport._id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  {t("download")}
                </button>
              </div>
            </div>
          )}
        </Panel>
      )}

      {/* Report Library */}
      <Panel eyebrow={t("stats.compliance")} title={t("reportList")}>
        {reportsLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin" />
            {t("aiGenerator.description")}
          </div>
        ) : reports.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            {search
              ? t("noReportsSearch", { query: search })
              : !isApiConnected
                ? t("backendOffline")
                : t("noReports")}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reports.map((r) => (
              <div
                key={r.id ?? r._id}
                className="rounded-2xl border border-border p-5 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="size-10 rounded-xl aurora grid place-items-center text-primary-foreground">
                    <FileText className="size-5" />
                  </div>
                  <Pill tone="info">{r.type}</Pill>
                </div>
                <div className="mt-4 font-semibold tracking-tight">{r.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {r.pages ?? "—"} pages · {r.fileSize ?? r.size ?? "—"} ·{" "}
                  {r.date ??
                    (r.createdAt
                      ? new Date(r.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—")}
                </div>
                {r.summary && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{r.summary}</p>
                )}
                <div className="mt-4 flex gap-2">
                  <button className="text-xs glass rounded-md px-3 py-1.5">Preview</button>
                  <button
                    className="text-xs aurora text-primary-foreground rounded-md px-3 py-1.5 inline-flex items-center gap-1.5 ml-auto disabled:opacity-60"
                    disabled={downloadingId === (r.id ?? r._id)}
                    onClick={() => handleDownloadReport(r.id ?? r._id, r.title)}
                  >
                    {downloadingId === (r.id ?? r._id) ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Download className="size-3.5" />
                    )}
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Analytics summary */}
      <Panel eyebrow="Analytics" title="Environmental summary">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(
            [
              {
                l: "Compliance audits",
                v: statsLoading
                  ? null
                  : stats.compliance !== undefined
                    ? String(stats.compliance)
                    : "—",
                t: "Reports tagged Compliance",
              },
              {
                l: "Citizen reports",
                v: complaintLoading
                  ? null
                  : totalComplaints !== undefined
                    ? totalComplaints.toLocaleString()
                    : "—",
                t: `Filed for ${city.name}`,
              },
              {
                l: "Reports this month",
                v: statsLoading ? null : stats.monthly !== undefined ? String(stats.monthly) : "—",
                t: "Last 30 days",
              },
            ] as { l: string; v: string | null; t: string }[]
          ).map((s) => (
            <div key={s.l} className="rounded-xl bg-muted/40 p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {s.l}
              </div>
              {s.v === null ? (
                <div className="h-8 w-14 rounded-md bg-muted/60 animate-pulse mt-1" />
              ) : (
                <div className="text-2xl font-semibold tabular-nums mt-1">{s.v}</div>
              )}
              <div className="text-[11px] text-muted-foreground mt-0.5">{s.t}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  );
}
