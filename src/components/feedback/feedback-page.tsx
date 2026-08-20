import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquarePlus,
  Lightbulb,
  Bug,
  Star,
  ThumbsUp,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Tag,
  Calendar,
  TrendingUp,
  Package,
  Clock,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
  Check,
  Leaf,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DUR_MD, DUR_SM, EASE_OUT, HOVER_LIFT_SM, TAP_PRESS_SM } from "@/lib/motion";
import { SectionHeader, EmptyState } from "@/components/help-center/help-card";
import {
  FormField,
  FormInput,
  FormTextarea,
  FormSelect,
  StarRating,
  NpsSlider,
  SuccessState,
} from "@/components/help-center/support/support-ui";
import {
  FEATURE_STATUS_STYLE,
  PLATFORMS,
  BROWSERS,
  DEVICES,
  BUG_SEVERITY_STYLE,
} from "@/components/help-center/support/support-data";
import {
  useFeatureRequests,
  useFeedback,
  useBugReports,
  useBugList,
} from "@/components/help-center/support/support-store";
import type { FeatureRequestDTO, BugReportDTO, BugStatus, BugSeverity } from "@/lib/api/support.api";
import { useCreateFeatureRequest } from "./feedback-store";

// ─── GreenGuard-Specific Categories ───────────────────────────────────────────

const FEEDBACK_CATEGORIES = [
  "Environmental Dashboard & AQI",
  "Smart Maps & GIS Layers",
  "Citizen Hub & Complaints",
  "GreenGuard Intelligence Center",
  "Sensor Alerts & Notifications",
  "Sustainability & Forecasts",
  "Authority Command & Dispatch",
  "Account & Authentication",
  "Reports & Data Exports",
  "General Experience",
];

const FEATURE_CATEGORIES = [
  "Environmental Monitoring & AQI",
  "Smart Maps & GIS Visualization",
  "Citizen Services & Complaint Workflow",
  "GreenGuard Intelligence Center & Copilot",
  "Sensor Alerts & Early Warnings",
  "Sustainability & Predictive Forecasts",
  "Authority Portal & Resource Dispatch",
  "Reports, Data Exports & APIs",
  "UI/UX & Mobile Experience",
  "Integrations & Webhooks",
];

const BUG_CATEGORIES = [
  "Environmental Data & AQI Calculations",
  "Smart Map & GIS Visualization",
  "Citizen Complaints & Dispatch Workflow",
  "Intelligence Center & Copilot",
  "Sensor Alerts & Notifications",
  "User Interface & Navigation",
  "Authentication & Access",
  "Data Export & Reports",
  "Other",
];

type FeedbackTab =
  | "overview"
  | "submit-feedback"
  | "feature-requests"
  | "submit-feature"
  | "report-problem";

type FeatureFilter = "all" | "planned" | "in_progress" | "shipped";

const STATUS_ICON: Record<string, React.ElementType> = {
  submitted: Clock,
  planned: Calendar,
  in_progress: TrendingUp,
  shipped: Package,
  declined: X,
  resolved: Check,
};

const BUG_STATUS_STYLE: Record<BugStatus, { label: string; color: string }> = {
  open: { label: "Open", color: "var(--color-info)" },
  acknowledged: { label: "Acknowledged", color: "var(--color-warning)" },
  fixed: { label: "Fixed", color: "var(--color-success)" },
  wontfix: { label: "Won't Fix", color: "var(--color-muted-foreground)" },
  resolved: { label: "Resolved", color: "var(--color-success)" },
  reopened: { label: "Reopened", color: "var(--color-destructive)" },
};

// ─── 1. GreenGuard AI Hero ───────────────────────────────────────────────────

function FeedbackHero({
  onFeedback,
  onFeatureRequest,
}: {
  onFeedback: () => void;
  onFeatureRequest: () => void;
}) {
  return (
    <div className="relative rounded-2xl border border-border bg-card/80 p-6 sm:p-8 md:p-10 space-y-6">
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
          <Leaf className="size-3 text-primary" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">
            Platform Feedback & Features
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Help us improve GreenGuard AI
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
          Share your experience, report something that isn't working, or suggest improvements to the
          environmental platform.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={onFeedback}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Star className="size-4" />
            Share Feedback
          </button>
          <button
            onClick={onFeatureRequest}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-sm font-semibold text-foreground transition-colors"
          >
            <Lightbulb className="size-4 text-warning" />
            Request a Feature
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 2. GreenGuard-Specific Action Cards ──────────────────────────────────────

function ChooseActionSection({ onTab }: { onTab: (tab: FeedbackTab) => void }) {
  const cards = [
    {
      tab: "submit-feedback" as FeedbackTab,
      icon: Star,
      title: "Share Feedback",
      description:
        "Tell us what is working well and where the GreenGuard AI experience could be better across dashboards, smart maps, citizen tools, or intelligence workflows.",
      actionText: "Share Feedback",
      color: "var(--color-warning)",
    },
    {
      tab: "report-problem" as FeedbackTab,
      icon: Bug,
      title: "Report a Problem",
      description:
        "Something isn't working as expected? Tell us what happened with environmental data, complaints, map layers, or alerts so our team can investigate it.",
      actionText: "Report Problem",
      color: "var(--color-destructive)",
    },
    {
      tab: "submit-feature" as FeedbackTab,
      icon: Lightbulb,
      title: "Request a Feature",
      description:
        "Have an idea that could make GreenGuard AI more useful? Suggest a new capability, forecasting tool, smarter alert, or citizen service enhancement.",
      actionText: "Request a Feature",
      color: "var(--color-primary)",
    },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          What would you like to share?
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Tell us about your experience, flag a problem, or suggest what GreenGuard AI should improve
          next.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(({ tab, icon: Icon, title, description, actionText, color }) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTab(tab)}
            className="text-left flex flex-col justify-between p-5 rounded-xl border border-border/80 bg-card/70 hover:border-primary/40 hover:bg-card transition-all duration-200 group h-full"
          >
            <div className="space-y-3">
              <div
                className="size-10 rounded-xl flex items-center justify-center"
                style={{ background: `color-mix(in oklab, ${color} 12%, transparent)` }}
              >
                <Icon className="size-5" style={{ color }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{description}</p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors inline-flex items-center gap-1">
                {actionText}
                <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform duration-150" />
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Subtle GreenGuard Context Note */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/60 bg-muted/20 text-muted-foreground">
        <Info className="size-3.5 text-primary shrink-0" />
        <span className="text-xs">
          Feedback helps improve environmental monitoring, alerts, citizen services, intelligence
          tools, and sustainability insights across GreenGuard AI.
        </span>
      </div>
    </section>
  );
}

// ─── 3. Feedback Submission Form ──────────────────────────────────────────────

function FeedbackForm({ onBack }: { onBack: () => void }) {
  const { submitted, isSubmitting, submitFeedback, reset } = useFeedback();

  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState("");
  const [liked, setLiked] = useState("");
  const [improved, setImproved] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [nps, setNps] = useState(-1);
  const [uiSat, setUiSat] = useState(0);
  const [supportSat, setSupportSat] = useState(0);
  const [docSat, setDocSat] = useState(0);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (rating === 0) e.rating = "Please rate your experience";
    if (!category) e.category = "Please select a platform area";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate() || isSubmitting) return;
    const comment = [
      liked && `What worked well:\n${liked}`,
      improved && `What could be improved:\n${improved}`,
      suggestion && `Suggestions:\n${suggestion}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    submitFeedback({
      rating,
      category,
      comment,
      nps,
      uiSatisfaction: uiSat,
      aiSatisfaction: supportSat,
    });
  };

  const handleReset = () => {
    reset();
    setRating(0);
    setCategory("");
    setLiked("");
    setImproved("");
    setSuggestion("");
    setNps(-1);
    setUiSat(0);
    setSupportSat(0);
    setDocSat(0);
    setErrors({});
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <SuccessState
          title="Thank You for Your Feedback!"
          description="Your input helps our environmental technology and product team continuously refine GreenGuard AI."
          detail="We review all feedback to improve forecasting accuracy, alert reliability, and citizen workflows."
          onReset={handleReset}
          resetLabel="Submit More Feedback"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Back to Feedback & Features
      </button>

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Tell us about your experience</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Tell us what worked well, what was confusing, or what you'd like to see improved across
            GreenGuard AI.
          </p>
        </div>

        <div className="space-y-6">
          {/* Overall Rating */}
          <FormField label="Overall Experience Rating" required>
            <div className="space-y-2">
              <StarRating value={rating} onChange={setRating} />
              {rating > 0 && (
                <p className="text-xs text-muted-foreground">
                  {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
                </p>
              )}
              {errors.rating && <p className="text-xs text-destructive">{errors.rating}</p>}
            </div>
          </FormField>

          {/* Feedback Category */}
          <FormField label="Platform Area" required>
            <FormSelect
              value={category}
              onChange={setCategory}
              options={FEEDBACK_CATEGORIES}
              placeholder="Select an area of GreenGuard AI"
            />
            {errors.category && (
              <p className="text-xs text-destructive mt-1">{errors.category}</p>
            )}
          </FormField>

          {/* What worked well */}
          <FormField label="What worked well?">
            <FormTextarea
              value={liked}
              onChange={setLiked}
              placeholder="Tell us what was accurate, fast, clear, or easy to use…"
              rows={3}
            />
          </FormField>

          {/* What could be improved */}
          <FormField label="What was confusing or could be improved?">
            <FormTextarea
              value={improved}
              onChange={setImproved}
              placeholder="What caused confusion, lacked context, or needs workflow refinement?…"
              rows={3}
            />
          </FormField>

          {/* Suggestions */}
          <FormField label="Specific suggestions for the platform">
            <FormTextarea
              value={suggestion}
              onChange={setSuggestion}
              placeholder="Any specific environmental tools, alert settings, or insights you would like?…"
              rows={3}
            />
          </FormField>

          {/* NPS recommendation */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-medium text-foreground">
              How likely are you to recommend GreenGuard AI to environmental coordinators or
              colleagues?
              <span className="text-muted-foreground ml-1">(0–10)</span>
            </div>
            <NpsSlider value={nps} onChange={setNps} />
          </div>

          {/* Area satisfaction */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground text-[11px]">
              Area Satisfaction (Optional)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="User Interface & Maps">
                <StarRating value={uiSat} onChange={setUiSat} max={5} />
              </FormField>
              <FormField label="Environmental Intelligence">
                <StarRating value={supportSat} onChange={setSupportSat} max={5} />
              </FormField>
              <FormField label="Documentation & Guides">
                <StarRating value={docSat} onChange={setDocSat} max={5} />
              </FormField>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Star className="size-4" />
              )}
              {isSubmitting ? "Submitting…" : "Submit Feedback"}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 4. Feature Card ──────────────────────────────────────────────────────────

function FeatureCard({
  feature,
  onVote,
  onSelect,
}: {
  feature: FeatureRequestDTO;
  onVote: (id: string) => void;
  onSelect: (f: FeatureRequestDTO) => void;
}) {
  const style = FEATURE_STATUS_STYLE[feature.status];
  const StatusIcon = STATUS_ICON[feature.status] ?? Clock;

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 hover:border-primary/40 hover:bg-card transition-all duration-200 flex items-start gap-4">
      {/* Vote Button */}
      <button
        onClick={() => onVote(feature._id)}
        className={cn(
          "flex flex-col items-center gap-1 px-3 py-2 rounded-xl border shrink-0 transition-all duration-150 min-w-[50px]",
          feature.voted
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary",
        )}
        aria-label={`Vote for ${feature.title}`}
      >
        <ThumbsUp className={cn("size-3.5", feature.voted && "fill-current")} />
        <span className="text-xs font-bold tabular-nums">{feature.voteCount}</span>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{
              color: style.color,
              background: `color-mix(in oklab, ${style.color} 10%, transparent)`,
            }}
          >
            <StatusIcon className="size-2.5" />
            {style.label}
          </span>
          <span className="text-[11px] text-muted-foreground">{feature.category}</span>
          {feature.estimatedRelease && (
            <span className="text-[11px] text-muted-foreground">· {feature.estimatedRelease}</span>
          )}
        </div>

        <button onClick={() => onSelect(feature)} className="text-left block w-full group/title">
          <h4 className="text-sm font-semibold text-foreground group-hover/title:text-primary transition-colors leading-snug">
            {feature.title}
          </h4>
        </button>

        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {feature.description}
        </p>

        {feature.tags && feature.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {feature.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground"
              >
                <Tag className="size-2" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Detail trigger */}
      <button
        onClick={() => onSelect(feature)}
        className="shrink-0 text-muted-foreground/40 hover:text-primary transition-colors mt-1"
        aria-label="View details"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

// ─── 5. Feature Requests Browser ─────────────────────────────────────────────

function FeatureRequestsBrowser({
  onBack,
  onSubmitNew,
}: {
  onBack: () => void;
  onSubmitNew: () => void;
}) {
  const [filter, setFilter] = useState<FeatureFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<FeatureRequestDTO | null>(null);

  const { features, isLoading, isError, hasVoted, getVotes, toggleVote } = useFeatureRequests(
    filter !== "all" ? { status: filter } : undefined,
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return features;
    const q = search.toLowerCase();
    return features.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        f.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [features, search]);

  const enriched = useMemo(
    () =>
      filtered.map((f) => ({
        ...f,
        voted: hasVoted(f._id),
        voteCount: getVotes(f._id),
      })),
    [filtered, hasVoted, getVotes],
  );

  const handleVote = useCallback(
    (id: string) => {
      toggleVote(id);
    },
    [toggleVote],
  );

  if (selected) {
    const live = enriched.find((f) => f._id === selected._id) ?? selected;
    const style = FEATURE_STATUS_STYLE[live.status];
    const StatusIcon = STATUS_ICON[live.status] ?? Clock;

    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
          Back to Feature Requests
        </button>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{
                color: style.color,
                background: `color-mix(in oklab, ${style.color} 12%, transparent)`,
              }}
            >
              <StatusIcon className="size-3" />
              {style.label}
            </span>
            <span className="text-xs text-muted-foreground">{live.category}</span>
          </div>

          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">{live.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{live.description}</p>
          </div>

          {live.tags && live.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {live.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground"
                >
                  <Tag className="size-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-border flex items-center gap-4">
            <button
              onClick={() => handleVote(live._id)}
              className={cn(
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                live.voted
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-foreground hover:bg-muted",
              )}
            >
              <ThumbsUp className={cn("size-4", live.voted && "fill-current")} />
              {live.voted ? "Voted" : "Vote for this feature"} ({live.voteCount})
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Back to Feedback & Features
      </button>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              GreenGuard AI Feature Requests
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              See what users would like to improve and help shape future GreenGuard AI capabilities.
            </p>
          </div>
          <button
            onClick={onSubmitNew}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shrink-0 self-start sm:self-auto"
          >
            <Plus className="size-3.5" />
            Request a Feature
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-primary/50 transition-all">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search GreenGuard feature requests…"
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-1 p-1 rounded-xl border border-border bg-muted/30 shrink-0 overflow-x-auto">
            {(["all", "planned", "in_progress", "shipped"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150",
                  filter === s
                    ? "bg-background text-foreground shadow-sm font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s === "all"
                  ? "All"
                  : s === "in_progress"
                    ? "In Progress"
                    : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Loading feature requests…</span>
          </div>
        ) : isError ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Failed to load feature requests.
          </div>
        ) : enriched.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="No feature requests yet"
            description="Have an idea that could make GreenGuard AI better? Be the first to suggest it."
            action={
              <button
                onClick={onSubmitNew}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Request a Feature
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {enriched.map((feature) => (
              <FeatureCard
                key={feature._id}
                feature={feature}
                onVote={handleVote}
                onSelect={setSelected}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 6. Submit Feature Request Form ──────────────────────────────────────────

function SubmitFeatureForm({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: () => void;
}) {
  const { submit, isSubmitting, submitted, reset } = useCreateFeatureRequest();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [useCase, setUseCase] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim() || title.length < 5) e.title = "Title must be at least 5 characters";
    if (!description.trim() || description.length < 10)
      e.description = "Description must be at least 10 characters";
    if (!category) e.category = "Please select a category";
    if (!useCase.trim() || useCase.length < 10)
      e.useCase = "Please explain why this would be useful";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags((prev) => [...prev, t]);
      setTagInput("");
    }
  };

  const handleSubmit = () => {
    if (!validate() || isSubmitting) return;
    submit({ title, description, category, useCase, tags });
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <SuccessState
          title="Feature Request Submitted!"
          description="Thank you for contributing to GreenGuard AI. Our product team reviews community requests regularly."
          detail="Your request will be visible in the feature list shortly."
          onReset={() => {
            reset();
            onSuccess();
          }}
          resetLabel="View Feature Requests"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Back to Feedback & Features
      </button>

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Submit a Feature Request</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Describe the capability or enhancement you'd like to see in GreenGuard AI.
          </p>
        </div>

        <div className="space-y-4">
          <FormField label="Feature Title" required>
            <FormInput
              value={title}
              onChange={setTitle}
              placeholder="e.g., Regional Wildfire Smoke Spread Simulation"
            />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
          </FormField>

          <FormField label="Platform Area" required>
            <FormSelect
              value={category}
              onChange={setCategory}
              options={FEATURE_CATEGORIES}
              placeholder="Select relevant area of GreenGuard AI"
            />
            {errors.category && (
              <p className="text-xs text-destructive mt-1">{errors.category}</p>
            )}
          </FormField>

          <FormField label="Description" required>
            <FormTextarea
              value={description}
              onChange={setDescription}
              placeholder="Describe the requested capability in detail. What should it calculate, display, or automate?"
              rows={4}
            />
            {errors.description && (
              <p className="text-xs text-destructive mt-1">{errors.description}</p>
            )}
          </FormField>

          <FormField label="Why would this be useful?" required>
            <FormTextarea
              value={useCase}
              onChange={setUseCase}
              placeholder="Explain how this helps environmental monitoring, citizen awareness, or authority compliance…"
              rows={3}
            />
            {errors.useCase && <p className="text-xs text-destructive mt-1">{errors.useCase}</p>}
          </FormField>

          <div className="flex flex-col sm:flex-row gap-3 pt-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Lightbulb className="size-4" />
              )}
              {isSubmitting ? "Submitting…" : "Submit Request"}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 7. Problem / Bug Reporting Section ───────────────────────────────────────

function ProblemReportSection({ onBack }: { onBack: () => void }) {
  const [subView, setSubView] = useState<"form" | "list">("form");
  const { submitBug, isSubmitting, submitted, reset } = useBugReports();
  const { data: bugData, isLoading: bugsLoading } = useBugList();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(BUG_CATEGORIES[0] || "Environmental Data & AQI Calculations");
  const [severity, setSeverity] = useState<BugSeverity>("minor");
  const [platform, setPlatform] = useState(PLATFORMS[0] || "Web");
  const [browser, setBrowser] = useState(BROWSERS[0] || "Chrome");
  const [device, setDevice] = useState(DEVICES[0] || "Desktop");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim() || title.length < 5) e.title = "Title must be at least 5 characters";
    if (!steps.trim()) e.steps = "Please describe the steps to reproduce the issue";
    if (!actual.trim()) e.actual = "Please describe what happened";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate() || isSubmitting) return;
    submitBug({
      title,
      category,
      severity,
      platform,
      browser,
      device,
      steps,
      expected,
      actual,
    });
  };

  const handleReset = () => {
    reset();
    setTitle("");
    setSteps("");
    setExpected("");
    setActual("");
    setErrors({});
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <SuccessState
          title="Problem Report Submitted"
          description="Thank you for reporting this issue. Our platform engineering team will investigate it promptly."
          detail="We track all reported environmental anomalies, calculation issues, and UI problems to improve reliability."
          onReset={handleReset}
          resetLabel="Report Another Problem"
        />
      </div>
    );
  }

  const reportedBugs: BugReportDTO[] = bugData?.reports ?? [];

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Back to Feedback & Features
      </button>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Report a Problem</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Found something that doesn't work as expected? Tell us what happened so we can
              investigate.
            </p>
          </div>
          <div className="flex gap-1 p-1 rounded-xl border border-border bg-muted/30 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setSubView("form")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                subView === "form"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Submit Issue
            </button>
            <button
              onClick={() => setSubView("list")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                subView === "list"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Reported Issues ({reportedBugs.length})
            </button>
          </div>
        </div>

        {subView === "form" ? (
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5">
            <FormField label="Problem Title" required>
              <FormInput
                value={title}
                onChange={setTitle}
                placeholder="e.g., Station Belagavi-04 PM2.5 readings not plotting on GIS layer"
              />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Affected Area" required>
                <FormSelect
                  value={category}
                  onChange={setCategory}
                  options={BUG_CATEGORIES}
                  placeholder="Select area"
                />
              </FormField>
              <FormField label="Severity">
                <FormSelect
                  value={severity}
                  onChange={(v) => setSeverity(v as BugSeverity)}
                  options={["minor", "major", "critical", "blocker"]}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Platform">
                <FormSelect
                  value={platform}
                  onChange={setPlatform}
                  options={PLATFORMS}
                  placeholder="Platform"
                />
              </FormField>
              <FormField label="Browser">
                <FormSelect
                  value={browser}
                  onChange={setBrowser}
                  options={BROWSERS}
                  placeholder="Browser"
                />
              </FormField>
              <FormField label="Device">
                <FormSelect
                  value={device}
                  onChange={setDevice}
                  options={DEVICES}
                  placeholder="Device"
                />
              </FormField>
            </div>

            <FormField label="Steps to Reproduce" required>
              <FormTextarea
                value={steps}
                onChange={setSteps}
                placeholder="1. Open Smart Map at /map&#10;2. Toggle the PM2.5 sensor layer&#10;3. Select Belagavi Industrial Area station…"
                rows={4}
              />
              {errors.steps && <p className="text-xs text-destructive mt-1">{errors.steps}</p>}
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Expected Behavior">
                <FormTextarea
                  value={expected}
                  onChange={setExpected}
                  placeholder="e.g., Map marker should show the live AQI value and color code"
                  rows={3}
                />
              </FormField>
              <FormField label="Actual Behavior" required>
                <FormTextarea
                  value={actual}
                  onChange={setActual}
                  placeholder="e.g., Map shows 'N/A' or fails to render station popup"
                  rows={3}
                />
                {errors.actual && <p className="text-xs text-destructive mt-1">{errors.actual}</p>}
              </FormField>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Bug className="size-4" />
                )}
                {isSubmitting ? "Submitting…" : "Submit Report"}
              </button>
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {bugsLoading ? (
              <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm">Loading reported issues…</span>
              </div>
            ) : reportedBugs.length === 0 ? (
              <EmptyState
                icon={Bug}
                title="No reported issues"
                description="No bugs have been reported yet."
                action={
                  <button
                    onClick={() => setSubView("form")}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    Report a Problem
                  </button>
                }
              />
            ) : (
              reportedBugs.map((bug) => {
                const s = BUG_STATUS_STYLE[bug.status] ?? {
                  label: bug.status,
                  color: "var(--color-muted-foreground)",
                };
                return (
                  <div
                    key={bug._id}
                    className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        #{bug._id.slice(-6).toUpperCase()}
                      </span>
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          color: s.color,
                          background: `color-mix(in oklab, ${s.color} 10%, transparent)`,
                        }}
                      >
                        {s.label}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {bug.severity}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">{bug.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2">{bug.actual}</p>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root Feedback Center Page ────────────────────────────────────────────────

export function FeedbackCenterPage() {
  const [tab, setTab] = useState<FeedbackTab>("overview");

  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10 sm:space-y-12">
        <AnimatePresence mode="wait">
          {tab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10 sm:space-y-12"
            >
              {/* GreenGuard AI Hero */}
              <FeedbackHero
                onFeedback={() => setTab("submit-feedback")}
                onFeatureRequest={() => setTab("submit-feature")}
              />

              {/* 3 GreenGuard Specific Actions */}
              <ChooseActionSection onTab={setTab} />

              {/* GreenGuard AI Feature Requests Community Preview */}
              <section className="space-y-4">
                <div className="flex items-end justify-between gap-4 border-b border-border/60 pb-3">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                      GreenGuard AI Feature Requests
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      See what users would like to improve and help shape future GreenGuard AI
                      capabilities.
                    </p>
                  </div>
                  <button
                    onClick={() => setTab("feature-requests")}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group shrink-0"
                  >
                    <span>View all feature requests</span>
                    <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform duration-150" />
                  </button>
                </div>

                <FeatureRequestsPreview onVoteOrSelect={() => setTab("feature-requests")} />
              </section>
            </motion.div>
          )}

          {tab === "submit-feedback" && (
            <motion.div
              key="submit-feedback"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: DUR_SM, ease: EASE_OUT }}
            >
              <FeedbackForm onBack={() => setTab("overview")} />
            </motion.div>
          )}

          {tab === "feature-requests" && (
            <motion.div
              key="feature-requests"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: DUR_SM, ease: EASE_OUT }}
            >
              <FeatureRequestsBrowser
                onBack={() => setTab("overview")}
                onSubmitNew={() => setTab("submit-feature")}
              />
            </motion.div>
          )}

          {tab === "submit-feature" && (
            <motion.div
              key="submit-feature"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: DUR_SM, ease: EASE_OUT }}
            >
              <SubmitFeatureForm
                onBack={() => setTab("overview")}
                onSuccess={() => setTab("feature-requests")}
              />
            </motion.div>
          )}

          {tab === "report-problem" && (
            <motion.div
              key="report-problem"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: DUR_SM, ease: EASE_OUT }}
            >
              <ProblemReportSection onBack={() => setTab("overview")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Feature requests preview (overview section) ─────────────────────────────

function FeatureRequestsPreview({ onVoteOrSelect }: { onVoteOrSelect: () => void }) {
  const { features, isLoading, isError, hasVoted, getVotes, toggleVote } = useFeatureRequests();

  const top = useMemo(
    () =>
      features
        .slice(0, 3)
        .map((f) => ({ ...f, voted: hasVoted(f._id), voteCount: getVotes(f._id) })),
    [features, hasVoted, getVotes],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 gap-3 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Loading feature requests…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground">
        Failed to load feature requests.
      </div>
    );
  }

  if (top.length === 0) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="No feature requests yet"
        description="Have an idea that could make GreenGuard AI better? Be the first to suggest it."
        action={
          <button
            onClick={onVoteOrSelect}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Request a Feature
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {top.map((f) => (
        <FeatureCard
          key={f._id}
          feature={f}
          onVote={(id) => toggleVote(id)}
          onSelect={onVoteOrSelect}
        />
      ))}
    </div>
  );
}
