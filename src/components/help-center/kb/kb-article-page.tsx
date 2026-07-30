import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Link2,
  Printer,
  Share2,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  Info,
  Clock,
  Eye,
  User,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FADE_UP, STAGGER, DUR_MD, EASE_OUT } from "@/lib/motion";
import { SectionHeader } from "../help-card";
import {
  DifficultyBadge,
  BookmarkButton,
  TableOfContents,
  ReadingProgressBar,
  KbArticleCard,
} from "./kb-ui";
import type { KbArticle, KbSection } from "./kb-data";
import { KB_CATEGORIES_BY_ID, KB_ARTICLES } from "./kb-data";
import { getRelatedArticles } from "./kb-search";
import {
  useRecentlyViewed,
  useReadingProgress,
} from "./kb-store";

// ─── Article content renderer ─────────────────────────────────────────────────

function CalloutBox({
  variant,
  text,
}: {
  variant: "info" | "warning" | "success" | "danger";
  text: string;
}) {
  const styles = {
    info: {
      icon: Info,
      border: "var(--color-info)",
      label: "Note",
    },
    warning: {
      icon: AlertCircle,
      border: "var(--color-warning)",
      label: "Warning",
    },
    success: {
      icon: CheckCircle2,
      border: "var(--color-success)",
      label: "Tip",
    },
    danger: {
      icon: AlertCircle,
      border: "var(--color-destructive)",
      label: "Important",
    },
  };
  const s = styles[variant];
  const Icon = s.icon;

  return (
    <div
      className="my-5 rounded-xl border p-4 flex gap-3"
      style={{
        borderColor: `color-mix(in oklab, ${s.border} 40%, transparent)`,
        background: `color-mix(in oklab, ${s.border} 7%, transparent)`,
      }}
    >
      <Icon
        className="size-4 shrink-0 mt-0.5"
        style={{ color: s.border }}
      />
      <div>
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.15em] block mb-1"
          style={{ color: s.border }}
        >
          {s.label}
        </span>
        <p className="text-sm text-foreground/80 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function ArticleContentSection({ section, index }: { section: KbSection; index: number }) {
  if (section.type === "heading" && section.text) {
    const Tag = `h${section.level ?? 2}` as "h1" | "h2" | "h3";
    const id = section.text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const sizeClass =
      section.level === 2
        ? "text-xl font-bold mt-8 mb-3"
        : "text-base font-semibold mt-6 mb-2";
    return (
      <Tag id={id} className={sizeClass}>
        {section.text}
      </Tag>
    );
  }

  if (section.type === "paragraph" && section.text) {
    return (
      <p className="text-sm leading-[1.85] text-foreground/85 mb-4">
        {section.text}
      </p>
    );
  }

  if (section.type === "list" && section.items) {
    return (
      <ul className="mb-4 space-y-2">
        {section.items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/85 leading-relaxed">
            <div className="size-1.5 rounded-full bg-primary/60 shrink-0 mt-[0.45em]" />
            {item}
          </li>
        ))}
      </ul>
    );
  }

  if (section.type === "callout" && section.variant && section.text) {
    return <CalloutBox variant={section.variant as "info" | "warning" | "success" | "danger"} text={section.text} />;
  }

  if (section.type === "code" && section.text) {
    return (
      <div className="my-5 rounded-xl border border-border bg-muted overflow-hidden">
        {section.language && (
          <div className="px-4 py-2 border-b border-border text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            {section.language}
          </div>
        )}
        <pre className="p-4 overflow-x-auto text-xs font-mono text-foreground/90 leading-relaxed">
          <code>{section.text}</code>
        </pre>
      </div>
    );
  }

  return null;
}

// ─── Article TOC builder ──────────────────────────────────────────────────────

function buildTocItems(content: KbSection[]) {
  return content
    .filter(s => s.type === "heading" && s.text)
    .map(s => ({
      id: (s.text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      text: s.text ?? "",
      level: s.level ?? 2,
    }));
}

// ─── Article feedback ─────────────────────────────────────────────────────────

function ArticleFeedback() {
  const [voted, setVoted] = useState<"up" | "down" | null>(null);

  return (
    <div className="mt-12 pt-8 border-t border-border">
      <div className="text-center">
        <p className="text-sm font-medium mb-4">Was this article helpful?</p>
        <div className="flex items-center justify-center gap-3">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setVoted("up")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200",
              voted === "up"
                ? "bg-success/10 border-success/40 text-success"
                : "border-border hover:border-success/40 hover:bg-success/5 text-muted-foreground hover:text-success",
            )}
          >
            <ThumbsUp className="size-4" />
            Yes, helpful
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setVoted("down")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200",
              voted === "down"
                ? "bg-destructive/10 border-destructive/40 text-destructive"
                : "border-border hover:border-destructive/40 hover:bg-destructive/5 text-muted-foreground hover:text-destructive",
            )}
          >
            <ThumbsDown className="size-4" />
            Not really
          </motion.button>
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
                ? "Thank you for the feedback! We're glad this helped."
                : "Thanks for letting us know. We'll work on improving this article."}
            </motion.p>
          )}
        </AnimatePresence>

        {!voted && (
          <div className="flex items-center justify-center gap-4 mt-5">
            <button className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              <AlertCircle className="size-3" />
              Report outdated info
            </button>
            <button className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
              <Lightbulb className="size-3" />
              Suggest improvement
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Related articles ─────────────────────────────────────────────────────────

function RelatedArticles({
  articleId,
  onArticleClick,
}: {
  articleId: string;
  onArticleClick: (id: string) => void;
}) {
  const related = getRelatedArticles(articleId, 3);
  if (related.length === 0) return null;

  return (
    <div className="mt-10 pt-8 border-t border-border">
      <SectionHeader eyebrow="Keep Reading" title="Related Articles" />
      <motion.div
        variants={STAGGER(0.06)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {related.map(article => (
          <motion.div key={article.id} variants={FADE_UP}>
            <KbArticleCard
              article={article}
              onClick={() => onArticleClick(article.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// ─── Prev / Next navigation ───────────────────────────────────────────────────

function ArticleNavigation({
  currentId,
  onNavigate,
}: {
  currentId: string;
  onNavigate: (id: string) => void;
}) {
  const idx = KB_ARTICLES.findIndex(a => a.id === currentId);
  const prev = KB_ARTICLES[idx - 1];
  const next = KB_ARTICLES[idx + 1];

  return (
    <div className="mt-10 pt-6 border-t border-border grid grid-cols-2 gap-4">
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
      ) : (
        <div />
      )}
      {next ? (
        <button
          onClick={() => onNavigate(next.id)}
          className="flex items-start gap-3 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-muted/40 transition-all duration-200 text-right justify-end group col-start-2"
        >
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Next</div>
            <div className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">{next.title}</div>
          </div>
          <ChevronRight className="size-4 text-muted-foreground mt-0.5 shrink-0 group-hover:text-primary transition-colors" />
        </button>
      ) : (
        <div />
      )}
    </div>
  );
}

// ─── Article page ─────────────────────────────────────────────────────────────

interface KbArticlePageProps {
  article: KbArticle;
  onBack: () => void;
  onArticleClick: (id: string) => void;
}

export function KbArticlePage({ article, onBack, onArticleClick }: KbArticlePageProps) {
  const category = KB_CATEGORIES_BY_ID[article.categoryId];
  const tocItems = useMemo(() => buildTocItems(article.content), [article.content]);
  const [activeSection, setActiveSection] = useState<string | null>(tocItems[0]?.id ?? null);
  const [scrollPct, setScrollPct] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const { addRecent } = useRecentlyViewed();
  const { setArticleProgress } = useReadingProgress();

  // Track reading
  useEffect(() => {
    addRecent(article.id);
  }, [article.id, addRecent]);

  const handleProgress = useCallback(
    (pct: number) => {
      setScrollPct(pct);
      setArticleProgress(article.id, pct);
    },
    [article.id, setArticleProgress],
  );

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    const nodes = contentRef.current?.querySelectorAll("h2, h3");
    nodes?.forEach(n => observer.observe(n));
    return () => observer.disconnect();
  }, [article.content]);

  // Page scroll progress (whole page, not a sub-element)
  useEffect(() => {
    const handler = () => {
      const total = document.body.scrollHeight - window.innerHeight;
      if (total <= 0) { handleProgress(100); return; }
      handleProgress(Math.round((window.scrollY / total) * 100));
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [handleProgress]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <>
      <ReadingProgressBar percent={scrollPct} />

      <div className="p-4 md:p-6 max-w-[1200px] mx-auto pb-16">
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: DUR_MD, ease: EASE_OUT }}
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 group"
        >
          <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
          Back to Knowledge Base
        </motion.button>

        <div className="flex gap-8 items-start">
          {/* Main content */}
          <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR_MD, ease: EASE_OUT }}
            className="flex-1 min-w-0"
            ref={contentRef}
          >
            {/* Article header */}
            <header className="mb-8">
              {/* Category + difficulty */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.2em] px-2 py-0.5 rounded-md"
                  style={{
                    color: category?.accentColor ?? "var(--color-primary)",
                    background: category?.accentColor
                      ? `color-mix(in oklab, ${category.accentColor} 10%, transparent)`
                      : "var(--color-muted)",
                  }}
                >
                  {category?.title ?? article.categoryId.replace(/-/g, " ")}
                </span>
                <DifficultyBadge difficulty={article.difficulty} />
              </div>

              <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight mb-4">
                {article.title}
              </h1>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-5">
                <span className="flex items-center gap-1.5">
                  <User className="size-3.5" />
                  {article.author}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {article.readTime}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  Updated {article.updatedAt}
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye className="size-3.5" />
                  {article.views.toLocaleString()} views
                </span>
              </div>

              {/* Action bar */}
              <div className="flex items-center gap-2 pb-6 border-b border-border">
                <BookmarkButton articleId={article.id} />
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Link2 className="size-3.5" />
                  {linkCopied ? "Copied!" : "Copy Link"}
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Share2 className="size-3.5" />
                  Share
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Printer className="size-3.5" />
                  Print
                </button>

                {/* Progress pill */}
                {scrollPct > 0 && scrollPct < 100 && (
                  <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
                    <div className="w-20 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full aurora rounded-full transition-all duration-300"
                        style={{ width: `${scrollPct}%` }}
                      />
                    </div>
                    {scrollPct}% read
                  </div>
                )}
              </div>
            </header>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {article.tags.map(tag => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground bg-muted/40"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Content */}
            <div className="prose-sm max-w-none">
              {article.content.map((section, i) => (
                <ArticleContentSection key={i} section={section} index={i} />
              ))}
            </div>

            {/* Feedback */}
            <ArticleFeedback />

            {/* Prev/Next */}
            <ArticleNavigation currentId={article.id} onNavigate={onArticleClick} />

            {/* Related */}
            <RelatedArticles articleId={article.id} onArticleClick={onArticleClick} />
          </motion.article>

          {/* Sticky TOC — desktop only */}
          {tocItems.length > 0 && (
            <motion.aside
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: DUR_MD, ease: EASE_OUT, delay: 0.1 }}
              className="hidden xl:block w-56 shrink-0 sticky top-24 self-start"
            >
              <div className="rounded-xl border border-border bg-card p-4">
                <TableOfContents
                  items={tocItems}
                  activeId={activeSection}
                  onItemClick={scrollToSection}
                />

                {/* Progress */}
                <div className="mt-5 pt-4 border-t border-border">
                  <div className="text-[10px] text-muted-foreground mb-2">Reading progress</div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full aurora rounded-full"
                      animate={{ width: `${scrollPct}%` }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">{scrollPct}%</div>
                </div>
              </div>
            </motion.aside>
          )}
        </div>
      </div>
    </>
  );
}
