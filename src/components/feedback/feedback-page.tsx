import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquarePlus, Lightbulb, Star, ThumbsUp,
  Search, Filter, Plus, ArrowLeft, Check,
  Loader2, RefreshCw, Sparkles, ChevronLeft, ChevronRight,
  Tag, Calendar, TrendingUp, Package, Clock,
  X, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FADE_UP, STAGGER, DUR_MD, DUR_SM, EASE_OUT,
  HOVER_LIFT_SM, TAP_PRESS_SM,
} from "@/lib/motion";
import { SectionHeader, EmptyState } from "@/components/help-center/help-card";
import {
  FormField, FormInput, FormTextarea, FormSelect,
  StarRating, NpsSlider, SuccessState,
} from "@/components/help-center/support/support-ui";
import { FEATURE_STATUS_STYLE } from "@/components/help-center/support/support-data";
import {
  useFeatureRequests,
  useFeedback,
} from "@/components/help-center/support/support-store";
import type { FeatureRequestDTO } from "@/lib/api/support.api";
import { useCreateFeatureRequest } from "./feedback-store";

// ─── Constants ────────────────────────────────────────────────────────────────

const FEEDBACK_CATEGORIES = [
  "General Experience",
  "Help Center",
  "Knowledge Base",
  "Tutorials",
  "Support",
  "Smart Maps",
  "Environmental Monitoring",
  "GreenGuard Intelligence Center",
  "Account & Authentication",
  "Reports & Exports",
  "Notifications",
  "Other",
];

const FEATURE_CATEGORIES = [
  "UI/UX",
  "Environmental Monitoring",
  "Smart Maps",
  "GreenGuard Intelligence Center",
  "Authority Portal",
  "Citizen Portal",
  "Reports & Analytics",
  "Integrations",
  "Mobile",
  "Notifications",
  "Performance",
  "Other",
];

type FeedbackTab = "overview" | "submit-feedback" | "feature-requests" | "submit-feature";
type FeatureFilter = "all" | "planned" | "in_progress" | "shipped";

const STATUS_ICON = {
  submitted:   Clock,
  planned:     Calendar,
  in_progress: TrendingUp,
  shipped:     Package,
  declined:    X,
};

// ─── 1. Feedback Hub Hero ─────────────────────────────────────────────────────

function FeedbackHero({
  onFeedback,
  onFeatureRequest,
}: {
  onFeedback:       () => void;
  onFeatureRequest: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_MD, ease: EASE_OUT }}
      className="relative rounded-2xl overflow-hidden border border-border bg-card"
    >
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -right-20 size-64 rounded-full bg-primary/6 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 size-52 rounded-full bg-info/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.01]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative p-6 md:p-10">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <MessageSquarePlus className="size-3 text-primary" />
              <span className="text-[10px] uppercase tracking-[0.22em] text-primary font-semibold">
                Feedback & Feature Requests
              </span>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-4">
            Help us build a better GreenGuard
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mb-8">
            Share your experience, rate the platform, and vote on features you want to see.
            Every submission is reviewed by our product team.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <motion.button
              whileHover={HOVER_LIFT_SM}
              whileTap={TAP_PRESS_SM}
              onClick={onFeedback}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Star className="size-4" />
              Leave Feedback
            </motion.button>
            <motion.button
              whileHover={HOVER_LIFT_SM}
              whileTap={TAP_PRESS_SM}
              onClick={onFeatureRequest}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted transition-colors"
            >
              <Lightbulb className="size-4" />
              Request a Feature
            </motion.button>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-8 mt-8 border-t border-border">
            {[
              { value: "6",    label: "Feature requests active",  icon: Lightbulb  },
              { value: "24h",  label: "Average review time",      icon: Clock      },
              { value: "100%", label: "Submissions reviewed",     icon: Check      },
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

// ─── 2. Quick navigation cards ────────────────────────────────────────────────

function QuickNavCards({
  onTab,
}: {
  onTab: (tab: FeedbackTab) => void;
}) {
  const cards = [
    {
      tab:         "submit-feedback"  as FeedbackTab,
      icon:        Star,
      title:       "Rate Your Experience",
      description: "Share satisfaction, NPS score, and detailed written feedback",
      color:       "var(--color-warning)",
    },
    {
      tab:         "feature-requests" as FeedbackTab,
      icon:        Lightbulb,
      title:       "Feature Requests",
      description: "Browse, search, and vote on community feature requests",
      color:       "var(--color-primary)",
    },
    {
      tab:         "submit-feature"   as FeedbackTab,
      icon:        Plus,
      title:       "Submit a Request",
      description: "Propose a new feature or improvement to the product team",
      color:       "var(--color-success)",
    },
  ];

  return (
    <motion.div
      variants={STAGGER(0.06, 0.05)}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-3 gap-4"
    >
      {cards.map(({ tab, icon: Icon, title, description, color }) => (
        <motion.button
          key={tab}
          variants={FADE_UP}
          whileHover={HOVER_LIFT_SM}
          whileTap={TAP_PRESS_SM}
          onClick={() => onTab(tab)}
          className="text-left rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-all duration-200 group relative overflow-hidden"
        >
          <div
            className="absolute -bottom-6 -right-6 size-24 rounded-full opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-300 pointer-events-none"
            style={{ background: color }}
          />
          <div
            className="size-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: `color-mix(in oklab, ${color} 12%, transparent)` }}
          >
            <Icon className="size-5" style={{ color }} />
          </div>
          <h3 className="text-sm font-bold mb-1">{title}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        </motion.button>
      ))}
    </motion.div>
  );
}

// ─── 3. Feedback Submission Form ──────────────────────────────────────────────

function FeedbackForm({ onBack }: { onBack: () => void }) {
  const { submitted, isSubmitting, submitFeedback, reset } = useFeedback();

  const [rating,     setRating]     = useState(0);
  const [category,   setCategory]   = useState("");
  const [liked,      setLiked]      = useState("");
  const [improved,   setImproved]   = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [nps,        setNps]        = useState(-1);
  const [uiSat,      setUiSat]      = useState(0);
  const [supportSat, setSupportSat] = useState(0);
  const [docSat,     setDocSat]     = useState(0);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (rating === 0)    e.rating   = "Please rate your experience";
    if (!category)       e.category = "Please select a category";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate() || isSubmitting) return;
    const comment = [
      liked      && `What I liked:\n${liked}`,
      improved   && `What could be improved:\n${improved}`,
      suggestion && `Suggestion:\n${suggestion}`,
    ].filter(Boolean).join("\n\n");

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
    setRating(0); setCategory(""); setLiked(""); setImproved("");
    setSuggestion(""); setNps(-1); setUiSat(0); setSupportSat(0); setDocSat(0);
    setErrors({});
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        <SuccessState
          title="Thank You for Your Feedback!"
          description="Your input helps us improve GreenGuard for everyone. Our product team reviews every submission."
          detail="We typically follow up on detailed feedback within 5 business days."
          onReset={handleReset}
          resetLabel="Submit More Feedback"
        />
      </motion.div>
    );
  }

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
        Back to Feedback Center
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="xl:col-span-2">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="text-lg font-bold">Rate Your Experience</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your feedback shapes the product roadmap.
              </p>
            </div>

            <div className="p-5 space-y-6">
              {/* Overall rating */}
              <FormField label="Overall Rating" required>
                <div className="space-y-2">
                  <StarRating value={rating} onChange={setRating} />
                  {rating > 0 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-muted-foreground"
                    >
                      {["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]}
                    </motion.p>
                  )}
                  {errors.rating && (
                    <p className="text-xs text-destructive">{errors.rating}</p>
                  )}
                </div>
              </FormField>

              {/* Category */}
              <FormField label="Feedback Category" required>
                <FormSelect
                  value={category}
                  onChange={setCategory}
                  options={FEEDBACK_CATEGORIES}
                  placeholder="What area does your feedback cover?"
                />
                {errors.category && (
                  <p className="text-xs text-destructive mt-1">{errors.category}</p>
                )}
              </FormField>

              {/* Written feedback sections */}
              <FormField label="What did you like?">
                <FormTextarea
                  value={liked}
                  onChange={setLiked}
                  placeholder="Tell us what's working well…"
                  rows={3}
                />
              </FormField>

              <FormField label="What could be improved?">
                <FormTextarea
                  value={improved}
                  onChange={setImproved}
                  placeholder="What caused friction or confusion?…"
                  rows={3}
                />
              </FormField>

              <FormField label="Any suggestions?">
                <FormTextarea
                  value={suggestion}
                  onChange={setSuggestion}
                  placeholder="How would you improve it?…"
                  rows={3}
                />
              </FormField>

              {/* NPS */}
              <div>
                <div className="text-xs font-medium mb-2">
                  How likely are you to recommend GreenGuard?
                  <span className="text-muted-foreground ml-1">(0–10)</span>
                </div>
                <NpsSlider value={nps} onChange={setNps} />
              </div>

              {/* Area ratings */}
              <div>
                <div className="text-xs font-medium mb-3 uppercase tracking-[0.18em] text-muted-foreground">
                  Area Ratings (optional)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <FormField label="UI Satisfaction">
                    <StarRating value={uiSat} onChange={setUiSat} max={5} />
                  </FormField>
                  <FormField label="Support Satisfaction">
                    <StarRating value={supportSat} onChange={setSupportSat} max={5} />
                  </FormField>
                  <FormField label="Documentation">
                    <StarRating value={docSat} onChange={setDocSat} max={5} />
                  </FormField>
                </div>
              </div>

              {/* Submit */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <motion.button
                  whileHover={HOVER_LIFT_SM}
                  whileTap={TAP_PRESS_SM}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Submit feedback"
                >
                  {isSubmitting
                    ? <><Loader2 className="size-4 animate-spin" />Submitting…</>
                    : <><Star className="size-4" />Submit Feedback</>
                  }
                </motion.button>
                <button
                  onClick={onBack}
                  className="px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">
              Why Your Feedback Matters
            </div>
            <div className="space-y-3">
              {[
                { icon: Sparkles, text: "Shapes the product roadmap directly" },
                { icon: Star,     text: "Identifies what's working best"      },
                { icon: RefreshCw, text: "Prioritises improvements"           },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                  <Icon className="size-3.5 shrink-0 mt-0.5 text-primary/60" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">
              Privacy
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your feedback is submitted with your account but never shared publicly.
              Only the GreenGuard product team can see individual responses.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── 4. Feature Request Card ──────────────────────────────────────────────────

function FeatureCard({
  feature,
  onVote,
  onSelect,
  isVoting,
}: {
  feature:  FeatureRequestDTO;
  onVote:   (id: string) => void;
  onSelect: (f: FeatureRequestDTO) => void;
  isVoting: boolean;
}) {
  const style   = FEATURE_STATUS_STYLE[feature.status];
  const StatusIcon = STATUS_ICON[feature.status] ?? Clock;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: DUR_SM, ease: EASE_OUT }}
      whileHover={{ y: -1, transition: { duration: 0.15 } }}
      className="rounded-xl border border-border bg-background p-4 group"
    >
      <div className="flex items-start gap-4">
        {/* Vote button */}
        <motion.button
          whileTap={TAP_PRESS_SM}
          onClick={() => onVote(feature._id)}
          disabled={isVoting}
          className={cn(
            "flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border shrink-0 transition-all duration-200 min-w-[52px]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            feature.voted
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary",
            isVoting && "opacity-60 cursor-not-allowed",
          )}
          aria-label={`${feature.voted ? "Remove vote from" : "Vote for"} ${feature.title}`}
          aria-pressed={feature.voted}
        >
          <ThumbsUp className="size-3.5" />
          <span className="text-[11px] font-bold tabular-nums">{feature.voteCount}</span>
        </motion.button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span
              className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{
                color:      style.color,
                background: `color-mix(in oklab, ${style.color} 10%, transparent)`,
              }}
            >
              <StatusIcon className="size-2.5" />
              {style.label}
            </span>
            <span className="text-[10px] text-muted-foreground">{feature.category}</span>
            {feature.estimatedRelease && (
              <span className="text-[10px] text-muted-foreground">· {feature.estimatedRelease}</span>
            )}
          </div>

          <button
            onClick={() => onSelect(feature)}
            className="text-left group/title"
          >
            <h4 className="text-sm font-bold mb-1 group-hover/title:text-primary transition-colors duration-150 leading-snug">
              {feature.title}
            </h4>
          </button>

          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {feature.description}
          </p>

          {feature.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {feature.tags.slice(0, 4).map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground"
                >
                  <Tag className="size-2" />
                  {tag}
                </span>
              ))}
              {feature.tags.length > 4 && (
                <span className="text-[9px] text-muted-foreground">+{feature.tags.length - 4}</span>
              )}
            </div>
          )}
        </div>

        {/* Detail arrow */}
        <button
          onClick={() => onSelect(feature)}
          className="shrink-0 mt-0.5 text-muted-foreground/30 hover:text-primary transition-colors duration-150"
          aria-label={`View details for ${feature.title}`}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── 5. Feature Request Detail ────────────────────────────────────────────────

function FeatureDetail({
  feature,
  onBack,
  onVote,
  onSubmitNew,
}: {
  feature:     FeatureRequestDTO;
  onBack:      () => void;
  onVote:      (id: string) => void;
  onSubmitNew: () => void;
}) {
  const style      = FEATURE_STATUS_STYLE[feature.status];
  const StatusIcon = STATUS_ICON[feature.status] ?? Clock;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: DUR_MD, ease: EASE_OUT }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 group"
      >
        <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Back to Feature Requests
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="xl:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={{
                    color:      style.color,
                    background: `color-mix(in oklab, ${style.color} 12%, transparent)`,
                  }}
                >
                  <StatusIcon className="size-3" />
                  {style.label}
                </span>
                <span className="text-[10px] text-muted-foreground">{feature.category}</span>
                {feature.estimatedRelease && (
                  <span className="text-[10px] text-muted-foreground">· {feature.estimatedRelease}</span>
                )}
              </div>
              <h2 className="text-xl font-bold mb-2">{feature.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>

            <div className="p-5 space-y-4">
              {/* Tags */}
              {feature.tags.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {feature.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground"
                      >
                        <Tag className="size-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Submitted date */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="size-3.5" />
                <span>Submitted {new Date(feature.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric", month: "long", year: "numeric",
                })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Vote */}
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">
              Community Vote
            </div>
            <div className="text-4xl font-bold tabular-nums mb-1">{feature.voteCount}</div>
            <p className="text-xs text-muted-foreground mb-4">
              {feature.voteCount === 1 ? "person wants" : "people want"} this feature
            </p>
            <motion.button
              whileHover={HOVER_LIFT_SM}
              whileTap={TAP_PRESS_SM}
              onClick={() => onVote(feature._id)}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                feature.voted
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-foreground hover:border-primary/40 hover:bg-primary/5",
              )}
              aria-pressed={feature.voted}
            >
              <ThumbsUp className={cn("size-4", feature.voted && "fill-current")} />
              {feature.voted ? "Voted" : "Vote for this"}
            </motion.button>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">
              Status
            </div>
            <div className="space-y-3">
              {(["submitted", "planned", "in_progress", "shipped"] as const).map(s => {
                const isActive  = feature.status === s;
                const isDone    = ["shipped"].includes(feature.status) && s !== "shipped"
                  ? true
                  : false;
                const st        = FEATURE_STATUS_STYLE[s];
                const SIcon     = STATUS_ICON[s];
                return (
                  <div key={s} className={cn("flex items-center gap-2.5 text-xs", isActive ? "text-foreground font-semibold" : "text-muted-foreground")}>
                    <div
                      className={cn(
                        "size-6 rounded-full flex items-center justify-center shrink-0",
                        isActive ? "text-primary-foreground" : "bg-muted",
                      )}
                      style={isActive ? { background: st.color } : {}}
                    >
                      <SIcon className="size-3" />
                    </div>
                    <span>{st.label}</span>
                    {isDone && <Check className="size-3 text-success ml-auto" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Submit similar */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">
              Have a similar idea?
            </div>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              If this request doesn't exactly match what you need, submit your own variation.
            </p>
            <button
              onClick={onSubmitNew}
              className="w-full text-xs py-2 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              Submit a new request
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── 6. Feature Requests Browser ─────────────────────────────────────────────

function FeatureRequestsBrowser({
  onBack,
  onSubmitNew,
}: {
  onBack:      () => void;
  onSubmitNew: () => void;
}) {
  const [filter,  setFilter]  = useState<FeatureFilter>("all");
  const [search,  setSearch]  = useState("");
  const [selected, setSelected] = useState<FeatureRequestDTO | null>(null);

  const { features, isLoading, isError, hasVoted, getVotes, toggleVote } = useFeatureRequests(
    filter !== "all" ? { status: filter } : undefined,
  );

  // Client-side search
  const filtered = useMemo(() => {
    if (!search.trim()) return features;
    const q = search.toLowerCase();
    return features.filter(
      f =>
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        f.tags.some(t => t.toLowerCase().includes(q)),
    );
  }, [features, search]);

  // Merge voted/votes into filtered list
  const enrichedFiltered = useMemo(
    () => filtered.map(f => ({ ...f, voted: hasVoted(f._id), voteCount: getVotes(f._id) })),
    [filtered, hasVoted, getVotes],
  );

  const handleVote = useCallback((id: string) => {
    toggleVote(id);
  }, [toggleVote]);

  // If a feature is selected, show detail view
  if (selected) {
    const live = enrichedFiltered.find(f => f._id === selected._id) ?? selected;
    return (
      <FeatureDetail
        feature={live}
        onBack={() => setSelected(null)}
        onVote={handleVote}
        onSubmitNew={onSubmitNew}
      />
    );
  }

  const filterCounts = {
    all:         features.length,
    planned:     features.filter(f => f.status === "planned").length,
    in_progress: features.filter(f => f.status === "in_progress").length,
    shipped:     features.filter(f => f.status === "shipped").length,
  };

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
        Back to Feedback Center
      </button>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h2 className="text-xl font-bold">Feature Requests</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Browse and vote on features the community wants.
            </p>
          </div>
          <motion.button
            whileHover={HOVER_LIFT_SM}
            whileTap={TAP_PRESS_SM}
            onClick={onSubmitNew}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shrink-0 self-start sm:self-auto"
          >
            <Plus className="size-3.5" />
            New Request
          </motion.button>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search input */}
          <div className="flex-1 flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-2.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all group">
            <Search className="size-4 text-muted-foreground shrink-0 group-focus-within:text-primary transition-colors" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, category, or tag…"
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
              aria-label="Search feature requests"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div
            className="flex gap-1 p-1 rounded-xl border border-border bg-muted/30 overflow-x-auto shrink-0"
            role="radiogroup"
            aria-label="Filter by status"
          >
            {(["all", "planned", "in_progress", "shipped"] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                role="radio"
                aria-checked={filter === s}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0",
                  filter === s
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s === "all"         ? `All (${filterCounts.all})`
                 : s === "in_progress" ? `In Progress (${filterCounts.in_progress})`
                 : `${s.charAt(0).toUpperCase() + s.slice(1)} (${filterCounts[s]})`}
              </button>
            ))}
          </div>
        </div>

        {/* Search result note */}
        {search.trim() && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="size-3.5" />
            <span>
              {enrichedFiltered.length} result{enrichedFiltered.length !== 1 ? "s" : ""} for "
              {search}"
            </span>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Loading feature requests…</span>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Failed to load feature requests.</p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted transition-colors"
            >
              <RefreshCw className="size-3.5" /> Retry
            </button>
          </div>
        )}

        {/* Feature list */}
        {!isLoading && !isError && (
          <AnimatePresence mode="popLayout">
            {enrichedFiltered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <EmptyState
                  icon={search ? Search : Lightbulb}
                  title={search ? "No matching requests" : "No feature requests yet"}
                  description={
                    search
                      ? `No results for "${search}". Try different keywords or clear the search.`
                      : "Be the first to submit a feature request!"
                  }
                  action={
                    search ? (
                      <button
                        onClick={() => setSearch("")}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                      >
                        Clear Search
                      </button>
                    ) : (
                      <button
                        onClick={onSubmitNew}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                      >
                        Submit First Request
                      </button>
                    )
                  }
                />
              </motion.div>
            ) : (
              <motion.div
                key={`${filter}-${search}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {enrichedFiltered.map(feature => (
                  <FeatureCard
                    key={feature._id}
                    feature={feature}
                    onVote={handleVote}
                    onSelect={setSelected}
                    isVoting={false}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

// ─── 7. Submit Feature Request Form ──────────────────────────────────────────

function SubmitFeatureForm({
  onBack,
  onSuccess,
}: {
  onBack:     () => void;
  onSuccess:  () => void;
}) {
  const { features } = useFeatureRequests();
  const { submit, isSubmitting, submitted, newFeature, reset } = useCreateFeatureRequest();

  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [category,    setCategory]    = useState("");
  const [useCase,     setUseCase]     = useState("");
  const [tagInput,    setTagInput]    = useState("");
  const [tags,        setTags]        = useState<string[]>([]);
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  // Duplicate detection — simple title similarity
  const similarRequests = useMemo(() => {
    if (title.trim().length < 5) return [];
    const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (words.length === 0) return [];
    return features
      .filter(f =>
        words.some(w => f.title.toLowerCase().includes(w) || f.description.toLowerCase().includes(w)),
      )
      .slice(0, 3);
  }, [title, features]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim() || title.length < 5)       e.title       = "Title must be at least 5 characters";
    if (!description.trim() || description.length < 10) e.description = "Description must be at least 10 characters";
    if (!category)                                e.category    = "Please select a category";
    if (!useCase.trim() || useCase.length < 10)  e.useCase     = "Please explain why this would be useful";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags(prev => [...prev, t]);
      setTagInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = () => {
    if (!validate() || isSubmitting) return;
    submit({ title, description, category, useCase, tags });
  };

  const handleReset = () => {
    reset();
    setTitle(""); setDescription(""); setCategory(""); setUseCase("");
    setTagInput(""); setTags([]); setErrors({});
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <SuccessState
          title="Feature Request Submitted!"
          description="Thank you for contributing to GreenGuard. Our product team reviews every submission and community votes influence prioritisation."
          detail="You'll see your request appear in the feature list shortly."
          onReset={() => { handleReset(); onSuccess(); }}
          resetLabel="View Feature Requests"
        />
      </div>
    );
  }

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
        Back to Feedback Center
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Form */}
        <div className="xl:col-span-2 space-y-5">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="text-lg font-bold">Submit a Feature Request</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Describe the feature you'd like to see added or improved.
              </p>
            </div>

            <div className="p-5 space-y-5">
              {/* Title */}
              <FormField label="Feature Title" required>
                <FormInput
                  value={title}
                  onChange={setTitle}
                  placeholder="A concise, descriptive title for your request"
                />
                {errors.title && (
                  <p className="text-xs text-destructive mt-1">{errors.title}</p>
                )}
              </FormField>

              {/* Duplicate detection */}
              <AnimatePresence>
                {similarRequests.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="size-4 text-warning shrink-0" />
                        <span className="text-xs font-semibold text-warning">Similar requests found</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        These requests might cover what you need. Consider voting instead of creating a duplicate.
                      </p>
                      <div className="space-y-2">
                        {similarRequests.map(sr => {
                          const srStyle = FEATURE_STATUS_STYLE[sr.status];
                          return (
                            <div key={sr._id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-background border border-border">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate">{sr.title}</p>
                                <span
                                  className="text-[9px] font-bold"
                                  style={{ color: srStyle.color }}
                                >
                                  {srStyle.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                                <ThumbsUp className="size-3" />
                                <span className="font-bold">{sr.voteCount}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-3">
                        You can still submit your own request below if none of these match.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Category */}
              <FormField label="Category" required>
                <FormSelect
                  value={category}
                  onChange={setCategory}
                  options={FEATURE_CATEGORIES}
                  placeholder="Which area does this relate to?"
                />
                {errors.category && (
                  <p className="text-xs text-destructive mt-1">{errors.category}</p>
                )}
              </FormField>

              {/* Description */}
              <FormField label="Description" required>
                <FormTextarea
                  value={description}
                  onChange={setDescription}
                  placeholder="Describe the feature in detail. What should it do? How should it work?"
                  rows={5}
                />
                {errors.description && (
                  <p className="text-xs text-destructive mt-1">{errors.description}</p>
                )}
              </FormField>

              {/* Use case */}
              <FormField label="Why would this be useful?" required>
                <FormTextarea
                  value={useCase}
                  onChange={setUseCase}
                  placeholder="Explain the problem this solves or the value it would add…"
                  rows={3}
                />
                {errors.useCase && (
                  <p className="text-xs text-destructive mt-1">{errors.useCase}</p>
                )}
              </FormField>

              {/* Tags */}
              <FormField label="Tags (optional, up to 5)">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a tag and press Enter or comma…"
                      maxLength={50}
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 placeholder:text-muted-foreground/60 transition-colors"
                      aria-label="Add tag"
                    />
                    <button
                      onClick={handleAddTag}
                      disabled={!tagInput.trim() || tags.length >= 5}
                      className="px-3 py-2 rounded-lg border border-border text-xs hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map(t => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                        >
                          <Tag className="size-2.5" />
                          {t}
                          <button
                            onClick={() => setTags(prev => prev.filter(x => x !== t))}
                            className="ml-0.5 hover:text-destructive transition-colors"
                            aria-label={`Remove tag ${t}`}
                          >
                            <X className="size-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </FormField>

              {/* Submit */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <motion.button
                  whileHover={HOVER_LIFT_SM}
                  whileTap={TAP_PRESS_SM}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Submit feature request"
                >
                  {isSubmitting
                    ? <><Loader2 className="size-4 animate-spin" />Submitting…</>
                    : <><Lightbulb className="size-4" />Submit Request</>
                  }
                </motion.button>
                <button
                  onClick={onBack}
                  className="px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">
              Writing a good request
            </div>
            <ul className="space-y-2.5">
              {[
                "Be specific — name the exact screen or workflow",
                "Describe the problem, not just the solution",
                "Explain who would benefit",
                "Include a use case or example scenario",
                "Add relevant tags to help discoverability",
              ].map(tip => (
                <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <div className="size-1.5 rounded-full bg-primary/50 shrink-0 mt-1.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">
              Status flow
            </div>
            {(["submitted", "planned", "in_progress", "shipped"] as const).map((s, i) => {
              const st   = FEATURE_STATUS_STYLE[s];
              const SIcon = STATUS_ICON[s];
              return (
                <div key={s} className="flex items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
                  <SIcon className="size-3 shrink-0" style={{ color: st.color }} />
                  <span className="text-xs font-semibold" style={{ color: st.color }}>{st.label}</span>
                  {i < 3 && <ChevronRight className="size-3 text-muted-foreground ml-auto" />}
                  {i === 3 && <Check className="size-3 text-success ml-auto" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Root Page ────────────────────────────────────────────────────────────────

export function FeedbackCenterPage() {
  const [tab, setTab] = useState<FeedbackTab>("overview");

  const handleTab = useCallback((t: FeedbackTab) => setTab(t), []);

  return (
    <div className="p-4 md:p-6 xl:p-8 max-w-none space-y-8 pb-16">
      <AnimatePresence mode="wait">
        {tab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR_SM }}
            className="space-y-8"
          >
            {/* Hero */}
            <FeedbackHero
              onFeedback={() => handleTab("submit-feedback")}
              onFeatureRequest={() => handleTab("submit-feature")}
            />

            {/* Quick nav */}
            <section>
              <SectionHeader
                eyebrow="What would you like to do?"
                title="Choose an Action"
                description="Submit feedback, vote on features, or propose something new"
              />
              <QuickNavCards onTab={handleTab} />
            </section>

            {/* Recent feature requests preview */}
            <section>
              <SectionHeader
                eyebrow="Community"
                title="Top Feature Requests"
                description="The most-voted features from the community"
                action={
                  <button
                    onClick={() => handleTab("feature-requests")}
                    className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                  >
                    View all <ChevronRight className="size-3" />
                  </button>
                }
              />
              <FeatureRequestsPreview
                onVoteOrSelect={() => handleTab("feature-requests")}
              />
            </section>
          </motion.div>
        )}

        {tab === "submit-feedback" && (
          <motion.div
            key="submit-feedback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR_SM }}
          >
            <FeedbackForm onBack={() => handleTab("overview")} />
          </motion.div>
        )}

        {tab === "feature-requests" && (
          <motion.div
            key="feature-requests"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR_SM }}
          >
            <FeatureRequestsBrowser
              onBack={() => handleTab("overview")}
              onSubmitNew={() => handleTab("submit-feature")}
            />
          </motion.div>
        )}

        {tab === "submit-feature" && (
          <motion.div
            key="submit-feature"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR_SM }}
          >
            <SubmitFeatureForm
              onBack={() => handleTab("overview")}
              onSuccess={() => handleTab("feature-requests")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Feature requests preview (overview section) ─────────────────────────────

function FeatureRequestsPreview({ onVoteOrSelect }: { onVoteOrSelect: () => void }) {
  const { features, isLoading, isError, hasVoted, getVotes, toggleVote } = useFeatureRequests();

  const top = useMemo(
    () => features.slice(0, 3).map(f => ({ ...f, voted: hasVoted(f._id), voteCount: getVotes(f._id) })),
    [features, hasVoted, getVotes],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Failed to load feature requests.
      </div>
    );
  }

  if (top.length === 0) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="No feature requests yet"
        description="Be the first to submit one!"
      />
    );
  }

  return (
    <div className="space-y-3">
      {top.map(f => (
        <FeatureCard
          key={f._id}
          feature={f}
          onVote={id => { toggleVote(id); }}
          onSelect={onVoteOrSelect}
          isVoting={false}
        />
      ))}
    </div>
  );
}
