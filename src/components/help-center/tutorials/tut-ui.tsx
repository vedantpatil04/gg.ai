import { type ReactNode } from "react";
import {
  Play, List, Zap, GraduationCap, Bookmark, BookmarkCheck,
  Clock, Eye, Star, ChevronRight, Check, Search, Lock,
  Award, Download,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HOVER_LIFT_SM, TAP_PRESS_SM, FADE_UP, STAGGER } from "@/lib/motion";
import type { Tutorial, LearningPath, TutDifficulty, TutFormat } from "./tut-data";
import {
  TUT_DIFFICULTY_COLOR,
  TUT_FORMAT_LABEL,
  TUT_FORMAT_ICON,
  TUT_CATEGORIES_BY_ID,
} from "./tut-data";
import { useTutBookmarks, useTutProgress } from "./tut-store";

// ─── Difficulty badge ─────────────────────────────────────────────────────────

export function TutDifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: TutDifficulty;
  className?: string;
}) {
  return (
    <span
      className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full", className)}
      style={{
        color: TUT_DIFFICULTY_COLOR[difficulty],
        background: `color-mix(in oklab, ${TUT_DIFFICULTY_COLOR[difficulty]} 12%, transparent)`,
      }}
    >
      {difficulty}
    </span>
  );
}

// ─── Format badge ─────────────────────────────────────────────────────────────

export function FormatBadge({ format }: { format: TutFormat }) {
  const Icon = TUT_FORMAT_ICON[format];
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
      <Icon className="size-2.5" />
      {TUT_FORMAT_LABEL[format]}
    </span>
  );
}

// ─── Rating stars ─────────────────────────────────────────────────────────────

export function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5 text-[10px]">
      <Star className="size-3 fill-warning text-warning" />
      <span className="font-semibold tabular-nums">{rating.toFixed(1)}</span>
    </span>
  );
}

// ─── Bookmark button ──────────────────────────────────────────────────────────

export function TutBookmarkButton({
  tutorialId,
  size = "md",
  className,
}: {
  tutorialId: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const { toggleBookmark, isBookmarked } = useTutBookmarks();
  const saved = isBookmarked(tutorialId);
  const Icon = saved ? BookmarkCheck : Bookmark;

  return (
    <motion.button
      whileTap={TAP_PRESS_SM}
      onClick={e => { e.stopPropagation(); toggleBookmark(tutorialId); }}
      aria-label={saved ? "Remove bookmark" : "Bookmark tutorial"}
      className={cn(
        "rounded-lg flex items-center justify-center transition-colors duration-200",
        size === "sm" ? "size-7" : "size-8",
        saved
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground/50 hover:text-foreground hover:bg-muted",
        className,
      )}
    >
      <Icon className={size === "sm" ? "size-3.5" : "size-4"} />
    </motion.button>
  );
}

// ─── Tutorial card ────────────────────────────────────────────────────────────

interface TutCardProps {
  tutorial: Tutorial;
  onClick: () => void;
  variant?: "default" | "horizontal" | "compact";
}

export function TutCard({ tutorial, onClick, variant = "default" }: TutCardProps) {
  const { getStepPercent, isTutorialComplete } = useTutProgress();
  const percent = getStepPercent(tutorial.id, tutorial.steps.length);
  const complete = isTutorialComplete(tutorial.id);
  const cat = TUT_CATEGORIES_BY_ID[tutorial.categoryId];

  if (variant === "compact") {
    return (
      <motion.button
        whileHover={HOVER_LIFT_SM}
        whileTap={TAP_PRESS_SM}
        onClick={onClick}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors duration-150 text-left group"
      >
        <div
          className="size-6 rounded-md flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in oklab, ${cat?.accentColor ?? "var(--color-primary)"} 12%, transparent)` }}
        >
          {(() => { const Icon = TUT_FORMAT_ICON[tutorial.format]; return <div style={{ color: cat?.accentColor ?? "var(--color-primary)" }}><Icon className="size-3.5" /></div>; })()}
        </div>
        <span className="flex-1 text-sm text-muted-foreground group-hover:text-foreground truncate transition-colors">
          {tutorial.title}
        </span>
        <span className="text-[10px] text-muted-foreground/60 shrink-0">{tutorial.duration}</span>
      </motion.button>
    );
  }

  if (variant === "horizontal") {
    return (
      <motion.div
        whileHover={HOVER_LIFT_SM}
        whileTap={TAP_PRESS_SM}
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onClick(); }}
        className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/20 transition-all duration-200 group"
      >
        {/* Format icon */}
        <div
          className="size-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in oklab, ${cat?.accentColor ?? "var(--color-primary)"} 12%, transparent)` }}
        >
          {(() => { const Icon = TUT_FORMAT_ICON[tutorial.format]; return <div style={{ color: cat?.accentColor ?? "var(--color-primary)" }}><Icon className="size-5" /></div>; })()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
              {cat?.title ?? tutorial.categoryId}
            </span>
            <TutDifficultyBadge difficulty={tutorial.difficulty} />
            <FormatBadge format={tutorial.format} />
          </div>
          <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors duration-200 mb-1">
            {tutorial.title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{tutorial.description}</p>
          <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground/70 flex-wrap">
            <span className="flex items-center gap-1"><Clock className="size-3" />{tutorial.duration}</span>
            <span className="flex items-center gap-1"><Eye className="size-3" />{tutorial.views.toLocaleString()}</span>
            <RatingStars rating={tutorial.rating} />
            {tutorial.certificate && (
              <span className="flex items-center gap-1 text-warning"><Award className="size-3" />Certificate</span>
            )}
          </div>
          {percent > 0 && !complete && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden max-w-[120px]">
                <div className="h-full aurora rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground">{percent}% done</span>
            </div>
          )}
          {complete && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-success font-medium">
              <Check className="size-3" /> Completed
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <TutBookmarkButton tutorialId={tutorial.id} size="sm" />
          <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
        </div>
      </motion.div>
    );
  }

  // default grid card
  return (
    <motion.div
      whileHover={HOVER_LIFT_SM}
      whileTap={TAP_PRESS_SM}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/20 transition-all duration-200 group relative overflow-hidden"
    >
      <div className="absolute -bottom-8 -right-8 size-28 rounded-full bg-primary/5 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300 pointer-events-none" />

      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div
          className="size-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in oklab, ${cat?.accentColor ?? "var(--color-primary)"} 12%, transparent)` }}
        >
          {(() => { const Icon = TUT_FORMAT_ICON[tutorial.format]; return <div style={{ color: cat?.accentColor ?? "var(--color-primary)" }}><Icon className="size-4" /></div>; })()}
        </div>
        <TutBookmarkButton tutorialId={tutorial.id} size="sm" />
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1 mb-2">
        <TutDifficultyBadge difficulty={tutorial.difficulty} />
        <FormatBadge format={tutorial.format} />
        {tutorial.certificate && (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-warning/30 text-warning">
            <Award className="size-2.5" />Cert
          </span>
        )}
      </div>

      <h3 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors duration-200 mb-1.5">
        {tutorial.title}
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">{tutorial.description}</p>

      {/* Meta */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70 flex-wrap">
        <span className="flex items-center gap-1"><Clock className="size-3" />{tutorial.duration}</span>
        <span className="flex items-center gap-1"><List className="size-3" />{tutorial.steps.length} steps</span>
        <RatingStars rating={tutorial.rating} />
      </div>

      {/* Progress bar */}
      {percent > 0 && !complete && (
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Progress</span><span>{percent}%</span>
          </div>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full aurora rounded-full transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}
      {complete && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-success font-semibold">
          <Check className="size-3" /> Completed
        </div>
      )}
    </motion.div>
  );
}

// ─── Tutorial grid ────────────────────────────────────────────────────────────

export function TutGrid({
  tutorials,
  onTutorialClick,
  variant = "default",
  emptySlot,
}: {
  tutorials: Tutorial[];
  onTutorialClick: (id: string) => void;
  variant?: "default" | "horizontal";
  emptySlot?: ReactNode;
}) {
  if (tutorials.length === 0) return <>{emptySlot}</>;
  const isHorizontal = variant === "horizontal";

  return (
    <motion.div
      variants={STAGGER(0.05, 0.05)}
      initial="hidden"
      animate="show"
      className={cn(isHorizontal ? "space-y-3" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4")}
    >
      {tutorials.map(t => (
        <motion.div key={t.id} variants={FADE_UP}>
          <TutCard tutorial={t} onClick={() => onTutorialClick(t.id)} variant={isHorizontal ? "horizontal" : "default"} />
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── Learning Path card ───────────────────────────────────────────────────────

export function LearningPathCard({
  path,
  completedCount,
  onClick,
}: {
  path: LearningPath;
  completedCount: number;
  onClick: () => void;
}) {
  const Icon = path.icon;
  const pct = path.tutorialIds.length > 0
    ? Math.round((completedCount / path.tutorialIds.length) * 100)
    : 0;

  return (
    <motion.div
      whileHover={HOVER_LIFT_SM}
      whileTap={TAP_PRESS_SM}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className="rounded-xl border border-border bg-card p-5 cursor-pointer hover:border-primary/30 transition-all duration-200 group relative overflow-hidden"
    >
      <div
        className="absolute -top-10 -right-10 size-36 rounded-full opacity-0 group-hover:opacity-8 blur-2xl transition-opacity duration-300 pointer-events-none"
        style={{ background: path.accentColor }}
      />

      <div className="flex items-start gap-3 mb-4">
        <div
          className="size-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in oklab, ${path.accentColor} 12%, transparent)` }}
        >
          <div style={{ color: path.accentColor }}>
            <Icon className="size-5" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-0.5">
            {path.targetRole}
          </div>
          <h3 className="text-sm font-semibold leading-snug">{path.title}</h3>
        </div>
        <TutDifficultyBadge difficulty={path.difficulty} className="shrink-0 mt-0.5" />
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed mb-4">{path.description}</p>

      <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70 mb-4">
        <span className="flex items-center gap-1"><Clock className="size-3" />{path.estimatedHours}h estimated</span>
        <span className="flex items-center gap-1"><List className="size-3" />{path.tutorialIds.length} tutorials</span>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
          <span>{completedCount}/{path.tutorialIds.length} completed</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: path.accentColor }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          />
        </div>
      </div>

      {pct === 100 && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-success font-semibold">
          <Award className="size-3.5" /> Path Complete
        </div>
      )}
    </motion.div>
  );
}

// ─── Tutorial search input ────────────────────────────────────────────────────

export function TutSearchInput({
  value,
  onChange,
  placeholder = "Search tutorials…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5",
        "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10",
        "transition-all duration-200 group",
        className,
      )}
    >
      <Search className="size-4 text-muted-foreground shrink-0 group-focus-within:text-primary transition-colors" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
        aria-label={placeholder}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="size-5 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors shrink-0"
          aria-label="Clear search"
        >
          <span className="text-[10px] text-muted-foreground">✕</span>
        </button>
      )}
    </div>
  );
}

// ─── Step type icon ───────────────────────────────────────────────────────────

export function StepTypeIcon({
  type,
  size = "sm",
}: {
  type: "read" | "watch" | "practice" | "quiz";
  size?: "sm" | "md";
}) {
  const map = {
    read:     { icon: List,  color: "var(--color-info)",    label: "Read"     },
    watch:    { icon: Play,  color: "var(--color-primary)", label: "Watch"    },
    practice: { icon: Zap,   color: "var(--color-warning)", label: "Practice" },
    quiz:     { icon: Check, color: "var(--color-success)", label: "Quiz"     },
  };
  const { icon: Icon, color, label } = map[type];
  const s = size === "sm" ? "size-3.5" : "size-4";

  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
      style={{ color, background: `color-mix(in oklab, ${color} 12%, transparent)` }}
    >
      <Icon className={s} />
      {label}
    </span>
  );
}

// ─── Certificate badge ────────────────────────────────────────────────────────

export function CertificateBadge({ tutorialId }: { tutorialId: string }) {
  const { isTutorialComplete } = useTutProgress();
  const isComplete = isTutorialComplete(tutorialId);

  return (
    <div className={cn(
      "rounded-xl border p-4 flex items-center gap-3",
      isComplete
        ? "border-warning/40 bg-warning/5"
        : "border-border bg-muted/30",
    )}>
      <div className={cn(
        "size-10 rounded-xl flex items-center justify-center shrink-0",
        isComplete ? "bg-warning/15" : "bg-muted",
      )}>
        {isComplete ? (
          <Award className="size-5 text-warning" />
        ) : (
          <Lock className="size-5 text-muted-foreground/40" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold">
          {isComplete ? "Certificate of Completion" : "Certificate Available"}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {isComplete
            ? "You've completed this tutorial. Download your certificate below."
            : "Complete all steps to unlock your certificate of completion."}
        </div>
      </div>
      {isComplete && (
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/30 text-warning text-[11px] font-semibold hover:bg-warning/20 transition-colors shrink-0">
          <Download className="size-3.5" />
          Download
        </button>
      )}
    </div>
  );
}

// ─── Prerequisite check list ──────────────────────────────────────────────────

export function PrerequisiteList({
  prerequisites,
  onTutorialClick,
}: {
  prerequisites: string[];
  onTutorialClick: (id: string) => void;
}) {
  const { isTutorialComplete } = useTutProgress();
  if (prerequisites.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">
        Prerequisites
      </div>
      <div className="space-y-2">
        {prerequisites.map(id => {
          const done = isTutorialComplete(id);
          const label = id.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
          return (
            <button
              key={id}
              onClick={() => onTutorialClick(id)}
              className="w-full flex items-center gap-3 text-left group"
            >
              <div className={cn(
                "size-5 rounded-full flex items-center justify-center shrink-0 border transition-colors",
                done ? "bg-success border-success text-success-foreground" : "border-border bg-background",
              )}>
                {done && <Check className="size-3 text-white" />}
              </div>
              <span className={cn(
                "text-xs transition-colors",
                done ? "text-muted-foreground line-through" : "text-foreground group-hover:text-primary",
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function TutSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="size-9 skeleton rounded-xl" />
          <div className="h-3 skeleton rounded w-3/4" />
          <div className="h-3 skeleton rounded w-full" />
          <div className="h-3 skeleton rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}
