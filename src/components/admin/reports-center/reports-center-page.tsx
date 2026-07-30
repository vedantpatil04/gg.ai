import { useState } from "react";
import { format } from "date-fns";
import { FileText, RefreshCw, Download, Loader2, Sparkles, Search, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionTitle, EmptyState, Pill } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import { reportApi } from "@/lib/api/services.api";
import { useCity } from "@/lib/city-context";

const REPORT_TYPES = [
  { value: "", label: "All Types" },
  { value: "Daily", label: "Daily" },
  { value: "Weekly", label: "Weekly" },
  { value: "Monthly", label: "Monthly" },
  { value: "City", label: "City" },
  { value: "Sustainability", label: "Sustainability" },
];

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
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [genType, setGenType] = useState<"Daily" | "Weekly" | "Monthly" | "City" | "Sustainability">("Monthly");

  const qc = useQueryClient();
  const { city, isApiConnected } = useCity();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-reports", page, typeFilter],
    queryFn: () => reportApi.getAll({ type: typeFilter || undefined, page, limit: 20 }).then(r => r.data as { reports: Report[]; pagination: { page: number; limit: number; total: number; pages: number } }),
    staleTime: 30_000,
    enabled: isApiConnected,
    throwOnError: false,
  });

  const generateMutation = useMutation({
    mutationFn: () => reportApi.generateAI({ type: genType, cityId: city.id, save: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-reports"] }); toast("Report generated."); setGenerating(false); },
    onError: () => toast("Failed to generate report."),
  });

  const reports = (data?.reports ?? []).filter(r =>
    !search.trim() || r.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="px-4 md:px-6 py-6 space-y-5">
      <SectionTitle
        eyebrow="Intelligence"
        title="Reports Center"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["admin-reports"] })}>
              <RefreshCw className="size-3.5 mr-1.5" />Refresh
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setGenerating(true)}>
              <Sparkles className="size-3.5" />Generate
            </Button>
          </div>
        }
      />

      {generating && (
        <div className="glass rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <h3 className="text-sm font-semibold">Generate AI Report</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Report Type</label>
              <select value={genType} onChange={e => setGenType(e.target.value as typeof genType)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30">
                {(["Daily", "Weekly", "Monthly", "City", "Sustainability"] as const).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2 mt-4">
              <Button size="sm" disabled={generateMutation.isPending} onClick={() => generateMutation.mutate()}>
                {generateMutation.isPending ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Sparkles className="size-3.5 mr-1.5" />}
                Generate for {city.name}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setGenerating(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reports…" className="pl-8 h-9" />
          {search && <button className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}><X className="size-3.5" /></button>}
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 h-9">
          {REPORT_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="glass rounded-2xl p-4 md:p-5">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />)}</div>
        ) : isError ? (
          <p className="text-sm text-destructive text-center py-10">Couldn't load reports.</p>
        ) : reports.length === 0 ? (
          <EmptyState icon={<FileText className="size-4" />} title="No reports found."
            description="Generate your first AI report to get started."
            action={<Button size="sm" onClick={() => setGenerating(true)}><Sparkles className="size-3.5 mr-1.5" />Generate Report</Button>} />
        ) : (
          <div className="space-y-2">
            {reports.map(r => (
              <div key={r._id} className="flex items-center gap-4 p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors">
                <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(r.createdAt), "MMM d, yyyy 'at' h:mm a")}</div>
                </div>
                <Pill tone="info">{r.type}</Pill>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => reportApi.download(r._id).then(blob => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${r.title}.pdf`; a.click(); }).catch(() => toast("Download failed."))}>
                  <Download className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {data && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <span className="text-xs text-muted-foreground">Page {data.pagination.page} of {data.pagination.pages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= data.pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
