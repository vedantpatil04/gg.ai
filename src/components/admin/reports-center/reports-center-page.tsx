/**
 * Phase 8 — Reports Center (polished)
 *
 * Changes vs original:
 * - Replaced animate-pulse divs with shared TableSkeleton
 * - Replaced bare error text with QueryError component
 * - Replaced bare EmptyState with NoReportsEmpty (actionable)
 * - Download errors show toast instead of silently failing
 * - Type filter moved to pill-style toggle row (easier on mobile)
 * - Added report count summary
 * - Improved responsive layout for the generate panel
 */

import { useState } from "react";
import { format } from "date-fns";
import {
  FileText,
  RefreshCw,
  Download,
  Loader2,
  Sparkles,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionTitle, Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { reportApi } from "@/lib/api/services.api";
import { useCity } from "@/lib/city-context";
import { TableSkeleton } from "@/components/shared/skeletons";
import { NoReportsEmpty, NoSearchResultsEmpty } from "@/components/shared/empty-states";
import { QueryError } from "@/components/shared/error-states";

const REPORT_TYPES = ["All", "Daily", "Weekly", "Monthly", "City", "Sustainability"] as const;
type ReportTypeFilter = (typeof REPORT_TYPES)[number];

interface Report {
  _id: string;
  title: string;
  type: string;
  cityId?: string;
  createdAt: string;
  updatedAt: string;
}

export function ReportsCenterPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ReportTypeFilter>("All");
  const [page, setPage] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [genType, setGenType] = useState<"Daily" | "Weekly" | "Monthly" | "City" | "Sustainability">("Monthly");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const qc = useQueryClient();
  const { city, isApiConnected } = useCity();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-reports", page, typeFilter],
    queryFn: () =>
      reportApi
        .getAll({ type: typeFilter === "All" ? undefined : typeFilter, page, limit: 20 })
        .then(
          (r) =>
            r.data as {
              reports: Report[];
              pagination: { page: number; limit: number; total: number; pages: number };
            },
        ),
    staleTime: 30_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const generateMutation = useMutation({
    mutationFn: () => reportApi.generateAI({ type: genType, cityId: city.id, save: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      toast.success("Report generated successfully.");
      setGenerating(false);
    },
    onError: () => toast.error("Failed to generate report. Please try again."),
  });

  const handleDownload = async (report: Report) => {
    setDownloadingId(report._id);
    try {
      const blob = await reportApi.download(report._id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.title.replace(/[^a-z0-9]/gi, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed. The report file may not be available.");
    } finally {
      setDownloadingId(null);
    }
  };

  const reports = (data?.reports ?? []).filter(
    (r) => !search.trim() || r.title.toLowerCase().includes(search.toLowerCase()),
  );
  const hasSearch = !!search.trim();

  return (
    <div className="px-4 md:px-6 py-6 space-y-5">
      <SectionTitle
        eyebrow="Intelligence"
        title="Reports Center"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => qc.invalidateQueries({ queryKey: ["admin-reports"] })}
            >
              <RefreshCw className="size-3.5 mr-1.5" />
              Refresh
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setGenerating((v) => !v)}>
              <Sparkles className="size-3.5" />
              Generate
            </Button>
          </div>
        }
      />

      {/* ── Generate panel ── */}
      {generating && (
        <div className="glass rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <h3 className="text-sm font-semibold">Generate AI Report</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Report Type</label>
              <select
                value={genType}
                onChange={(e) => setGenType(e.target.value as typeof genType)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Report type"
              >
                {(["Daily", "Weekly", "Monthly", "City", "Sustainability"] as const).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">City</label>
              <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground h-9 flex items-center">
                {city.name}
              </div>
            </div>
            <div className="flex gap-2 pb-0.5">
              <Button
                size="sm"
                disabled={generateMutation.isPending}
                onClick={() => generateMutation.mutate()}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5 mr-1.5" />
                )}
                Generate for {city.name}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setGenerating(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports…"
              className="pl-8 h-9"
              aria-label="Search reports"
            />
            {search && (
              <button
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Type filter pills */}
        <div className="flex gap-1.5 flex-wrap">
          {REPORT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setPage(1); }}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                typeFilter === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
              )}
              aria-label={`Filter by ${t}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── Report list ── */}
      <div className="glass rounded-2xl p-4 md:p-5">
        {data?.pagination && (
          <p className="text-xs text-muted-foreground mb-3">
            {data.pagination.total} report{data.pagination.total !== 1 ? "s" : ""}
          </p>
        )}

        {isLoading ? (
          <TableSkeleton rows={5} cols={3} />
        ) : isError ? (
          <QueryError
            message="Couldn't load reports. Please try refreshing."
            onRetry={() => refetch()}
          />
        ) : reports.length === 0 ? (
          hasSearch ? (
            <NoSearchResultsEmpty query={search} onClear={() => setSearch("")} />
          ) : (
            <NoReportsEmpty onGenerate={() => setGenerating(true)} />
          )
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <div
                key={r._id}
                className="flex items-center gap-3 sm:gap-4 p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(r.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    {r.cityId && <span className="text-muted-foreground/60"> · {r.cityId}</span>}
                  </div>
                </div>
                <Pill tone="info" className="hidden sm:flex">{r.type}</Pill>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground shrink-0"
                  aria-label={`Download ${r.title}`}
                  disabled={downloadingId === r._id}
                  onClick={() => handleDownload(r)}
                >
                  {downloadingId === r._id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              Page {data.pagination.page} of {data.pagination.pages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-3.5 mr-1" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                Next
                <ChevronRight className="size-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
