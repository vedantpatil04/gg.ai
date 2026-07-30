import { useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap, ArrowUpRight, Clock, Play, Award, Zap,
  BookOpen, Check, ChevronRight, Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FADE_UP, STAGGER, DUR_MD, EASE_OUT, HOVER_LIFT_SM, TAP_PRESS_SM } from "@/lib/motion";
import { SectionHeader, EmptyState } from "../help-card";
import {
  TutCard, TutGrid, LearningPathCard, TutSearchInput,
  TutDifficultyBadge, FormatBadge, RatingStars,
} from "./tut-ui";
import {
  TUT_CATEGORIES, TUTORIALS, TUTORIALS_BY_ID,
  LEARNING_PATHS, TUT_POPULAR_SEARCHES, TUT_CATEGORIES_BY_ID,
  TUT_FORMAT_ICON,
} from "./tut-data";
import { getFeaturedTutorials, getTutorialsByDifficulty } from "./tut-search";
import {
  useTutBookmarks, useTutProgress,
} from "./tut-store";

// ─── Hero ──────────────────────────────────────────────────────────────────────

function TutHero({
  onSearch,
  onChipSelect,
}: {
  onSearch: (q: string) => void;
  onChipSelect: (q: string) => void;
}) {
  const [query, setQuery] = useState("");

  const STATS = [
    { value: `${TUTORIALS.length}+`, label: "Tutorials", icon: Play },
    { value: `${TUT_CATEGORIES.length}`, label: "Categories", icon: BookOpen },
    { value: `${LEARNING_PATHS.length}`, label: "Learning Paths", icon: GraduationCap },
    { value: "Free", label: "Certificates", icon: Award },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_MD, ease: EASE_OUT }}
      className="relative rounded-2xl border border-border bg-card overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 size-96 rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 size-64 rounded-full bg-info/4 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative p-6 md:p-10">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-5">
            <GraduationCap className="size-3 text-primary" />
            <span className="text-[10px] uppercase tracking-[0.22em] text-primary font-semibold">
              Tutorials & Guides
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-3">
            Learn GreenGuard AI
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-lg">
            Step-by-step tutorials, interactive guides, and learning paths for every role — from first login to advanced AI analysis and enforcement workflows.
          </p>

          <div className="flex gap-2 mb-6">
            <TutSearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search tutorials and guides…"
              className="flex-1"
            />
            <motion.button
              whileHover={HOVER_LIFT_SM}
              whileTap={TAP_PRESS_SM}
              onClick={() => { if (query.trim()) onSearch(query.trim()); }}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
            >
              Search
            </motion.button>
          </div>

          {/* Popular chips */}
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground self-center mr-1">Popular:</span>
            {TUT_POPULAR_SEARCHES.slice(0, 6).map(chip => (
              <motion.button
                key={chip}
                whileHover={HOVER_LIFT_SM}
                whileTap={TAP_PRESS_SM}
                onClick={() => onChipSelect(chip)}
                className="px-3 py-1.5 rounded-full border border-border bg-background/60 text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200"
              >
                {chip}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 pt-6 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map(({ value, label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon className="size-3.5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-base font-bold tabular-nums leading-none">{value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Learning paths grid — uses hook properly inside component
function LearningPathsGrid({ onPathClick }: { onPathClick: (id: string) => void }) {
  const { isTutorialComplete } = useTutProgress();
  const featured = LEARNING_PATHS.filter(p => p.featured);

  return (
    <motion.div
      variants={STAGGER(0.06, 0.05)}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {featured.map(path => {
        const completedCount = path.tutorialIds.filter(id => isTutorialComplete(id)).length;
        return (
          <motion.div key={path.id} variants={FADE_UP}>
            <LearningPathCard
              path={path}
              completedCount={completedCount}
              onClick={() => onPathClick(path.id)}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ─── Browse categories ─────────────────────────────────────────────────────────

function BrowseCategories({ onCategoryClick }: { onCategoryClick: (id: string) => void }) {
  return (
    <section>
      <SectionHeader
        eyebrow="Browse"
        title="Tutorial Categories"
        description="Pick a topic to explore guided tutorials"
        action={
          <button
            onClick={() => onCategoryClick("all")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            All tutorials
            <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
          </button>
        }
      />
      <motion.div
        variants={STAGGER(0.04, 0.05)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
      >
        {TUT_CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <motion.div key={cat.id} variants={FADE_UP}>
              <motion.button
                whileHover={HOVER_LIFT_SM}
                whileTap={TAP_PRESS_SM}
                onClick={() => onCategoryClick(cat.id)}
                className="w-full rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/30 transition-all duration-200 group relative overflow-hidden text-left"
              >
                <div
                  className="absolute -bottom-8 -right-8 size-24 rounded-full opacity-0 group-hover:opacity-10 blur-xl transition-opacity duration-300 pointer-events-none"
                  style={{ background: cat.accentColor }}
                />
                <div
                  className="size-9 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: `color-mix(in oklab, ${cat.accentColor} 12%, transparent)` }}
                >
                  <Icon className="size-4" style={{ color: cat.accentColor }} />
                </div>
                <h3 className="text-xs font-semibold leading-tight mb-1">{cat.title}</h3>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
                  <span>{cat.tutorialCount} tutorials</span>
                  <span>{cat.estimatedHours}h</span>
                </div>
              </motion.button>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}

// ─── Featured tutorials ────────────────────────────────────────────────────────

function FeaturedTutorials({ onTutorialClick }: { onTutorialClick: (id: string) => void }) {
  const tutorials = getFeaturedTutorials(6);
  return (
    <section>
      <SectionHeader
        eyebrow="Recommended"
        title="Featured Tutorials"
        description="Handpicked tutorials for every role"
      />
      <TutGrid tutorials={tutorials} onTutorialClick={onTutorialClick} />
    </section>
  );
}

// ─── By difficulty ─────────────────────────────────────────────────────────────

function ByDifficulty({ onTutorialClick }: { onTutorialClick: (id: string) => void }) {
  const [tab, setTab] = useState<"Beginner" | "Intermediate" | "Advanced">("Beginner");
  const tutorials = getTutorialsByDifficulty(tab, 6);

  return (
    <section>
      <SectionHeader eyebrow="By Skill Level" title="Browse by Difficulty" />
      <div className="flex gap-1 p-1 rounded-xl border border-border bg-muted/30 w-fit mb-5">
        {(["Beginner", "Intermediate", "Advanced"] as const).map(d => (
          <button
            key={d}
            onClick={() => setTab(d)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
              tab === d
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {d}
          </button>
        ))}
      </div>
      <TutGrid tutorials={tutorials} onTutorialClick={onTutorialClick} />
    </section>
  );
}

// ─── Continue learning ─────────────────────────────────────────────────────────

function ContinueLearning({ onTutorialClick }: { onTutorialClick: (id: string) => void }) {
  const { inProgress } = useTutProgress();

  const items = inProgress
    .map(p => ({ tutorial: TUTORIALS_BY_ID[p.tutorialId], progress: p }))
    .filter(({ tutorial }) => !!tutorial)
    .slice(0, 4);

  if (items.length === 0) {
    return (
      <section>
        <SectionHeader eyebrow="In Progress" title="Continue Learning" />
        <EmptyState
          icon={Play}
          title="Nothing in progress"
          description="Start any tutorial to track your progress and continue from where you left off."
        />
      </section>
    );
  }

  return (
    <section>
      <SectionHeader eyebrow="In Progress" title="Continue Learning" />
      <div className="space-y-3">
        {items.map(({ tutorial, progress }) => {
          const pct = Math.round((progress.completedSteps.length / tutorial.steps.length) * 100);
          const remaining = tutorial.steps.length - progress.completedSteps.length;
          return (
            <motion.button
              key={tutorial.id}
              whileHover={HOVER_LIFT_SM}
              whileTap={TAP_PRESS_SM}
              onClick={() => onTutorialClick(tutorial.id)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-all duration-200 text-left group"
            >
              <div className="relative size-11 shrink-0">
                {/* Ring */}
                <svg className="-rotate-90 absolute inset-0" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r="18" fill="none" stroke="var(--color-muted)" strokeWidth="3" />
                  <motion.circle
                    cx="22" cy="22" r="18"
                    fill="none" stroke="var(--color-primary)" strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 18}
                    initial={{ strokeDashoffset: 2 * Math.PI * 18 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 18 * (1 - pct / 100) }}
                    transition={{ duration: 0.8, ease: EASE_OUT }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] font-bold tabular-nums">{pct}%</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-0.5">
                  {TUT_CATEGORIES_BY_ID[tutorial.categoryId]?.title ?? tutorial.categoryId}
                </div>
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors duration-150">
                  {tutorial.title}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {remaining} step{remaining !== 1 ? "s" : ""} remaining
                </p>
              </div>
              <ChevronRight className="size-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

// ─── Bookmarks ─────────────────────────────────────────────────────────────────

function BookmarkedTutorials({ onTutorialClick }: { onTutorialClick: (id: string) => void }) {
  const { bookmarkedIds, toggleBookmark } = useTutBookmarks();
  const tutorials = bookmarkedIds.map(id => TUTORIALS_BY_ID[id]).filter(Boolean).slice(0, 5);

  return (
    <section>
      <SectionHeader
        eyebrow="Saved"
        title="Bookmarked Tutorials"
        action={bookmarkedIds.length > 0 ? (
          <span className="text-[10px] text-muted-foreground">{bookmarkedIds.length} saved</span>
        ) : undefined}
      />
      {tutorials.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No bookmarks yet"
          description="Bookmark any tutorial to save it for later."
        />
      ) : (
        <motion.div
          variants={STAGGER(0.05, 0.05)}
          initial="hidden"
          animate="show"
          className="space-y-2"
        >
          {tutorials.map(t => (
            <motion.div
              key={t.id}
              variants={FADE_UP}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card group"
            >
              <button onClick={() => onTutorialClick(t.id)} className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors duration-150">
                  {t.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground flex-wrap">
                  <span>{TUT_CATEGORIES_BY_ID[t.categoryId]?.title ?? t.categoryId}</span>
                  <span>·</span>
                  <span>{t.duration}</span>
                  <TutDifficultyBadge difficulty={t.difficulty} />
                </div>
              </button>
              <motion.button
                whileTap={TAP_PRESS_SM}
                onClick={() => toggleBookmark(t.id)}
                className="size-7 rounded-lg flex items-center justify-center text-primary hover:bg-primary/10 transition-colors shrink-0"
                aria-label="Remove bookmark"
              >
                <span className="text-[10px]">✕</span>
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────────

function TutFooter({ onCategoryClick }: { onCategoryClick: (id: string) => void }) {
  return (
    <footer className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="size-7 rounded-lg aurora grid place-items-center">
              <GraduationCap className="size-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">Tutorials & Guides</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Official GreenGuard AI learning resources. Updated regularly by the platform team.
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Circle className="size-1.5 fill-success text-success" />
            New tutorials added weekly
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">
            Categories
          </div>
          <div className="space-y-1.5">
            {TUT_CATEGORIES.slice(0, 6).map(cat => (
              <button
                key={cat.id}
                onClick={() => onCategoryClick(cat.id)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
              >
                <ChevronRight className="size-3 shrink-0" />
                {cat.title}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">
            Learning Stats
          </div>
          <div className="space-y-2">
            {[
              { label: "Total tutorials",  value: `${TUTORIALS.length}`         },
              { label: "Categories",       value: `${TUT_CATEGORIES.length}`    },
              { label: "Learning paths",   value: `${LEARNING_PATHS.length}`    },
              { label: "Certificates",     value: `${TUTORIALS.filter(t => t.certificate).length}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Root home ─────────────────────────────────────────────────────────────────

interface TutHomeProps {
  onSearch: (q: string) => void;
  onTutorialClick: (id: string) => void;
  onCategoryClick: (id: string) => void;
  onPathClick: (id: string) => void;
}

export function TutHome({ onSearch, onTutorialClick, onCategoryClick, onPathClick }: TutHomeProps) {
  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto space-y-10 pb-16">
      <TutHero onSearch={onSearch} onChipSelect={onSearch} />

      {/* Learning paths */}
      <section>
        <SectionHeader
          eyebrow="Structured Learning"
          title="Learning Paths"
          description="Role-based paths that guide you from basics to mastery"
          action={
            <button
              onClick={() => onPathClick("all")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
            >
              View all
              <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
            </button>
          }
        />
        <LearningPathsGrid onPathClick={onPathClick} />
      </section>

      <BrowseCategories onCategoryClick={onCategoryClick} />
      <FeaturedTutorials onTutorialClick={onTutorialClick} />
      <ByDifficulty onTutorialClick={onTutorialClick} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <ContinueLearning onTutorialClick={onTutorialClick} />
        <BookmarkedTutorials onTutorialClick={onTutorialClick} />
      </div>

      <TutFooter onCategoryClick={onCategoryClick} />
    </div>
  );
}
