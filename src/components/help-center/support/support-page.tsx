import { useState, useMemo, lazy, Suspense } from "react";
const BugReportPage = lazy(() =>
  import("../bug-reports/bug-report-page").then(m => ({ default: m.BugReportPage }))
);
import { motion, AnimatePresence } from "framer-motion";
import {
  HeadphonesIcon, Search, Clock, CheckCircle2, Star,
  AlertTriangle, TicketIcon, Bug, Lightbulb, MessageSquarePlus,
  Users, BarChart3, ThumbsUp, Phone, Mail, X, ChevronRight,
  Shield, ArrowRight, Check, ChevronLeft, Circle,
  ExternalLink, MapPin, Loader2, RefreshCw, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FADE_UP, STAGGER, DUR_MD, DUR_SM, EASE_OUT,
  HOVER_LIFT_SM, TAP_PRESS_SM,
} from "@/lib/motion";
import { SectionHeader, EmptyState } from "../help-card";
import {
  StatusBadge, PriorityBadge, FormField, FormInput, FormTextarea,
  FormSelect, ContactCard, StarRating, NpsSlider,
  SuccessState, SupportSection, AvailabilityDot,
} from "./support-ui";
import {
  CONTACT_METHODS, AUTHORITY_DIRECTORY,
  EMERGENCY_TYPES, SUPPORT_CATEGORIES, DEPARTMENTS, ENVIRONMENTS,
  BUG_CATEGORIES, PLATFORMS, BROWSERS, DEVICES,
  TICKET_STATUS_STYLE, FEATURE_STATUS_STYLE,
} from "./support-data";
import type { TicketStatus } from "./support-data";
import {
  useTickets, useTicketStats, useFeatureRequests, useBugReports, useFeedback,
  type NewTicketInput,
} from "./support-store";
import type { SupportTicketDTO } from "@/lib/api/support.api";
import { KB_ARTICLES } from "../kb/kb-data";
import { HelpAIPanel, AITicketDrafter, DuplicateTicketWarning } from "../ai/help-ai-panel";
import { TUTORIALS } from "../tutorials/tut-data";
import { TicketDetailSheet } from "./ticket-detail-sheet";

// ─── 1. Hero ───────────────────────────────────────────────────────────────────

function SupportHero({ onSearch, onCreateTicket }: {
  onSearch: (q: string) => void;
  onCreateTicket: () => void;
}) {
  const [query, setQuery] = useState("");
  const { data: stats } = useTicketStats();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_MD, ease: EASE_OUT }}
      className="relative rounded-2xl overflow-hidden border border-border bg-card"
    >
      {/* Glass backdrop blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 size-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-info/4 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage: "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* Emergency banner */}
      <div className="relative border-b border-destructive/20 bg-destructive/6 px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <AlertTriangle className="size-4 text-destructive" />
          <span className="text-xs font-semibold text-destructive uppercase tracking-wide">Environmental Emergency</span>
        </div>
        <p className="text-xs text-muted-foreground flex-1">
          Immediate environmental threat? Call <span className="font-bold text-foreground">1-800-ENV-HELP</span> — available 24/7.
        </p>
        <a
          href="tel:18003684357"
          className="text-xs font-bold text-destructive hover:underline shrink-0 flex items-center gap-1"
        >
          <Phone className="size-3" /> Call Now
        </a>
      </div>

      {/* Main hero content */}
      <div className="relative p-6 md:p-10">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <HeadphonesIcon className="size-3 text-primary" />
              <span className="text-[10px] uppercase tracking-[0.22em] text-primary font-semibold">Enterprise Support Center</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-success font-medium">
              <Circle className="size-1.5 fill-success text-success animate-pulse" />
              All systems operational
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-4">
            How can we help you today?
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mb-8">
            Search our documentation before contacting support — most issues are resolved instantly. For complex cases, our enterprise support team responds within guaranteed SLA windows.
          </p>

          {/* Search bar */}
          <div className="flex flex-col sm:flex-row gap-2 mb-8">
            <div className="flex-1 flex items-center gap-3 rounded-xl border border-border bg-background/80 backdrop-blur-sm px-4 py-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200 group">
              <Search className="size-4 text-muted-foreground shrink-0 group-focus-within:text-primary transition-colors" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && query.trim()) onSearch(query.trim()); }}
                placeholder="Search before contacting support…"
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
              />
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={HOVER_LIFT_SM} whileTap={TAP_PRESS_SM}
                onClick={() => query.trim() && onSearch(query.trim())}
                className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Search
              </motion.button>
              <motion.button
                whileHover={HOVER_LIFT_SM} whileTap={TAP_PRESS_SM}
                onClick={onCreateTicket}
                className="flex-1 sm:flex-none flex items-center gap-2 px-5 py-3 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted transition-colors"
              >
                <TicketIcon className="size-4" />
                <span className="hidden sm:inline">New Ticket</span>
                <span className="sm:hidden">Ticket</span>
              </motion.button>
            </div>
          </div>

          {/* SLA stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-4 gap-4 pt-6 border-t border-border">
            {[
              { value: stats?.avgResponseTime   ?? "—",    label: "Avg Response",    icon: Clock        },
              { value: stats ? `${stats.satisfactionScore}/5` : "—", label: "Satisfaction", icon: Star },
              { value: stats?.resolutionRate    ?? "—",    label: "Resolution Rate", icon: CheckCircle2 },
              { value: "24/7",                              label: "Emergency Support", icon: Shield     },
            ].map(({ value, label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-base font-bold tabular-nums">{value}</div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── 2. Contact Support ────────────────────────────────────────────────────────

function ContactSupport({ onCreateTicket }: { onCreateTicket: () => void }) {
  return (
    <section>
      <SectionHeader
        eyebrow="Get Help"
        title="Contact Support"
        description="Choose how you'd like to connect with our team"
      />
      <motion.div
        variants={STAGGER(0.05, 0.05)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xl:gap-4"
      >
        {CONTACT_METHODS.map(method => (
          <motion.div key={method.id} variants={FADE_UP}>
            <ContactCard
              method={method}
              onClick={method.id === "ticket" ? onCreateTicket : () => {}}
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ─── 3. Create Ticket Form ─────────────────────────────────────────────────────

function CreateTicketForm({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: (id: string) => void;
}) {
  const { createTicket, isCreating } = useTickets();
  const [subject, setSubject]         = useState("");
  const [category, setCategory]       = useState("");
  const [priority, setPriority]       = useState<"low" | "medium" | "high" | "critical">("medium");
  const [description, setDescription] = useState("");
  const [department, setDepartment]   = useState("");
  const [environment, setEnvironment] = useState("");
  const [browser, setBrowser]         = useState("");
  const [device, setDevice]           = useState("");
  const [errors, setErrors]           = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!subject.trim())     e.subject = "Subject is required";
    if (!category)           e.category = "Category is required";
    if (!description.trim()) e.description = "Description is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    createTicket({ subject, category, priority, description, department, environment })
      .then(result => onSuccess(result.ticket._id))
      .catch(() => {});
  };

  const suggestions = useMemo(() => {
    if (!category) return [];
    const kw = category.toLowerCase().split(" ")[0];
    const articles = KB_ARTICLES.filter(a =>
      a.tags.some(t => t.toLowerCase().includes(kw)) ||
      a.categoryId.toLowerCase().includes(kw)
    ).slice(0, 3);
    const tutorials = TUTORIALS.filter(t =>
      t.tags.some(tag => tag.toLowerCase().includes(kw)) ||
      t.categoryId.toLowerCase().includes(kw)
    ).slice(0, 2);
    return [
      ...articles.map(a  => ({ type: "article"  as const, title: a.title  })),
      ...tutorials.map(t => ({ type: "tutorial" as const, title: t.title  })),
    ];
  }, [category]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_MD, ease: EASE_OUT }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 group"
      >
        <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Back to Support Center
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Form */}
        <div className="xl:col-span-2 space-y-5">
          <div>
            <h2 className="text-xl font-bold mb-1">Create Support Ticket</h2>
            <p className="text-sm text-muted-foreground">Describe your issue and our team will respond within the guaranteed SLA window.</p>
          </div>

          {/* AI Ticket Drafter */}
          <AITicketDrafter
            onApplyDraft={draft => {
              if (draft.subject)     setSubject(draft.subject);
              if (draft.category)    setCategory(draft.category);
              if (draft.priority)    setPriority(draft.priority as typeof priority);
              if (draft.department)  setDepartment(draft.department);
              if (draft.environment) setEnvironment(draft.environment);
              if (draft.description) setDescription(
                [draft.description, draft.stepsToReproduce, draft.possibleCause]
                  .filter(Boolean).join("\n\n")
              );
            }}
          />

          <SupportSection>
            <div className="p-5 space-y-4">
              {/* Subject */}
              <FormField label="Subject" required>
                <FormInput
                  value={subject}
                  onChange={setSubject}
                  placeholder="Brief description of your issue"
                />
                {errors.subject && <p className="text-xs text-destructive mt-1">{errors.subject}</p>}
                {/* Duplicate ticket detection */}
                {subject.length >= 10 && <DuplicateTicketWarning subject={subject} />}
              </FormField>

              {/* Category + Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                <FormField label="Category" required>
                  <FormSelect
                    value={category}
                    onChange={setCategory}
                    options={SUPPORT_CATEGORIES}
                    placeholder="Select category"
                  />
                  {errors.category && <p className="text-xs text-destructive mt-1">{errors.category}</p>}
                </FormField>
                <FormField label="Priority">
                  <FormSelect
                    value={priority}
                    onChange={v => setPriority(v as typeof priority)}
                    options={["low", "medium", "high", "critical"]}
                  />
                </FormField>
              </div>

              {/* Department + Environment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                <FormField label="Department">
                  <FormSelect
                    value={department}
                    onChange={setDepartment}
                    options={DEPARTMENTS}
                    placeholder="Select department"
                  />
                </FormField>
                <FormField label="Environment">
                  <FormSelect
                    value={environment}
                    onChange={setEnvironment}
                    options={ENVIRONMENTS}
                    placeholder="Select environment"
                  />
                </FormField>
              </div>

              {/* Browser + Device */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                <FormField label="Browser">
                  <FormSelect
                    value={browser}
                    onChange={setBrowser}
                    options={BROWSERS}
                    placeholder="Select browser (optional)"
                  />
                </FormField>
                <FormField label="Device">
                  <FormSelect
                    value={device}
                    onChange={setDevice}
                    options={DEVICES}
                    placeholder="Select device (optional)"
                  />
                </FormField>
              </div>

              {/* Description */}
              <FormField label="Description" required>
                <FormTextarea
                  value={description}
                  onChange={setDescription}
                  placeholder="Describe the issue in detail. Include what you expected vs. what happened, and any error messages."
                  rows={5}
                />
                {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
              </FormField>

              {/* Attachment placeholder */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border bg-muted/20 text-xs text-muted-foreground">
                <div className="size-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <TicketIcon className="size-3.5" />
                </div>
                Screenshot / file attachment will be available in a future update.
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <motion.button
                  whileHover={HOVER_LIFT_SM} whileTap={TAP_PRESS_SM}
                  onClick={handleSubmit}
                  disabled={isCreating}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isCreating ? <Loader2 className="size-4 animate-spin" /> : <TicketIcon className="size-4" />}
                  {isCreating ? "Submitting…" : "Submit Ticket"}
                </motion.button>
                <button
                  onClick={onBack}
                  className="px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </SupportSection>
        </div>

        {/* Sidebar: FAQ suggestions + SLA */}
        <div className="space-y-4">
          {/* FAQ suggestions */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">
              {suggestions.length > 0 ? "Suggested Resources" : "Submission Tips"}
            </div>
            {suggestions.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-3">These may answer your question instantly:</p>
                {suggestions.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                    <span className={cn(
                      "text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5",
                      s.type === "article"
                        ? "bg-info/10 text-info"
                        : "bg-primary/10 text-primary",
                    )}>
                      {s.type === "article" ? "KB" : "Guide"}
                    </span>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2">
                      {s.title}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="space-y-2.5">
                {[
                  "Include the exact error message",
                  "List steps to reproduce the issue",
                  "Specify your browser and device",
                  "Mention your role: citizen, authority, or admin",
                  "Attach a screenshot if possible",
                ].map(tip => (
                  <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <div className="size-1.5 rounded-full bg-primary/60 shrink-0 mt-1.5" />
                    {tip}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* SLA table */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">SLA Commitment</div>
            {[
              { p: "Critical", t: "< 1 hour",   c: "var(--color-destructive)" },
              { p: "High",     t: "< 2 hours",  c: "var(--color-warning)"     },
              { p: "Medium",   t: "< 4 hours",  c: "var(--color-info)"        },
              { p: "Low",      t: "< 24 hours", c: "var(--color-muted-foreground)" },
            ].map(({ p, t, c }) => (
              <div key={p} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-xs">
                <span className="font-semibold" style={{ color: c }}>{p}</span>
                <span className="text-muted-foreground">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── 4. Ticket Dashboard ───────────────────────────────────────────────────────

function TicketDashboard({ onCreateTicket, initialSelectedId }: { onCreateTicket: () => void; initialSelectedId?: string | null }) {
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialSelectedId ?? null);
  const { data: stats, isLoading: statsLoading } = useTicketStats();
  const { tickets, isLoading, isError, refetch } = useTickets(
    filter !== "all" ? { status: filter } : undefined,
  );

  const counts = {
    all:         stats?.total       ?? 0,
    open:        stats?.open        ?? 0,
    in_progress: stats?.in_progress ?? 0,
    waiting:     stats?.waiting     ?? 0,
    resolved:    stats?.resolved    ?? 0,
    closed:      stats?.closed      ?? 0,
  };

  return (
    <div className="p-5 space-y-4">
      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-3">
        {[
          { label: "Open",        value: counts.open,        color: "var(--color-info)"            },
          { label: "In Progress", value: counts.in_progress, color: "var(--color-warning)"         },
          { label: "Waiting",     value: counts.waiting,     color: "var(--color-muted-foreground)"},
          { label: "Resolved",    value: counts.resolved,    color: "var(--color-success)"         },
          { label: "Total",       value: counts.all,         color: "var(--color-primary)"         },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-background p-3 text-center">
            <div className="text-2xl font-bold tabular-nums" style={{ color }}>
              {statsLoading ? "—" : value}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter + New button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex overflow-x-auto gap-1 p-1 rounded-xl border border-border bg-muted/30 flex-1">
          {(["all", "open", "in_progress", "waiting", "resolved", "closed"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0",
                filter === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "all" ? `All (${counts.all})` : `${TICKET_STATUS_STYLE[s].label} (${counts[s]})`}
            </button>
          ))}
        </div>
        <motion.button
          whileHover={HOVER_LIFT_SM} whileTap={TAP_PRESS_SM}
          onClick={onCreateTicket}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shrink-0"
        >
          <TicketIcon className="size-3.5" />
          New Ticket
        </motion.button>
      </div>

      {/* Ticket list — live from /api/support/tickets */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span className="text-sm">Loading tickets…</span>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <p className="text-sm text-muted-foreground">Failed to load tickets.</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted transition-colors"
          >
            <RefreshCw className="size-3.5" /> Retry
          </button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {tickets.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState
                icon={TicketIcon}
                title="No tickets found"
                description={
                  filter === "all"
                    ? "Create a new ticket to get help from our support team."
                    : `No ${TICKET_STATUS_STYLE[filter as TicketStatus]?.label ?? filter} tickets.`
                }
                action={
                  filter === "all" ? (
                    <button
                      onClick={onCreateTicket}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      Create Ticket
                    </button>
                  ) : undefined
                }
              />
            </motion.div>
          ) : (
            <motion.div
              key={filter}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {tickets.map((ticket: SupportTicketDTO) => (
                <div
                  key={ticket._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedTicketId(ticket._id)}
                  onKeyDown={e => { if (e.key === "Enter") setSelectedTicketId(ticket._id); }}
                  className="rounded-xl border border-border bg-background p-4 cursor-pointer hover:border-primary/25 transition-colors duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {ticket._id.slice(-8).toUpperCase()}
                        </span>
                        <StatusBadge status={ticket.status} />
                        <PriorityBadge priority={ticket.priority} />
                        {!ticket.adminRead && (
                          <span className="inline-flex items-center text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            Awaiting review
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold leading-snug mb-1.5 line-clamp-2">{ticket.subject}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                        <span>{ticket.category}</span>
                        {ticket.department  && <><span>·</span><span>{ticket.department}</span></>}
                        {ticket.environment && <><span>·</span><span>{ticket.environment}</span></>}
                        {ticket.assignedTeam && <><span>·</span><span>Team: {ticket.assignedTeam}</span></>}
                        <span>·</span>
                        <span>Updated {new Date(ticket.updatedAt).toLocaleDateString()}</span>
                        {ticket.comments.length > 0 && <><span>·</span><span>{ticket.comments.length} {ticket.comments.length === 1 ? "reply" : "replies"}</span></>}
                      </div>
                      {(ticket.status === "open" || ticket.status === "in_progress") && ticket.estimatedResponse && (
                        <div className="mt-2 text-[10px] text-muted-foreground">
                          Est. response: <span className="font-semibold text-foreground">{ticket.estimatedResponse}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <TicketDetailSheet
        ticketId={selectedTicketId}
        onOpenChange={open => { if (!open) setSelectedTicketId(null); }}
      />
    </div>
  );
}

// ─── 5. Emergency Assistance ───────────────────────────────────────────────────

function EmergencyAssistance() {
  const LEVEL_COLOR = {
    critical: "var(--color-destructive)",
    high:     "var(--color-warning)",
    medium:   "var(--color-success)",
  };
  const LEVEL_LABEL = { critical: "CRITICAL", high: "HIGH", medium: "MEDIUM" };

  return (
    <div className="p-5 space-y-5">
      {/* Top alert */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5">
        <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-bold text-destructive mb-0.5">Life-Threatening Emergency</div>
          <div className="text-xs text-muted-foreground">
            If there is immediate danger to life, call emergency services (911) before using GreenGuard. This platform supplements — it does not replace — emergency services.
          </div>
        </div>
      </div>

      {/* Emergency cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {EMERGENCY_TYPES.map(em => {
          const Icon = em.icon;
          const levelColor = LEVEL_COLOR[em.level];
          return (
            <motion.div
              key={em.id}
              whileHover={HOVER_LIFT_SM}
              className="rounded-xl border bg-card p-5 relative overflow-hidden group"
              style={{ borderColor: `color-mix(in oklab, ${em.accentColor} 25%, var(--color-border))` }}
            >
              <div
                className="absolute -top-12 -right-12 size-32 rounded-full blur-2xl opacity-8 pointer-events-none"
                style={{ background: em.accentColor }}
              />

              {/* Level badge */}
              <div className="flex items-center justify-between mb-4">
                <div
                  className="size-10 rounded-xl flex items-center justify-center"
                  style={{ background: `color-mix(in oklab, ${em.accentColor} 12%, transparent)` }}
                >
                  <Icon className="size-5" style={{ color: em.accentColor }} />
                </div>
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider"
                  style={{ color: levelColor, background: `color-mix(in oklab, ${levelColor} 10%, transparent)` }}
                >
                  {LEVEL_LABEL[em.level]}
                </span>
              </div>

              <h3 className="text-sm font-bold mb-1.5">{em.label}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{em.description}</p>

              {/* Protocol */}
              <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-muted/40 mb-4">
                <Shield className="size-3 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">{em.protocol}</p>
              </div>

              {/* Call button */}
              <a
                href={`tel:${em.number.replace(/[^0-9+]/g, "")}`}
                className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200"
                style={{
                  color: em.accentColor,
                  background: `color-mix(in oklab, ${em.accentColor} 10%, transparent)`,
                }}
              >
                <span className="flex items-center gap-2">
                  <Phone className="size-3.5" />
                  {em.number}
                </span>
                <ArrowRight className="size-3.5" />
              </a>
            </motion.div>
          );
        })}
      </div>

      {/* Escalation procedure */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-4">Standard Escalation Procedure</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { step: "1", title: "Report via GreenGuard",    desc: "File a complaint through the Citizen Portal or Command Center" },
            { step: "2", title: "Escalate to Authority",    desc: "If unresolved within SLA, contact the Authority Escalation Line" },
            { step: "3", title: "Platform Emergency Line",  desc: "For P0 platform incidents affecting data integrity or security" },
            { step: "4", title: "Environmental Emergency",  desc: "For active environmental disasters or immediate public health risk" },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex items-start gap-3">
              <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">{step}</div>
              <div>
                <div className="text-xs font-semibold mb-0.5">{title}</div>
                <div className="text-[10px] text-muted-foreground leading-relaxed">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 6. Authority Directory ────────────────────────────────────────────────────

function AuthorityDirectory() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | "national" | "state" | "district">("all");

  const filtered = AUTHORITY_DIRECTORY.filter(a => {
    const matchesLevel = levelFilter === "all" || a.level === levelFilter;
    if (!matchesLevel) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.department.toLowerCase().includes(q) ||
      a.serviceArea.toLowerCase().includes(q) ||
      (a.category?.toLowerCase().includes(q) ?? false) ||
      (a.jurisdiction?.toLowerCase().includes(q) ?? false) ||
      (a.address?.toLowerCase().includes(q) ?? false)
    );
  });

  const LEVEL_STYLE = {
    national: { label: "National", color: "var(--color-destructive)" },
    state:    { label: "State",    color: "var(--color-warning)"     },
    district: { label: "District", color: "var(--color-info)"        },
  };

  return (
    <div className="p-5 space-y-4">
      {/* Search + level filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-primary/50 transition-all group">
          <Search className="size-4 text-muted-foreground shrink-0 group-focus-within:text-primary transition-colors" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, department, category, city, or state…"
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="flex gap-1 p-1 rounded-xl border border-border bg-muted/30 shrink-0">
          {(["all", "national", "state", "district"] as const).map(l => (
            <button
              key={l}
              onClick={() => setLevelFilter(l)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200",
                levelFilter === l ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {l === "all" ? "All" : l.charAt(0).toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No authorities found" description={`No results for "${search}"`} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filtered.map(auth => (
            <motion.div
              key={auth.id}
              whileHover={HOVER_LIFT_SM}
              className="rounded-xl border border-border bg-background p-4 group flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                  {auth.name.split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <AvailabilityDot status={auth.availability} />
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        color: LEVEL_STYLE[auth.level].color,
                        background: `color-mix(in oklab, ${LEVEL_STYLE[auth.level].color} 10%, transparent)`,
                      }}
                    >
                      {LEVEL_STYLE[auth.level].label}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold leading-tight">{auth.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{auth.role}</p>
                </div>
              </div>

              {/* Department */}
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                {auth.category} · {auth.department}
              </div>

              {/* Contact details */}
              <div className="space-y-2 text-xs text-muted-foreground flex-1">
                <div className="flex items-center gap-2">
                  <Mail className="size-3 shrink-0" />
                  <a href={`mailto:${auth.email}`} className="truncate hover:text-foreground transition-colors">{auth.email}</a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="size-3 shrink-0" />
                  <a href={`tel:${auth.phone.replace(/[^0-9+]/g, "")}`} className="hover:text-foreground transition-colors font-medium">{auth.phone}</a>
                  {auth.altPhone && (
                    <span className="text-muted-foreground/60">/ <a href={`tel:${auth.altPhone.replace(/[^0-9+]/g, "")}`} className="hover:text-foreground transition-colors">{auth.altPhone}</a></span>
                  )}
                </div>
                {auth.website && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="size-3 shrink-0" />
                    <a href={auth.website} target="_blank" rel="noopener noreferrer" className="truncate hover:text-foreground transition-colors">{auth.website.replace("https://", "")}</a>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="size-3 shrink-0" />
                  <span>{auth.officeHours}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="size-3 shrink-0" />
                  <span className="line-clamp-1">{auth.jurisdiction ?? auth.serviceArea}</span>
                </div>
                {auth.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="size-3 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 text-[10px]">{auth.address}</span>
                  </div>
                )}
              </div>

              {/* Services */}
              {auth.services && auth.services.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">Services</div>
                  <div className="flex flex-wrap gap-1">
                    {auth.services.slice(0, 3).map(s => (
                      <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground line-clamp-1 max-w-full">{s}</span>
                    ))}
                    {auth.services.length > 3 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">+{auth.services.length - 3} more</span>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  Response: <span className="font-semibold text-foreground">{auth.responseTime}</span>
                </span>
                {auth.lastVerified && (
                  <span className="text-[9px] text-muted-foreground/60">Verified {auth.lastVerified}</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 7. Feature Requests ──────────────────────────────────────────────────────

function FeatureRequestsSection() {
  const [filter, setFilter] = useState<"all" | "planned" | "in_progress" | "shipped">("all");
  const { features, isLoading, isError, hasVoted, getVotes, toggleVote } = useFeatureRequests(
    filter !== "all" ? { status: filter } : undefined,
  );

  return (
    <div className="p-5 space-y-4">
      <div className="flex gap-1 p-1 rounded-xl border border-border bg-muted/30 w-fit flex-wrap">
        {(["all", "planned", "in_progress", "shipped"] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200",
              filter === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /><span className="text-sm">Loading…</span>
        </div>
      )}
      {isError && (
        <p className="text-sm text-muted-foreground text-center py-8">Failed to load feature requests.</p>
      )}
      <div className="space-y-3">
        {features.map(feature => {
          const style = FEATURE_STATUS_STYLE[feature.status];
          const voted = hasVoted(feature._id);
          const votes = getVotes(feature._id);

          return (
            <motion.div
              key={feature._id}
              whileHover={{ y: -1 }}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="flex items-start gap-4">
                {/* Vote */}
                <motion.button
                  whileTap={TAP_PRESS_SM}
                  onClick={() => toggleVote(feature._id)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border shrink-0 transition-all duration-200 min-w-[52px]",
                    voted
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary",
                  )}
                >
                  <ThumbsUp className="size-3.5" />
                  <span className="text-[11px] font-bold tabular-nums">{votes}</span>
                </motion.button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: style.color, background: `color-mix(in oklab, ${style.color} 10%, transparent)` }}
                    >
                      {style.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{feature.category}</span>
                    {feature.estimatedRelease && (
                      <span className="text-[10px] text-muted-foreground">· {feature.estimatedRelease}</span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold mb-1">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{feature.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {feature.tags.map(tag => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 8. Feedback Center ───────────────────────────────────────────────────────

function FeedbackCenter() {
  const { submitted, isSubmitting: feedbackSubmitting, submitFeedback, reset } = useFeedback();
  const [rating, setRating]                 = useState(0);
  const [category, setCategory]             = useState("");
  const [comment, setComment]               = useState("");
  const [nps, setNps]                       = useState(-1);
  const [uiSat, setUiSat]                   = useState(0);
  const [aiSat, setAiSat]                   = useState(0);

  if (submitted) {
    return (
      <div className="p-5">
        <SuccessState
          title="Thank You for Your Feedback!"
          description="Your input helps us improve GreenGuard for everyone. We read every submission."
          onReset={() => { reset(); setRating(0); setCategory(""); setComment(""); setNps(-1); setUiSat(0); setAiSat(0); }}
          resetLabel="Submit More Feedback"
        />
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FormField label="Overall Satisfaction">
          <StarRating value={rating} onChange={setRating} />
        </FormField>
        <FormField label="Feedback Category">
          <FormSelect
            value={category}
            onChange={setCategory}
            options={["General Experience", "UI/UX Design", "Performance", "GreenGuard Intelligence Center", "Smart Maps", "Reports", "Support Quality", "Documentation", "Other"]}
            placeholder="Select category"
          />
        </FormField>
      </div>

      <FormField label="Comments">
        <FormTextarea
          value={comment}
          onChange={setComment}
          placeholder="Tell us what you love, what could be better, or any suggestions…"
          rows={4}
        />
      </FormField>

      <div>
        <div className="text-xs font-medium mb-2">
          How likely are you to recommend GreenGuard?
          <span className="text-muted-foreground ml-1">(NPS 0–10)</span>
        </div>
        <NpsSlider value={nps} onChange={setNps} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FormField label="UI Satisfaction">
          <StarRating value={uiSat} onChange={setUiSat} />
        </FormField>
        <FormField label="GreenGuard Intelligence Center Satisfaction">
          <StarRating value={aiSat} onChange={setAiSat} />
        </FormField>
      </div>

      <motion.button
        whileHover={HOVER_LIFT_SM} whileTap={TAP_PRESS_SM}
        onClick={() => rating > 0 && !feedbackSubmitting && submitFeedback({ rating, category, comment, nps, uiSatisfaction: uiSat, aiSatisfaction: aiSat })}
        disabled={rating === 0 || feedbackSubmitting}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {feedbackSubmitting && <Loader2 className="size-4 animate-spin" />}
        {feedbackSubmitting ? "Submitting…" : "Submit Feedback"}
      </motion.button>
    </div>
  );
}

// ─── 9. Bug Reporting ─────────────────────────────────────────────────────────

function BugReportForm() {
  const { submitted, isSubmitting: bugSubmitting, submitBug, reset } = useBugReports();
  const [title, setTitle]           = useState("");
  const [category, setCategory]     = useState("");
  const [severity, setSeverity]     = useState("");
  const [platform, setPlatform]     = useState("");
  const [browser, setBrowser]       = useState("");
  const [device, setDevice]         = useState("");
  const [steps, setSteps]           = useState("");
  const [expected, setExpected]     = useState("");
  const [actual, setActual]         = useState("");

  if (submitted) {
    return (
      <div className="p-5">
        <SuccessState
          title="Bug Report Submitted"
          description="Thank you for helping improve GreenGuard. Our engineering team will investigate and update you via email."
          detail="You'll receive a confirmation email within 30 minutes."
          onReset={() => {
            reset();
            setTitle(""); setCategory(""); setSeverity(""); setPlatform("");
            setBrowser(""); setDevice(""); setSteps(""); setExpected(""); setActual("");
          }}
          resetLabel="Report Another Bug"
        />
      </div>
    );
  }

  const canSubmit = !!(title && category && severity && steps && expected && actual);

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        <FormField label="Bug Title" required className="sm:col-span-2">
          <FormInput value={title} onChange={setTitle} placeholder="One-line description of the bug" />
        </FormField>
        <FormField label="Category" required>
          <FormSelect value={category} onChange={setCategory} options={BUG_CATEGORIES} placeholder="Affected area" />
        </FormField>
        <FormField label="Severity" required>
          <FormSelect value={severity} onChange={setSeverity} options={["Minor", "Major", "Critical", "Blocker"]} placeholder="Impact level" />
        </FormField>
        <FormField label="Platform">
          <FormSelect value={platform} onChange={setPlatform} options={PLATFORMS} placeholder="Affected platform" />
        </FormField>
        <FormField label="Browser">
          <FormSelect value={browser} onChange={setBrowser} options={BROWSERS} placeholder="Browser (optional)" />
        </FormField>
        <FormField label="Device" className="sm:col-span-2 lg:col-span-1">
          <FormSelect value={device} onChange={setDevice} options={DEVICES} placeholder="Device (optional)" />
        </FormField>

        <FormField label="Steps to Reproduce" required className="sm:col-span-2">
          <FormTextarea
            value={steps}
            onChange={setSteps}
            placeholder={"1. Navigate to…\n2. Click on…\n3. Observe that…"}
            rows={4}
          />
        </FormField>
        <FormField label="Expected Result" required>
          <FormTextarea value={expected} onChange={setExpected} placeholder="What should have happened?" rows={3} />
        </FormField>
        <FormField label="Actual Result" required>
          <FormTextarea value={actual} onChange={setActual} placeholder="What actually happened?" rows={3} />
        </FormField>
      </div>

      {/* Attachment placeholder */}
      <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border bg-muted/20 text-xs text-muted-foreground">
        <Bug className="size-4 shrink-0" />
        Screenshot / file attachment will be available in a future update.
      </div>

      <motion.button
        whileHover={HOVER_LIFT_SM} whileTap={TAP_PRESS_SM}
        onClick={() => canSubmit && !bugSubmitting && submitBug({ title, category, severity, browser, device, steps, expected, actual, platform })}
        disabled={!canSubmit || bugSubmitting}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {bugSubmitting && <Loader2 className="size-4 animate-spin" />}
        {bugSubmitting ? "Submitting…" : "Submit Bug Report"}
      </motion.button>
    </div>
  );
}

// ─── 10. Support Analytics ────────────────────────────────────────────────────

function SupportAnalytics() {
  const { data: stats, isLoading } = useTicketStats();
  const { tickets } = useTickets();

  const kpis = [
    { label: "Total Tickets",   value: stats?.total ?? "—",          color: "var(--color-primary)"  },
    { label: "Open",            value: stats?.open  ?? "—",          color: "var(--color-info)"     },
    { label: "In Progress",     value: stats?.in_progress ?? "—",    color: "var(--color-warning)"  },
    { label: "Resolved",        value: stats?.resolved ?? "—",       color: "var(--color-success)"  },
    { label: "Resolution Rate", value: stats?.resolutionRate ?? "—", color: "var(--color-success)"  },
    { label: "Avg Response",    value: stats?.avgResponseTime ?? "—", color: "var(--color-primary)" },
  ];

  const satScore = stats?.satisfactionScore ?? 0;

  return (
    <div className="p-5 space-y-5">
      {/* KPI grid — live from /api/support/tickets/stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-6 gap-3">
        {kpis.map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-background p-3 text-center">
            <div className="text-xl font-bold tabular-nums" style={{ color }}>
              {isLoading ? "—" : value}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Satisfaction score */}
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Star className="size-3.5 text-warning fill-warning" />
            Customer Satisfaction
          </div>
          <span className="text-xl font-bold tabular-nums">{satScore > 0 ? `${satScore}/5` : "—"}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full aurora rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(satScore / 5) * 100}%` }}
            transition={{ duration: 0.9, ease: EASE_OUT }}
          />
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-border bg-background p-4">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">Recent Activity</div>
        <div className="space-y-3">
          {tickets.slice(0, 5).map((ticket: SupportTicketDTO) => (
            <div key={ticket._id} className="flex items-center gap-3 text-xs">
              <span className="font-mono text-muted-foreground shrink-0 w-20">{ticket._id.slice(-8).toUpperCase()}</span>
              <span className="flex-1 truncate text-muted-foreground">{ticket.subject}</span>
              <div className="flex items-center gap-2 shrink-0">
                <PriorityBadge priority={ticket.priority} />
                <StatusBadge status={ticket.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────────

interface Tab { id: string; label: string; icon: typeof TicketIcon; danger?: boolean }

const TABS: Tab[] = [
  { id: "tickets",   label: "Tickets",         icon: TicketIcon        },
  { id: "ai",        label: "AI Assistant",     icon: Sparkles          },
  { id: "emergency", label: "Emergency",        icon: AlertTriangle, danger: true },
  { id: "authority", label: "Authority Dir.",   icon: Users             },
  { id: "bug",       label: "Bug Reports",      icon: Bug               },
  { id: "feature",   label: "Feature Requests", icon: Lightbulb         },
  { id: "feedback",  label: "Feedback",         icon: MessageSquarePlus },
  { id: "analytics", label: "Analytics",        icon: BarChart3         },
];

// ─── Root page ────────────────────────────────────────────────────────────────

export function SupportCenterPage() {
  // Deep-link support for notification links like
  // /help/support?tab=tickets&id=<ticketId> (see notification.service.ts).
  // Parsed once on mount — the Help Center doesn't otherwise use URL state.
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialTab = initialParams.get("tab");
  const deepLinkId = initialParams.get("id");

  const [activeTab, setActiveTab]       = useState(
    initialTab && TABS.some(t => t.id === initialTab) ? initialTab : "tickets",
  );
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [createdId, setCreatedId]       = useState<string | null>(null);

  const handleTicketSuccess = (id: string) => {
    setCreatedId(id);
    setCreatingTicket(false);
    setActiveTab("tickets");
  };

  return (
    <div className="p-4 md:p-6 xl:p-8 max-w-none space-y-8 pb-16">
      {/* Hero */}
      <SupportHero
        onSearch={() => {}}
        onCreateTicket={() => { setCreatingTicket(true); setActiveTab("tickets"); }}
      />

      {/* Contact methods */}
      <ContactSupport
        onCreateTicket={() => { setCreatingTicket(true); setActiveTab("tickets"); }}
      />

      {/* Ticket creation / tabbed content */}
      <AnimatePresence mode="wait">
        {creatingTicket ? (
          <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CreateTicketForm
              onBack={() => setCreatingTicket(false)}
              onSuccess={handleTicketSuccess}
            />
          </motion.div>
        ) : (
          <motion.div key="tabs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Success toast */}
            <AnimatePresence>
              {createdId && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-3 p-4 rounded-xl border border-success/30 bg-success/5 mb-4"
                >
                  <CheckCircle2 className="size-5 text-success shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-success">Ticket created: </span>
                    <span className="text-sm font-mono">{createdId}</span>
                    <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                      You'll receive an email confirmation shortly.
                    </span>
                  </div>
                  <button
                    onClick={() => setCreatedId(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <X className="size-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <SupportSection>
              {/* Tab bar — horizontal scroll on mobile */}
              <div className="border-b border-border overflow-x-auto">
                <div className="flex min-w-max">
                  {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-all duration-150",
                          activeTab === tab.id
                            ? tab.danger
                              ? "border-destructive text-destructive"
                              : "border-primary text-primary"
                            : tab.danger
                            ? "border-transparent text-muted-foreground hover:text-destructive hover:border-destructive/40"
                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                        )}
                      >
                        <Icon className="size-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: DUR_SM, ease: EASE_OUT }}
                >
                  {activeTab === "tickets"   && <TicketDashboard onCreateTicket={() => setCreatingTicket(true)} initialSelectedId={activeTab === "tickets" ? deepLinkId : null} />}
                  {activeTab === "ai"        && (
                    <div className="p-5">
                      <HelpAIPanel onCreateTicket={() => { setCreatingTicket(true); setActiveTab("tickets"); }} />
                    </div>
                  )}
                  {activeTab === "emergency" && <EmergencyAssistance />}
                  {activeTab === "authority" && <AuthorityDirectory />}
                  {activeTab === "bug"       && (
                    <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>}>
                      <BugReportPage />
                    </Suspense>
                  )}
                  {activeTab === "feature"   && <FeatureRequestsSection />}
                  {activeTab === "feedback"  && <FeedbackCenter />}
                  {activeTab === "analytics" && <SupportAnalytics />}
                </motion.div>
              </AnimatePresence>
            </SupportSection>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
