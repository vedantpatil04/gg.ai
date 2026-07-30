import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Check, Download,
  Share2, Printer, Link2, List, Play, Zap, Clock,
  Eye, Star, Award, AlertCircle, Info, CheckCircle2,
  ThumbsUp, ThumbsDown, Lightbulb, User, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FADE_UP, STAGGER, DUR_MD, DUR_SM, EASE_OUT, TAP_PRESS_SM } from "@/lib/motion";
import { SectionHeader } from "../help-card";
import {
  TutDifficultyBadge, FormatBadge, RatingStars, StepTypeIcon,
  TutBookmarkButton, CertificateBadge, PrerequisiteList, TutCard,
} from "./tut-ui";
import type { Tutorial, TutStep, TutStepContent } from "./tut-data";
import { TUTORIALS, TUT_CATEGORIES_BY_ID, TUT_FORMAT_ICON } from "./tut-data";
import { getRelatedTutorials } from "./tut-search";
import { useTutProgress, useTutRecentlyViewed } from "./tut-store";

// ─── Step content renderer ────────────────────────────────────────────────────

function StepCallout({ variant, text }: { variant: "info" | "warning" | "success" | "danger"; text: string }) {
  const styles = {
    info:    { icon: Info,         color: "var(--color-info)",        label: "Note"      },
    warning: { icon: AlertCircle,  color: "var(--color-warning)",     label: "Warning"   },
    success: { icon: CheckCircle2, color: "var(--color-success)",     label: "Tip"       },
    danger:  { icon: AlertCircle,  color: "var(--color-destructive)", label: "Important" },
  };
  const { icon: Icon, color, label } = styles[variant];

  return (
    <div
      className="my-4 rounded-xl border p-4 flex gap-3"
      style={{
        borderColor: `color-mix(in oklab, ${color} 40%, transparent)`,
        background: `color-mix(in oklab, ${color} 7%, transparent)`,
      }}
    >
      <Icon className="size-4 shrink-0 mt-0.5" style={{ color }} />
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-[0.15em] block mb-1" style={{ color }}>
          {label}
        </span>
        <p className="text-sm text-foreground/85 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function TipBlock({ text }: { text: string }) {
  return (
    <div className="my-4 flex gap-2.5 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15">
      <Lightbulb className="size-4 shrink-0 mt-0.5 text-primary" />
      <p className="text-sm text-foreground/85 leading-relaxed">{text}</p>
    </div>
  );
}

function renderContent(content: TutStepContent, idx: number) {
  switch (content.type) {
    case "heading": {
      const Tag = `h${content.level ?? 2}` as "h2" | "h3";
      const cls = content.level === 2 ? "text-lg font-bold mt-6 mb-3" : "text-base font-semibold mt-5 mb-2";
      return <Tag key={idx} className={cls}>{content.text}</Tag>;
    }
    case "paragraph":
      return <p key={idx} className="text-sm leading-[1.85] text-foreground/85 mb-4">{content.text}</p>;
    case "list":
      return (
        <ul key={idx} className="mb-4 space-y-2">
          {(content.items ?? []).map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/85 leading-relaxed">
              <div className="size-1.5 rounded-full bg-primary/60 shrink-0 mt-[0.5em]" />
              {item}
            </li>
          ))}
        </ul>
      );
    case "callout":
      return <StepCallout key={idx} variant={content.variant!} text={content.text!} />;
    case "tip":
      return <TipBlock key={idx} text={content.text!} />;
    case "code":
      return (
        <div key={idx} className="my-4 rounded-xl border border-border bg-muted overflow-hidden">
          {content.language && (
            <div className="px-4 py-2 border-b border-border text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              {content.language}
            </div>
          )}
          <pre className="p-4 overflow-x-auto text-xs font-mono text-foreground/90 leading-relaxed">
            <code>{content.text}</code>
          </pre>
        </div>
      );
    default:
      return null;
  }
}

// ─── Step sidebar item ────────────────────────────────────────────────────────

function StepSidebarItem({
  step,
  index,
  isActive,
  isCompleted,
  onClick,
}: {
  step: TutStep;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs transition-all duration-150",
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : isCompleted
          ? "text-muted-foreground hover:bg-muted/60"
          : "text-muted-foreground hover:bg-muted/60",
      )}
    >
      {/* Step indicator */}
      <div className={cn(
        "size-5 rounded-full flex items-center justify-center shrink-0 border transition-colors text-[9px] font-bold",
        isCompleted
          ? "bg-success border-success text-white"
          : isActive
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground",
      )}>
        {isCompleted ? <Check className="size-3 text-white" /> : index + 1}
      </div>
      <span className="flex-1 leading-snug line-clamp-2">{step.title}</span>
    </button>
  );
}

// ─── Article feedback ─────────────────────────────────────────────────────────

function TutorialFeedback() {
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  return (
    <div className="mt-10 pt-8 border-t border-border text-center">
      <p className="text-sm font-medium mb-4">Was this tutorial helpful?</p>
      <div className="flex items-center justify-center gap-3">
        {(["up", "down"] as const).map(v => (
          <motion.button
            key={v}
            whileTap={TAP_PRESS_SM}
            onClick={() => setVoted(v)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200",
              voted === v
                ? v === "up"
                  ? "bg-success/10 border-success/40 text-success"
                  : "bg-destructive/10 border-destructive/40 text-destructive"
                : v === "up"
                ? "border-border hover:border-success/40 hover:bg-success/5 text-muted-foreground hover:text-success"
                : "border-border hover:border-destructive/40 hover:bg-destructive/5 text-muted-foreground hover:text-destructive",
            )}
          >
            {v === "up" ? <ThumbsUp className="size-4" /> : <ThumbsDown className="size-4" />}
            {v === "up" ? "Yes, helpful" : "Not really"}
          </motion.button>
        ))}
      </div>
      <AnimatePresence>
        {voted && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs text-muted-foreground mt-4"
          >
            {voted === "up"
              ? "Thank you! We're glad this was helpful."
              : "Thanks for the feedback. We'll work to improve this tutorial."}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Related tutorials ────────────────────────────────────────────────────────

function RelatedTutorials({
  tutorialId,
  onTutorialClick,
}: {
  tutorialId: string;
  onTutorialClick: (id: string) => void;
}) {
  const related = getRelatedTutorials(tutorialId, 3);
  if (related.length === 0) return null;

  return (
    <div className="mt-10 pt-8 border-t border-border">
      <SectionHeader eyebrow="Keep Learning" title="Related Tutorials" />
      <motion.div
        variants={STAGGER(0.06)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {related.map(t => (
          <motion.div key={t.id} variants={FADE_UP}>
            <TutCard tutorial={t} onClick={() => onTutorialClick(t.id)} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Prev / Next navigation ───────────────────────────────────────────────────

function TutNavigation({
  currentId,
  onNavigate,
}: {
  currentId: string;
  onNavigate: (id: string) => void;
}) {
  const idx = TUTORIALS.findIndex(t => t.id === currentId);
  const prev = TUTORIALS[idx - 1];
  const next = TUTORIALS[idx + 1];

  return (
    <div className="mt-8 pt-6 border-t border-border grid grid-cols-2 gap-4">
      {prev ? (
        <button
          onClick={() => onNavigate(prev.id)}
          className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/40 transition-all duration-200 text-left group"
        >
          <ChevronLeft className="size-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-primary transition-colors" />
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Previous</div>
            <div className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">{prev.title}</div>
          </div>
        </button>
      ) : <div />}
      {next ? (
        <button
          onClick={() => onNavigate(next.id)}
          className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/40 transition-all duration-200 text-right justify-end group"
        >
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Next Tutorial</div>
            <div className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">{next.title}</div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-primary transition-colors" />
        </button>
      ) : <div />}
    </div>
  );
}

// ─── Tutorial reader page ─────────────────────────────────────────────────────

interface TutReaderProps {
  tutorial: Tutorial;
  onBack: () => void;
  onTutorialClick: (id: string) => void;
}

export function TutReader({ tutorial, onBack, onTutorialClick }: TutReaderProps) {
  const cat = TUT_CATEGORIES_BY_ID[tutorial.categoryId];
  const FormatIcon = TUT_FORMAT_ICON[tutorial.format];

  const { getProgress, startTutorial, completeStep, isStepCompleted, getStepPercent, isTutorialComplete } = useTutProgress();
  const { addRecent } = useTutRecentlyViewed();

  const progress = getProgress(tutorial.id);
  const firstIncomplete = tutorial.steps.find(s => !isStepCompleted(tutorial.id, s.id));
  const [activeStepId, setActiveStepId] = useState<string>(
    progress?.currentStepId ?? tutorial.steps[0]?.id ?? "",
  );
  const [linkCopied, setLinkCopied] = useState(false);

  const activeStep = tutorial.steps.find(s => s.id === activeStepId) ?? tutorial.steps[0];
  const activeIdx  = tutorial.steps.findIndex(s => s.id === activeStepId);
  const prevStep   = tutorial.steps[activeIdx - 1];
  const nextStep   = tutorial.steps[activeIdx + 1];
  const pct        = getStepPercent(tutorial.id, tutorial.steps.length);
  const isComplete = isTutorialComplete(tutorial.id);

  useEffect(() => {
    addRecent(tutorial.id);
    if (!progress) startTutorial(tutorial.id, tutorial.steps[0]?.id ?? "");
  }, [tutorial.id]);

  const handleCompleteStep = useCallback(() => {
    completeStep(tutorial.id, activeStepId, nextStep?.id ?? null, tutorial.steps.length);
    if (nextStep) setActiveStepId(nextStep.id);
  }, [tutorial.id, activeStepId, nextStep, tutorial.steps.length, completeStep]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto pb-16">
      {/* Back */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: DUR_MD, ease: EASE_OUT }}
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 group"
      >
        <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Back to Tutorials
      </motion.button>

      <div className="flex gap-6 items-start">
        {/* Step sidebar — desktop */}
        <motion.aside
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: DUR_MD, ease: EASE_OUT }}
          className="hidden lg:block w-56 xl:w-64 shrink-0 sticky top-24 self-start"
        >
          <div className="rounded-xl border border-border bg-card p-3 space-y-1">
            <div className="px-2 py-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
              {tutorial.steps.length} Steps
            </div>
            {tutorial.steps.map((step, i) => (
              <StepSidebarItem
                key={step.id}
                step={step}
                index={i}
                isActive={step.id === activeStepId}
                isCompleted={isStepCompleted(tutorial.id, step.id)}
                onClick={() => setActiveStepId(step.id)}
              />
            ))}

            {/* Overall progress */}
            <div className="pt-3 px-2 border-t border-border mt-2">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                <span>Progress</span><span>{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full aurora rounded-full"
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              {isComplete && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-success font-semibold">
                  <Check className="size-3" /> Completed
                </div>
              )}
            </div>
          </div>
        </motion.aside>

        {/* Main content */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR_MD, ease: EASE_OUT }}
          className="flex-1 min-w-0"
        >
          {/* Tutorial header */}
          <header className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.2em] px-2 py-0.5 rounded-md"
                style={{
                  color: cat?.accentColor ?? "var(--color-primary)",
                  background: `color-mix(in oklab, ${cat?.accentColor ?? "var(--color-primary)"} 10%, transparent)`,
                }}
              >
                {cat?.title ?? tutorial.categoryId}
              </span>
              <TutDifficultyBadge difficulty={tutorial.difficulty} />
              <FormatBadge format={tutorial.format} />
            </div>

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight mb-4">
              {tutorial.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-5">
              <span className="flex items-center gap-1.5"><User className="size-3.5" />{tutorial.author}</span>
              <span className="flex items-center gap-1.5"><Clock className="size-3.5" />{tutorial.duration}</span>
              <span className="flex items-center gap-1.5"><List className="size-3.5" />{tutorial.steps.length} steps</span>
              <span className="flex items-center gap-1.5"><Eye className="size-3.5" />{tutorial.views.toLocaleString()}</span>
              <RatingStars rating={tutorial.rating} />
              <span className="flex items-center gap-1.5"><Calendar className="size-3.5" />Updated {tutorial.updatedAt}</span>
            </div>

            {/* Action bar */}
            <div className="flex flex-wrap items-center gap-2 pb-6 border-b border-border">
              <TutBookmarkButton tutorialId={tutorial.id} />
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Link2 className="size-3.5" />
                {linkCopied ? "Copied!" : "Copy Link"}
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Share2 className="size-3.5" />Share
              </button>
              {tutorial.downloadable && (
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Download className="size-3.5" />Resources
                </button>
              )}

              {/* Progress pill */}
              {pct > 0 && (
                <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
                  <div className="w-20 h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full aurora rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                  </div>
                  {pct}% complete
                </div>
              )}
            </div>

            {/* Prerequisites + tags */}
            {tutorial.prerequisites.length > 0 && (
              <div className="mt-5">
                <PrerequisiteList
                  prerequisites={tutorial.prerequisites}
                  onTutorialClick={onTutorialClick}
                />
              </div>
            )}
          </header>

          {/* Mobile step selector */}
          <div className="lg:hidden mb-6">
            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
              {tutorial.steps.map((step, i) => (
                <button
                  key={step.id}
                  onClick={() => setActiveStepId(step.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs whitespace-nowrap transition-all duration-150 shrink-0",
                    step.id === activeStepId
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : isStepCompleted(tutorial.id, step.id)
                      ? "border-success/30 bg-success/5 text-success"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {isStepCompleted(tutorial.id, step.id)
                    ? <Check className="size-3" />
                    : <span className="font-bold">{i + 1}</span>}
                  {step.title}
                </button>
              ))}
            </div>
          </div>

          {/* Active step */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStepId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: DUR_SM, ease: EASE_OUT }}
            >
              {/* Step header */}
              <div className="flex items-start gap-3 mb-5 p-4 rounded-xl border border-border bg-card">
                <div className={cn(
                  "size-8 rounded-full flex items-center justify-center shrink-0 border text-xs font-bold",
                  isStepCompleted(tutorial.id, activeStepId)
                    ? "bg-success border-success text-white"
                    : "border-primary bg-primary/10 text-primary",
                )}>
                  {isStepCompleted(tutorial.id, activeStepId)
                    ? <Check className="size-4 text-white" />
                    : activeIdx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <StepTypeIcon type={activeStep.type} />
                    <span className="text-[10px] text-muted-foreground">{activeStep.duration}</span>
                  </div>
                  <h2 className="text-base font-bold">{activeStep.title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{activeStep.description}</p>
                </div>
              </div>

              {/* Step content */}
              <div>
                {activeStep.content.map((block, i) => renderContent(block, i))}
              </div>

              {/* Step navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border gap-3">
                <button
                  onClick={() => prevStep && setActiveStepId(prevStep.id)}
                  disabled={!prevStep}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </button>

                {isStepCompleted(tutorial.id, activeStepId) ? (
                  nextStep ? (
                    <button
                      onClick={() => setActiveStepId(nextStep.id)}
                      className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                      Next Step
                      <ChevronRight className="size-4" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-success font-semibold">
                      <Award className="size-4" /> Tutorial Complete!
                    </div>
                  )
                ) : (
                  <button
                    onClick={handleCompleteStep}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    <Check className="size-4" />
                    {nextStep ? "Mark Complete & Continue" : "Complete Tutorial"}
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Certificate (if applicable) */}
          {tutorial.certificate && (
            <div className="mt-8">
              <CertificateBadge tutorialId={tutorial.id} />
            </div>
          )}

          {/* Feedback */}
          <TutorialFeedback />

          {/* Prev/Next tutorial */}
          <TutNavigation currentId={tutorial.id} onNavigate={onTutorialClick} />

          {/* Related tutorials */}
          <RelatedTutorials tutorialId={tutorial.id} onTutorialClick={onTutorialClick} />
        </motion.div>
      </div>
    </div>
  );
}
