import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HelpCenterLayout } from "../help-center-layout";
import { HelpSearchBar } from "../help-search-bar";
import { TutHome } from "./tut-home";
import { TutListPage } from "./tut-list";
import { TutCategoryPage } from "./tut-category";
import { TutReader } from "./tut-reader";
import { LearningPathPage } from "./tut-path";
import { TUTORIALS_BY_ID, TUT_CATEGORIES_BY_ID, LEARNING_PATHS_BY_ID } from "./tut-data";
import { DUR_MD, EASE_OUT } from "@/lib/motion";

// ─── View state ───────────────────────────────────────────────────────────────

type TutView =
  | { type: "home" }
  | { type: "list"; categoryId?: string; query?: string }
  | { type: "category"; categoryId: string }
  | { type: "tutorial"; tutorialId: string }
  | { type: "path"; pathId: string };

// ─── Page transition ──────────────────────────────────────────────────────────

function PageTransition({ children, viewKey }: { children: React.ReactNode; viewKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: DUR_MD, ease: EASE_OUT }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Tutorials page ───────────────────────────────────────────────────────────

export function TutorialsPage() {
  const [view, setView]              = useState<TutView>({ type: "home" });
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  const goHome     = useCallback(() => setView({ type: "home" }), []);
  const goList     = useCallback((categoryId?: string, query?: string) =>
    setView({ type: "list", categoryId, query }), []);
  const goCategory = useCallback((id: string) => {
    if (id === "all") { setView({ type: "list" }); return; }
    setView({ type: "category", categoryId: id });
  }, []);
  const goTutorial = useCallback((id: string) =>
    setView({ type: "tutorial", tutorialId: id }), []);
  const goPath     = useCallback((id: string) => {
    if (id === "all") { setView({ type: "list" }); return; }
    setView({ type: "path", pathId: id });
  }, []);

  let content: React.ReactNode;
  let viewKey: string;

  switch (view.type) {
    case "home":
      viewKey = "home";
      content = (
        <TutHome
          onSearch={q => goList(undefined, q)}
          onTutorialClick={goTutorial}
          onCategoryClick={goCategory}
          onPathClick={goPath}
        />
      );
      break;

    case "list":
      viewKey = `list-${view.categoryId ?? "all"}-${view.query ?? ""}`;
      content = (
        <TutListPage
          initialCategoryId={view.categoryId}
          initialQuery={view.query}
          onTutorialClick={goTutorial}
        />
      );
      break;

    case "category": {
      const cat = TUT_CATEGORIES_BY_ID[view.categoryId];
      viewKey = `cat-${view.categoryId}`;
      content = cat ? (
        <TutCategoryPage
          category={cat}
          onBack={goHome}
          onTutorialClick={goTutorial}
        />
      ) : (
        <TutHome
          onSearch={q => goList(undefined, q)}
          onTutorialClick={goTutorial}
          onCategoryClick={goCategory}
          onPathClick={goPath}
        />
      );
      break;
    }

    case "tutorial": {
      const tut = TUTORIALS_BY_ID[view.tutorialId];
      viewKey = `tut-${view.tutorialId}`;
      content = tut ? (
        <TutReader
          tutorial={tut}
          onBack={goHome}
          onTutorialClick={goTutorial}
        />
      ) : (
        <TutHome
          onSearch={q => goList(undefined, q)}
          onTutorialClick={goTutorial}
          onCategoryClick={goCategory}
          onPathClick={goPath}
        />
      );
      break;
    }

    case "path": {
      const path = LEARNING_PATHS_BY_ID[view.pathId];
      viewKey = `path-${view.pathId}`;
      content = path ? (
        <LearningPathPage
          path={path}
          onBack={goHome}
          onTutorialClick={goTutorial}
        />
      ) : (
        <TutHome
          onSearch={q => goList(undefined, q)}
          onTutorialClick={goTutorial}
          onCategoryClick={goCategory}
          onPathClick={goPath}
        />
      );
      break;
    }
  }

  return (
    <HelpCenterLayout onSearchClick={() => setGlobalSearchOpen(true)}>
      <PageTransition viewKey={viewKey}>{content}</PageTransition>
      <HelpSearchBar open={globalSearchOpen} onClose={() => setGlobalSearchOpen(false)} />
    </HelpCenterLayout>
  );
}
