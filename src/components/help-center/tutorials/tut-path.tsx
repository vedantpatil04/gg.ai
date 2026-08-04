import { motion } from "framer-motion";
import { ArrowLeft, Clock, List, Award, ChevronRight, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { DUR_MD, EASE_OUT, FADE_UP, STAGGER, HOVER_LIFT_SM, TAP_PRESS_SM } from "@/lib/motion";
import { SectionHeader } from "../help-card";
import { TutDifficultyBadge, RatingStars } from "./tut-ui";
import type { LearningPath } from "./tut-data";
import { TUTORIALS_BY_ID, TUT_CATEGORIES_BY_ID, TUT_FORMAT_ICON } from "./tut-data";
import { useTutProgress, useLearningPathProgress } from "./tut-store";

interface LearningPathPageProps {
  path: LearningPath;
  onBack: () => void;
  onTutorialClick: (id: string) => void;
}

export function LearningPathPage({ path, onBack, onTutorialClick }: LearningPathPageProps) {
  const PathIcon = path.icon;
  const { isTutorialComplete } = useTutProgress();
  const { getPathPercent } = useLearningPathProgress();

  const tutorials = path.tutorialIds
    .map(id => TUTORIALS_BY_ID[id])
    .filter(Boolean);

  const completedCount = tutorials.filter(t => isTutorialComplete(t.id)).length;
  const pct = getPathPercent(path.id, tutorials.length);
  const isPathComplete = pct === 100;

  // A tutorial is unlocked if it's the first, or the previous one is complete
  const isUnlocked = (idx: number) => {
    if (idx === 0) return true;
    const prevId = path.tutorialIds[idx - 1];
    return isTutorialComplete(prevId);
  };

  return (
    <div className="p-4 md:p-6 xl:p-8 max-w-none pb-16 space-y-8">
      {/* Back */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: DUR_MD, ease: EASE_OUT }}
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Tutorials & Guides
      </motion.button>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR_MD, ease: EASE_OUT }}
        className="relative rounded-2xl border border-border bg-card overflow-hidden"
      >
        <div
          className="absolute -top-24 -right-24 size-72 rounded-full blur-3xl opacity-8 pointer-events-none"
          style={{ background: path.accentColor }}
        />
        <div className="relative p-6 md:p-10">
          <div className="flex items-start gap-5 mb-6">
            <div
              className="size-14 md:size-16 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: `color-mix(in oklab, ${path.accentColor} 12%, transparent)` }}
            >
              <PathIcon className="size-7 md:size-8" style={{ color: path.accentColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1"
                style={{ color: path.accentColor }}
              >
                Learning Path · {path.targetRole}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">{path.title}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">{path.description}</p>
              <div className="flex items-center gap-4 mt-4 text-[11px] text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Clock className="size-3" />{path.estimatedHours}h estimated</span>
                <span className="flex items-center gap-1"><List className="size-3" />{tutorials.length} tutorials</span>
                <TutDifficultyBadge difficulty={path.difficulty} />
                {isPathComplete && (
                  <span className="flex items-center gap-1 text-success font-semibold">
                    <Award className="size-3" /> Path Complete
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-2">
              <span>{completedCount} of {tutorials.length} tutorials completed</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: path.accentColor }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.9, ease: EASE_OUT }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Certificate unlock */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR_MD, ease: EASE_OUT, delay: 0.1 }}
        className={cn(
          "rounded-xl border p-4 flex items-center gap-4",
          isPathComplete ? "border-warning/40 bg-warning/5" : "border-border bg-muted/20",
        )}
      >
        <div className={cn(
          "size-10 rounded-xl flex items-center justify-center shrink-0",
          isPathComplete ? "bg-warning/15" : "bg-muted",
        )}>
          {isPathComplete
            ? <Award className="size-5 text-warning" />
            : <Lock className="size-5 text-muted-foreground/40" />}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">
            {isPathComplete ? "Learning Path Certificate Earned!" : "Path Completion Certificate"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {isPathComplete
              ? "Congratulations — you've completed the full learning path."
              : `Complete all ${tutorials.length} tutorials to earn your certificate.`}
          </div>
        </div>
        {isPathComplete && (
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs font-semibold hover:bg-warning/20 transition-colors shrink-0">
            <Award className="size-3.5" /> Download
          </button>
        )}
      </motion.div>

      {/* Tutorial sequence */}
      <section>
        <SectionHeader eyebrow="Path Sequence" title="Your Learning Journey" />
        <motion.div
          variants={STAGGER(0.06, 0.05)}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {tutorials.map((tutorial, idx) => {
            const unlocked = isUnlocked(idx);
            const done = isTutorialComplete(tutorial.id);
            const cat = TUT_CATEGORIES_BY_ID[tutorial.categoryId];
            const FmtIcon = TUT_FORMAT_ICON[tutorial.format];

            return (
              <motion.div key={tutorial.id} variants={FADE_UP}>
                <motion.div
                  whileHover={unlocked ? HOVER_LIFT_SM : undefined}
                  whileTap={unlocked ? TAP_PRESS_SM : undefined}
                  onClick={unlocked ? () => onTutorialClick(tutorial.id) : undefined}
                  role={unlocked ? "button" : undefined}
                  tabIndex={unlocked ? 0 : undefined}
                  onKeyDown={unlocked ? e => { if (e.key === "Enter" || e.key === " ") onTutorialClick(tutorial.id); } : undefined}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border bg-card transition-all duration-200",
                    unlocked
                      ? "cursor-pointer hover:border-primary/20 group"
                      : "opacity-60 cursor-not-allowed",
                    done ? "border-success/20 bg-success/3" : "border-border",
                  )}
                >
                  {/* Step number / completion */}
                  <div className={cn(
                    "size-10 rounded-xl flex items-center justify-center shrink-0 border-2 font-bold text-sm",
                    done
                      ? "bg-success border-success text-white"
                      : unlocked
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted text-muted-foreground",
                  )}>
                    {done ? <Check className="size-5" /> : unlocked ? idx + 1 : <Lock className="size-4" />}
                  </div>

                  {/* Format icon */}
                  <div
                    className="size-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `color-mix(in oklab, ${cat?.accentColor ?? "var(--color-primary)"} 10%, transparent)` }}
                  >
                    <FmtIcon className="size-4" style={{ color: cat?.accentColor ?? "var(--color-primary)" }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{cat?.title ?? tutorial.categoryId}</span>
                      <TutDifficultyBadge difficulty={tutorial.difficulty} />
                    </div>
                    <p className={cn(
                      "text-sm font-semibold leading-snug",
                      unlocked && "group-hover:text-primary transition-colors duration-150",
                    )}>
                      {tutorial.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="size-3" />{tutorial.duration}</span>
                      <span className="flex items-center gap-1"><List className="size-3" />{tutorial.steps.length} steps</span>
                      <RatingStars rating={tutorial.rating} />
                    </div>
                  </div>

                  {/* Action */}
                  <div className="shrink-0">
                    {done ? (
                      <span className="flex items-center gap-1 text-[10px] text-success font-semibold">
                        <Check className="size-3" /> Done
                      </span>
                    ) : unlocked ? (
                      <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                    ) : (
                      <Lock className="size-4 text-muted-foreground/30" />
                    )}
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      </section>
    </div>
  );
}
