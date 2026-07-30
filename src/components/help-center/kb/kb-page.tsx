import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KbHome } from "./kb-home";
import { KbArticleList } from "./kb-article-list";
import { KbCategoryPage } from "./kb-category-page";
import { KbArticlePage } from "./kb-article-page";
import { KB_ARTICLES_BY_ID, KB_CATEGORIES_BY_ID } from "./kb-data";
import { DUR_MD, EASE_OUT } from "@/lib/motion";

// ─── Internal view state ───────────────────────────────────────────────────────

type KbView =
  | { type: "home" }
  | { type: "list"; categoryId?: string; query?: string }
  | { type: "category"; categoryId: string }
  | { type: "article"; articleId: string };

// ─── Page transition wrapper ───────────────────────────────────────────────────

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

// ─── Knowledge Base page ───────────────────────────────────────────────────────
// HelpCenterLayout and HelpSearchBar are provided by the /help layout route.

export function KnowledgeBasePage() {
  const [view, setView] = useState<KbView>({ type: "home" });

  const goHome     = useCallback(() => setView({ type: "home" }), []);
  const goList     = useCallback((categoryId?: string, query?: string) =>
    setView({ type: "list", categoryId, query }), []);
  const goCategory = useCallback((categoryId: string) => {
    if (categoryId === "all") { setView({ type: "list" }); return; }
    setView({ type: "category", categoryId });
  }, []);
  const goArticle  = useCallback((articleId: string) =>
    setView({ type: "article", articleId }), []);

  let content: React.ReactNode;
  let viewKey: string;

  switch (view.type) {
    case "home":
      viewKey = "home";
      content = (
        <KbHome
          onSearch={q => goList(undefined, q)}
          onArticleClick={goArticle}
          onCategoryClick={goCategory}
        />
      );
      break;

    case "list":
      viewKey = `list-${view.categoryId ?? "all"}-${view.query ?? ""}`;
      content = (
        <KbArticleList
          initialCategoryId={view.categoryId}
          initialQuery={view.query}
          onArticleClick={goArticle}
        />
      );
      break;

    case "category": {
      const cat = KB_CATEGORIES_BY_ID[view.categoryId];
      viewKey = `cat-${view.categoryId}`;
      content = cat ? (
        <KbCategoryPage category={cat} onBack={goHome} onArticleClick={goArticle} />
      ) : (
        <KbHome onSearch={q => goList(undefined, q)} onArticleClick={goArticle} onCategoryClick={goCategory} />
      );
      break;
    }

    case "article": {
      const article = KB_ARTICLES_BY_ID[view.articleId];
      viewKey = `article-${view.articleId}`;
      content = article ? (
        <KbArticlePage article={article} onBack={goHome} onArticleClick={goArticle} />
      ) : (
        <KbHome onSearch={q => goList(undefined, q)} onArticleClick={goArticle} onCategoryClick={goCategory} />
      );
      break;
    }
  }

  return <PageTransition viewKey={viewKey}>{content}</PageTransition>;
}
