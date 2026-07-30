import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, BookOpen } from "lucide-react";
import { DUR_MD, EASE_OUT, FADE_UP, STAGGER } from "@/lib/motion";
import { SectionHeader, EmptyState } from "../help-card";
import { TutCard, TutSearchInput } from "./tut-ui";
import type { TutCategory } from "./tut-data";
import { TUTORIALS_BY_CATEGORY } from "./tut-data";
import { useTutProgress } from "./tut-store";

interface TutCategoryPageProps {
  category: TutCategory;
  onBack: () => void;
  onTutorialClick: (id: string) => void;
}

export function TutCategoryPage({ category, onBack, onTutorialClick }: TutCategoryPageProps) {
  const [query, setQuery] = useState("");
  const Icon = category.icon;
  const { isTutorialComplete } = useTutProgress();

  const allTutorials = TUTORIALS_BY_CATEGORY[category.id] ?? [];

  const filtered = useMemo(() => {
    if (!query.trim()) return allTutorials;
    const q = query.toLowerCase();
    return allTutorials.filter(
      t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q)),
    );
  }, [query, allTutorials]);

  const featured    = allTutorials.filter(t => t.featured);
  const byBeginner  = allTutorials.filter(t => t.difficulty === "Beginner");
  const byInter     = allTutorials.filter(t => t.difficulty === "Intermediate");
  const byAdvanced  = allTutorials.filter(t => t.difficulty === "Advanced");
  const completedCount = allTutorials.filter(t => isTutorialComplete(t.id)).length;
  const isFiltering = query.trim().length > 0;

  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto pb-16 space-y-10">
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
          className="absolute -top-24 -right-24 size-64 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ background: category.accentColor }}
        />
        <div className="relative p-6 md:p-8 flex items-start gap-5">
          <div
            className="size-14 md:size-16 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: `color-mix(in oklab, ${category.accentColor} 12%, transparent)` }}
          >
            <div style={{ color: category.accentColor }}>
              <Icon className="size-7 md:size-8" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div
              className="text-[10px] font-semibold uppercase tracking-[0.2em] mb-1"
              style={{ color: category.accentColor }}
            >
              Category
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">{category.title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">{category.description}</p>
            <div className="flex items-center gap-4 mt-4 text-[11px] text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <BookOpen className="size-3" />{allTutorials.length} tutorial{allTutorials.length !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="size-3" />{category.estimatedHours}h estimated
              </span>
              {completedCount > 0 && (
                <span className="text-success font-medium">{completedCount} completed</span>
              )}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {completedCount > 0 && (
          <div className="px-6 md:px-8 pb-5">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
              <span>Your progress</span>
              <span>{Math.round((completedCount / allTutorials.length) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full aurora rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round((completedCount / allTutorials.length) * 100)}%` }}
                transition={{ duration: 0.8, ease: EASE_OUT }}
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR_MD, ease: EASE_OUT, delay: 0.05 }}
      >
        <TutSearchInput
          value={query}
          onChange={setQuery}
          placeholder={`Search within ${category.title}…`}
        />
      </motion.div>

      {/* Filtered results */}
      {isFiltering ? (
        <div>
          <div className="text-xs text-muted-foreground mb-4">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No tutorials found"
              description={`No tutorials in ${category.title} match "${query}".`}
              action={
                <button
                  onClick={() => setQuery("")}
                  className="px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted transition-colors"
                >
                  Clear search
                </button>
              }
            />
          ) : (
            <motion.div
              variants={STAGGER(0.05, 0.05)}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filtered.map(t => (
                <motion.div key={t.id} variants={FADE_UP}>
                  <TutCard tutorial={t} onClick={() => onTutorialClick(t.id)} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      ) : (
        <>
          {/* Featured */}
          {featured.length > 0 && (
            <section>
              <SectionHeader eyebrow="Recommended" title="Featured Tutorials" />
              <motion.div
                variants={STAGGER(0.05, 0.05)}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {featured.map(t => (
                  <motion.div key={t.id} variants={FADE_UP}>
                    <TutCard tutorial={t} onClick={() => onTutorialClick(t.id)} />
                  </motion.div>
                ))}
              </motion.div>
            </section>
          )}

          {/* By difficulty */}
          {byBeginner.length > 0 && (
            <section>
              <SectionHeader eyebrow="Skill Level" title="Beginner Tutorials" />
              <div className="space-y-3">
                {byBeginner.map(t => (
                  <TutCard key={t.id} tutorial={t} onClick={() => onTutorialClick(t.id)} variant="horizontal" />
                ))}
              </div>
            </section>
          )}

          {byInter.length > 0 && (
            <section>
              <SectionHeader eyebrow="Skill Level" title="Intermediate Tutorials" />
              <div className="space-y-3">
                {byInter.map(t => (
                  <TutCard key={t.id} tutorial={t} onClick={() => onTutorialClick(t.id)} variant="horizontal" />
                ))}
              </div>
            </section>
          )}

          {byAdvanced.length > 0 && (
            <section>
              <SectionHeader eyebrow="Skill Level" title="Advanced Tutorials" />
              <div className="space-y-3">
                {byAdvanced.map(t => (
                  <TutCard key={t.id} tutorial={t} onClick={() => onTutorialClick(t.id)} variant="horizontal" />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
