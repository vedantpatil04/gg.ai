import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bug, Plus, ChevronLeft, ChevronRight,
  Loader2, RefreshCw, AlertCircle, Search,
  Filter, Calendar, X, Shield, Monitor,
  Globe, Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DUR_MD, DUR_SM, EASE_OUT, HOVER_LIFT_SM, TAP_PRESS_SM } from "@/lib/motion";
import { SectionHeader, EmptyState } from "../help-card";
import {
  FormField, FormInput, FormTextarea, FormSelect, SuccessState,
} from "../support/support-ui";
import {
  BUG_SEVERITY_STYLE,
  BUG_CATEGORIES, PLATFORMS, BROWSERS, DEVICES,
} from "../support/support-data";
import { useBugReports } from "../support/support-store";
import { useBugList, useBugDetail } from "../support/support-store";
import type { BugReportDTO, BugStatus, BugSeverity } from "@/lib/api/support.api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BUG_STATUS_STYLE: Record<BugStatus, { label: string; color: string }> = {
  open:         { label: "Open",         color: "var(--color-info)"              },
  acknowledged: { label: "Acknowledged", color: "var(--color-warning)"           },
  fixed:        { label: "Fixed",        color: "var(--color-success)"           },
  wontfix:      { label: "Won't Fix",    color: "var(--color-muted-foreground)"  },
  resolved:     { label: "Resolved",     color: "var(--color-success)"           },
  reopened:     { label: "Reopened",     color: "var(--color-destructive)"       },
};

function timeAgo(iso: string): string {
  const d   = Date.now() - new Date(iso).getTime();
  const min = Math.floor(d / 60000);
  if (min < 2)  return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function shortId(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
}

type BugView = "list" | "submit" | "detail";

// ─── Bug Status Badge ─────────────────────────────────────────────────────────

function BugStatusBadge({ status }: { status: BugStatus }) {
  const s = BUG_STATUS_STYLE[status];
  return (
    <span
      className="inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full"
      style={{
        color:      s.color,
        background: `color-mix(in oklab, ${s.color} 10%, transparent)`,
      }}
    >
      {s.label}
    </span>
  );
}

function BugSeverityBadge({ severity }: { severity: BugSeverity }) {
  const s = BUG_SEVERITY_STYLE[severity];
  return (
    <span
      className="inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full border"
      style={{
        color:        s.color,
        borderColor:  `color-mix(in oklab, ${s.color} 30%, transparent)`,
        background:   `color-mix(in oklab, ${s.color} 8%, transparent)`,
      }}
    >
      {s.label}
    </span>
  );
}

// ─── Bug Card ─────────────────────────────────────────────────────────────────

function BugCard({
  report,
  onClick,
}: {
  report:  BugReportDTO;
  onClick: () => void;
}) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileHover={{ y: -1, transition: { duration: 0.12 } }}
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border bg-background p-4 hover:border-primary/25 transition-colors duration-200 group"
    >
      <div className="flex items-start gap-4">
        <div className="size-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
          <Bug className="size-4 text-destructive/70" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-mono text-muted-foreground/60">{shortId(report._id)}</span>
            <BugStatusBadge status={report.status} />
            <BugSeverityBadge severity={report.severity} />
          </div>
          <h4 className="text-sm font-semibold mb-1 group-hover:text-primary transition-colors duration-150 line-clamp-2 leading-snug">
            {report.title}
          </h4>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <span>{report.category}</span>
            {report.platform && <><span>·</span><span>{report.platform}</span></>}
            <span>·</span>
            <span>Submitted {timeAgo(report.createdAt)}</span>
          </div>
        </div>

        <ChevronRight className="size-4 text-muted-foreground/30 shrink-0 mt-0.5" />
      </div>
    </motion.button>
  );
}

// ─── Bug Detail ───────────────────────────────────────────────────────────────

function BugDetail({
  bugId,
  onBack,
  onNew,
}: {
  bugId:  string;
  onBack: () => void;
  onNew:  () => void;
}) {
  const { data: report, isLoading, isError } = useBugDetail(bugId);

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  );

  if (isError || !report) return (
    <div className="flex flex-col items-center py-16 gap-3">
      <AlertCircle className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Report not found or could not be loaded.</p>
      <button onClick={onBack} className="px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted">Go back</button>
    </div>
  );

  const statusStyle = BUG_STATUS_STYLE[report.status];

  // Status timeline
  const timeline: { key: BugStatus; label: string }[] = [
    { key: "open",         label: "Submitted"    },
    { key: "acknowledged", label: "Acknowledged" },
    { key: "fixed",        label: "Fixed"        },
  ];
  const currentIdx = timeline.findIndex(t => t.key === report.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_MD, ease: EASE_OUT }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 group"
      >
        <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Back to Bug Reports
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main */}
        <div className="xl:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-5 border-b border-border">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[10px] font-mono text-muted-foreground">{shortId(report._id)}</span>
                <BugStatusBadge status={report.status} />
                <BugSeverityBadge severity={report.severity} />
              </div>
              <h2 className="text-xl font-bold">{report.title}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                <span>{report.category}</span>
                {report.platform && <><span>·</span><span>{report.platform}</span></>}
                <span>·</span>
                <Calendar className="size-3" />
                <span>Submitted {timeAgo(report.createdAt)}</span>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Reproduction steps */}
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">Steps to Reproduce</div>
                <div className="rounded-xl bg-muted/40 p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono text-xs text-foreground">
                  {report.steps}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">Expected Result</div>
                  <div className="rounded-xl bg-success/5 border border-success/15 p-3 text-sm text-foreground leading-relaxed">
                    {report.expected}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">Actual Result</div>
                  <div className="rounded-xl bg-destructive/5 border border-destructive/15 p-3 text-sm text-foreground leading-relaxed">
                    {report.actual}
                  </div>
                </div>
              </div>

              {/* Environment */}
              {(report.platform || report.browser || report.device) && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">Environment</div>
                  <div className="flex flex-wrap gap-2">
                    {report.platform && (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-border text-muted-foreground">
                        <Monitor className="size-3" /> {report.platform}
                      </span>
                    )}
                    {report.browser && (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-border text-muted-foreground">
                        <Globe className="size-3" /> {report.browser}
                      </span>
                    )}
                    {report.device && (
                      <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-border text-muted-foreground">
                        <Smartphone className="size-3" /> {report.device}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Administrator responses */}
              {report.comments && report.comments.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">Conversation</div>
                  <div className="space-y-2.5">
                    {report.comments.map(c => (
                      <div
                        key={c._id}
                        className={cn(
                          "rounded-xl p-3 text-xs leading-relaxed",
                          c.authorRole === "administrator" ? "bg-primary/5 border border-primary/15" : "bg-muted/40",
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">
                            {c.isSystem ? "GreenGuard" : c.authorRole === "administrator" ? `${c.authorName} · Administrator` : c.authorName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                        </div>
                        <p className="text-foreground/90">{c.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status timeline */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">Investigation Status</div>
            <div className="space-y-3">
              {timeline.map((step, idx) => {
                const isDone   = idx < currentIdx;
                const isActive = idx === currentIdx;
                const color    = isActive ? BUG_STATUS_STYLE[step.key].color : isDone ? "var(--color-success)" : "var(--color-muted-foreground)";
                return (
                  <div key={step.key} className="flex items-center gap-2.5 text-xs">
                    <div
                      className={cn("size-6 rounded-full flex items-center justify-center shrink-0", isDone ? "bg-success/20" : isActive ? "" : "bg-muted")}
                      style={isActive ? { background: `color-mix(in oklab, ${color} 15%, transparent)` } : {}}
                    >
                      {isDone
                        ? <div className="size-2 rounded-full bg-success" />
                        : <div className="size-2 rounded-full" style={{ background: isActive ? color : "var(--color-border)" }} />
                      }
                    </div>
                    <span className={cn(isActive ? "font-semibold" : isDone ? "text-muted-foreground line-through" : "text-muted-foreground")}>
                      {step.label}
                    </span>
                    {isActive && (
                      <span className="text-[9px] font-bold ml-auto" style={{ color }}>{statusStyle.label}</span>
                    )}
                  </div>
                );
              })}
              {report.status === "wontfix" && (
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground mt-1">
                  <div className="size-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <X className="size-3 text-muted-foreground" />
                  </div>
                  <span className="font-semibold text-muted-foreground">Won't Fix</span>
                </div>
              )}
              {(report.status === "resolved" || report.status === "reopened") && (
                <div className="flex items-center gap-2.5 text-xs mt-1">
                  <div className="size-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `color-mix(in oklab, ${statusStyle.color} 15%, transparent)` }}>
                    <div className="size-2 rounded-full" style={{ background: statusStyle.color }} />
                  </div>
                  <span className="font-semibold" style={{ color: statusStyle.color }}>{statusStyle.label} by administrator</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">Report Details</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span className="font-semibold">{report.category}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Severity</span><BugSeverityBadge severity={report.severity} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span><BugStatusBadge status={report.status} /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">ID</span><span className="font-mono text-[10px]">{shortId(report._id)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Updated</span><span>{timeAgo(report.updatedAt)}</span></div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">Found another bug?</div>
            <button onClick={onNew} className="w-full text-xs py-2 rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-center gap-1.5">
              <Plus className="size-3.5" /> Submit new report
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Submit Bug Form ──────────────────────────────────────────────────────────

function SubmitBugForm({ onBack }: { onBack: () => void }) {
  const { submitted, isSubmitting, submitBug, reset } = useBugReports();

  const [title,    setTitle]    = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [platform, setPlatform] = useState("");
  const [browser,  setBrowser]  = useState("");
  const [device,   setDevice]   = useState("");
  const [steps,    setSteps]    = useState("");
  const [expected, setExpected] = useState("");
  const [actual,   setActual]   = useState("");
  const [errors,   setErrors]   = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()    || title.length    < 5)  e.title    = "Title must be at least 5 characters";
    if (!category)                                 e.category = "Please select a category";
    if (!severity)                                 e.severity = "Please select a severity";
    if (!steps.trim()    || steps.length    < 10)  e.steps    = "Steps must be at least 10 characters";
    if (!expected.trim() || expected.length < 5)   e.expected = "Expected result must be at least 5 characters";
    if (!actual.trim()   || actual.length   < 5)   e.actual   = "Actual result must be at least 5 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate() || isSubmitting) return;
    submitBug({ title, category, severity: severity.toLowerCase() as BugSeverity, browser, device, steps, expected, actual, platform });
  };

  const handleReset = () => {
    reset();
    setTitle(""); setCategory(""); setSeverity(""); setPlatform("");
    setBrowser(""); setDevice(""); setSteps(""); setExpected(""); setActual(""); setErrors({});
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <SuccessState
          title="Bug Report Submitted!"
          description="Thank you for helping improve GreenGuard. Our engineering team will investigate and you'll receive an email update."
          detail="You'll receive a confirmation and can track status in your bug report list."
          onReset={handleReset}
          resetLabel="Submit Another Report"
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_MD, ease: EASE_OUT }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 group"
      >
        <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Back to Bug Reports
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="text-lg font-bold">Submit a Bug Report</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Report an issue so our team can investigate and fix it.</p>
            </div>
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Bug Title" required className="sm:col-span-2">
                  <FormInput value={title} onChange={setTitle} placeholder="One-line summary of the issue" />
                  {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
                </FormField>

                <FormField label="Category" required>
                  <FormSelect value={category} onChange={setCategory} options={BUG_CATEGORIES} placeholder="Affected area" />
                  {errors.category && <p className="text-xs text-destructive mt-1">{errors.category}</p>}
                </FormField>

                <FormField label="Severity" required>
                  <FormSelect value={severity} onChange={setSeverity} options={["Minor", "Major", "Critical", "Blocker"]} placeholder="How severe is the impact?" />
                  {errors.severity && <p className="text-xs text-destructive mt-1">{errors.severity}</p>}
                </FormField>

                <FormField label="Platform">
                  <FormSelect value={platform} onChange={setPlatform} options={PLATFORMS} placeholder="Affected platform (optional)" />
                </FormField>

                <FormField label="Browser">
                  <FormSelect value={browser} onChange={setBrowser} options={BROWSERS} placeholder="Browser (optional)" />
                </FormField>

                <FormField label="Device">
                  <FormSelect value={device} onChange={setDevice} options={DEVICES} placeholder="Device type (optional)" />
                </FormField>

                <FormField label="Steps to Reproduce" required className="sm:col-span-2">
                  <FormTextarea
                    value={steps}
                    onChange={setSteps}
                    placeholder={"1. Navigate to…\n2. Click on…\n3. Observe that…"}
                    rows={5}
                  />
                  {errors.steps && <p className="text-xs text-destructive mt-1">{errors.steps}</p>}
                </FormField>

                <FormField label="Expected Result" required>
                  <FormTextarea value={expected} onChange={setExpected} placeholder="What should have happened?" rows={3} />
                  {errors.expected && <p className="text-xs text-destructive mt-1">{errors.expected}</p>}
                </FormField>

                <FormField label="Actual Result" required>
                  <FormTextarea value={actual} onChange={setActual} placeholder="What actually happened instead?" rows={3} />
                  {errors.actual && <p className="text-xs text-destructive mt-1">{errors.actual}</p>}
                </FormField>
              </div>

              {/* Attachment note */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border bg-muted/20 text-xs text-muted-foreground">
                <Bug className="size-4 shrink-0" />
                Screenshot and file attachment will be available in a future update.
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <motion.button
                  whileHover={HOVER_LIFT_SM} whileTap={TAP_PRESS_SM}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? <><Loader2 className="size-4 animate-spin" />Submitting…</>
                    : <><Bug className="size-4" />Submit Bug Report</>
                  }
                </motion.button>
                <button onClick={onBack} className="px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">Severity Guide</div>
            {(["minor", "major", "critical", "blocker"] as const).map(s => {
              const st = BUG_SEVERITY_STYLE[s];
              return (
                <div key={s} className="flex items-start gap-2.5 py-2 border-b border-border/40 last:border-0">
                  <div className="size-2 rounded-full shrink-0 mt-1.5" style={{ background: st.color }} />
                  <div>
                    <div className="text-xs font-semibold" style={{ color: st.color }}>{st.label}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {s === "minor"    ? "Cosmetic or low-impact issue"
                       : s === "major"  ? "Feature impaired, workaround exists"
                       : s === "critical" ? "Major feature broken, no workaround"
                       : "Platform unusable or data at risk"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">Writing Good Reports</div>
            <ul className="space-y-2">
              {[
                "Include exact steps to reproduce",
                "Be specific about what went wrong",
                "Add browser/device context",
                "Note the version or environment",
                "One bug per report",
              ].map(tip => (
                <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <div className="size-1.5 rounded-full bg-primary/50 shrink-0 mt-1.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Bug Report List ──────────────────────────────────────────────────────────

function BugList({
  onSelect,
  onNew,
  onBack,
}: {
  onSelect: (id: string) => void;
  onNew:    () => void;
  onBack:   () => void;
}) {
  const [statusFilter,   setStatusFilter]   = useState<BugStatus | "">("");
  const [severityFilter, setSeverityFilter] = useState<BugSeverity | "">("");
  const [search,         setSearch]         = useState("");

  const apiFilters = useMemo(() => {
    const f: Parameters<typeof useBugList>[0] = {};
    if (statusFilter)   f.status   = statusFilter;
    if (severityFilter) f.severity = severityFilter;
    return f;
  }, [statusFilter, severityFilter]);

  const { data, isLoading, isError, refetch } = useBugList(apiFilters);
  const reports = data?.reports ?? [];

  // Client-side search
  const filtered = useMemo(() => {
    if (!search.trim()) return reports;
    const q = search.toLowerCase();
    return reports.filter(r => r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
  }, [reports, search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_MD, ease: EASE_OUT }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 group"
      >
        <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Back to Bug Reports
      </button>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h2 className="text-xl font-bold">My Bug Reports</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Track the status of your submitted reports.</p>
          </div>
          <motion.button
            whileHover={HOVER_LIFT_SM} whileTap={TAP_PRESS_SM}
            onClick={onNew}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shrink-0 self-start sm:self-auto"
          >
            <Plus className="size-3.5" /> New Report
          </motion.button>
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-2.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all group">
            <Search className="size-4 text-muted-foreground shrink-0 group-focus-within:text-primary" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search your bug reports…"
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
              aria-label="Search bug reports"
            />
            {search && <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground" aria-label="Clear"><X className="size-3.5" /></button>}
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as BugStatus | "")}
            className="px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground shrink-0"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="fixed">Fixed</option>
            <option value="wontfix">Won't Fix</option>
          </select>
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as BugSeverity | "")}
            className="px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground shrink-0"
            aria-label="Filter by severity"
          >
            <option value="">All severities</option>
            <option value="minor">Minor</option>
            <option value="major">Major</option>
            <option value="critical">Critical</option>
            <option value="blocker">Blocker</option>
          </select>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Loading your reports…</span>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center py-12 gap-3">
            <AlertCircle className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Failed to load bug reports.</p>
            <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted">
              <RefreshCw className="size-3.5" /> Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && (
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyState
                  icon={search ? Search : Bug}
                  title={search ? "No matching reports" : "No bug reports yet"}
                  description={search ? `No results for "${search}"` : "Submit your first bug report to help improve GreenGuard."}
                  action={
                    search ? (
                      <button onClick={() => setSearch("")} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">Clear Search</button>
                    ) : (
                      <button onClick={onNew} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">Submit First Report</button>
                    )
                  }
                />
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {filtered.map(r => <BugCard key={r._id} report={r} onClick={() => onSelect(r._id)} />)}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

// ─── Bug Report Hub ───────────────────────────────────────────────────────────

function BugHero({ onSubmit, onList }: { onSubmit: () => void; onList: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_MD, ease: EASE_OUT }}
      className="relative rounded-2xl overflow-hidden border border-border bg-card"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 size-64 rounded-full bg-destructive/5 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 size-48 rounded-full bg-warning/5 blur-3xl" />
      </div>
      <div className="relative p-6 md:p-10">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20">
              <Bug className="size-3 text-destructive" />
              <span className="text-[10px] uppercase tracking-[0.22em] text-destructive font-semibold">Bug Report Center</span>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Found an issue?</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mb-8">
            Report bugs to our engineering team. Every submission is triaged and tracked. You'll receive updates as the issue progresses.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <motion.button
              whileHover={HOVER_LIFT_SM} whileTap={TAP_PRESS_SM}
              onClick={onSubmit}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Bug className="size-4" /> Report a Bug
            </motion.button>
            <motion.button
              whileHover={HOVER_LIFT_SM} whileTap={TAP_PRESS_SM}
              onClick={onList}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted transition-colors"
            >
              <Filter className="size-4" /> My Reports
            </motion.button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 mt-8 border-t border-border">
            {(["minor", "major", "critical", "blocker"] as const).map(s => {
              const st = BUG_SEVERITY_STYLE[s];
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full shrink-0" style={{ background: st.color }} />
                  <div className="text-xs font-medium">{st.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function BugReportPage() {
  const [view,      setView]      = useState<BugView>("list");
  const [activeBug, setActiveBug] = useState<string | null>(null);

  return (
    <div className="p-4 md:p-6 xl:p-8 max-w-none space-y-8 pb-16">
      <AnimatePresence mode="wait">
        {view === "list" && (
          <motion.div key="list-hub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: DUR_SM }} className="space-y-8">
            <BugHero onSubmit={() => setView("submit")} onList={() => {}} />
            <section>
              <SectionHeader
                eyebrow="Your Reports"
                title="Submitted Bug Reports"
                description="Track the progress of your reported issues"
                action={
                  <motion.button
                    whileHover={HOVER_LIFT_SM} whileTap={TAP_PRESS_SM}
                    onClick={() => setView("submit")}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    <Plus className="size-3" /> New Report
                  </motion.button>
                }
              />
              <BugListInline onSelect={id => { setActiveBug(id); setView("detail"); }} onNew={() => setView("submit")} />
            </section>
          </motion.div>
        )}

        {view === "submit" && (
          <motion.div key="submit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: DUR_SM }}>
            <SubmitBugForm onBack={() => setView("list")} />
          </motion.div>
        )}

        {view === "detail" && activeBug && (
          <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: DUR_SM }}>
            <BugDetail bugId={activeBug} onBack={() => { setActiveBug(null); setView("list"); }} onNew={() => setView("submit")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Inline bug list (used on hub overview) ───────────────────────────────────

function BugListInline({ onSelect, onNew }: { onSelect: (id: string) => void; onNew: () => void }) {
  const { data, isLoading, isError, refetch } = useBugList();
  const reports = data?.reports ?? [];

  if (isLoading) return (
    <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" /><span className="text-sm">Loading…</span>
    </div>
  );

  if (isError) return (
    <div className="flex flex-col items-center py-10 gap-3">
      <AlertCircle className="size-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Failed to load reports.</p>
      <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted">
        <RefreshCw className="size-3" /> Retry
      </button>
    </div>
  );

  if (reports.length === 0) return (
    <EmptyState
      icon={Shield}
      title="No bug reports yet"
      description="When you submit bug reports, you'll be able to track their status here."
      action={<button onClick={onNew} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">Submit First Report</button>}
    />
  );

  return (
    <div className="space-y-3">
      {reports.slice(0, 5).map(r => (
        <BugCard key={r._id} report={r} onClick={() => onSelect(r._id)} />
      ))}
      {reports.length > 5 && (
        <button
          onClick={() => {}}
          className="w-full text-center text-xs text-muted-foreground py-2 hover:text-primary transition-colors"
        >
          {reports.length - 5} more report{reports.length - 5 !== 1 ? "s" : ""} — use filters to view all
        </button>
      )}
    </div>
  );
}
