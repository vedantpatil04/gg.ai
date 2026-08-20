import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Search,
  BookOpen,
  HeadphonesIcon,
  Bug,
  MessageSquarePlus,
  ArrowRight,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Activity,
  Lock,
  FileText,
  HelpCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FADE_UP, STAGGER, DUR_MD, EASE_OUT } from "@/lib/motion";

// ─── Data Definitions ────────────────────────────────────────────────────────

interface QuickTopic {
  label: string;
  query: string;
  articleId?: string;
}

const QUICK_TOPICS: QuickTopic[] = [
  { label: "AQI Calculation", query: "AQI", articleId: "cit-002" },
  { label: "Complaint Tracking", query: "Complaint", articleId: "cit-001" },
  { label: "Sensor Alerts", query: "Alerts", articleId: "env-002" },
  { label: "Intelligence Center", query: "Intelligence Center", articleId: "ai-001" },
  { label: "2FA Security", query: "Two-Factor", articleId: "sec-001" },
];

interface SupportAction {
  id: string;
  title: string;
  description: string;
  icon: typeof BookOpen;
  to: string;
  isExternal?: boolean;
}

const SUPPORT_ACTIONS: SupportAction[] = [
  {
    id: "search-help",
    title: "Search Help",
    description: "Find answers across GreenGuard AI documentation and help resources.",
    icon: BookOpen,
    to: "/help/knowledge-base",
  },
  {
    id: "contact-support",
    title: "Contact Support",
    description: "Get assistance from the GreenGuard enterprise support team.",
    icon: HeadphonesIcon,
    to: "/help/support",
  },
  {
    id: "report-problem",
    title: "Report a Problem",
    description: "Report broken functionality, bugs, or unexpected behavior.",
    icon: Bug,
    to: "/help/support",
  },
  {
    id: "send-feedback",
    title: "Send Feedback",
    description: "Share product feedback or suggest improvements for the platform.",
    icon: MessageSquarePlus,
    to: "/help/feedback",
  },
];

interface PopularResource {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  updatedAt?: string;
}

const POPULAR_RESOURCES: PopularResource[] = [
  {
    id: "cit-002",
    title: "Understanding the Air Quality Index (AQI) and Health Guidelines",
    excerpt:
      "A comprehensive guide to how GreenGuard calculates AQI, category thresholds, pollutant measurements, and health guidance.",
    category: "Getting Started",
    readTime: "5 min read",
    updatedAt: "Updated recently",
  },
  {
    id: "cit-001",
    title: "Submitting and Tracking an Environmental Complaint",
    excerpt:
      "Step-by-step instructions for filing pollution complaints, attaching photo evidence, and tracking investigation status.",
    category: "Citizen Portal",
    readTime: "5 min read",
    updatedAt: "Updated recently",
  },
  {
    id: "auth-001",
    title: "Authority Command Center: Triaging Alerts & Dispatch",
    excerpt:
      "Complete walkthrough of the Command Center — assigning complaints, escalating critical events, and coordinating field response.",
    category: "Authority Portal",
    readTime: "8 min read",
    updatedAt: "Updated 3 days ago",
  },
  {
    id: "ai-001",
    title: "Using the GreenGuard Intelligence Center for Data Analysis",
    excerpt:
      "Learn how to query the Intelligence Center in natural language, generate automated daily briefs, and interpret trend reports.",
    category: "Intelligence Center",
    readTime: "6 min read",
    updatedAt: "Updated 1 week ago",
  },
  {
    id: "env-002",
    title: "Configuring Environmental Alert Thresholds",
    excerpt:
      "How to set up custom AQI and pollutant alert thresholds for your city or district, including notification and escalation rules.",
    category: "Environmental Monitoring",
    readTime: "5 min read",
    updatedAt: "Updated 5 days ago",
  },
  {
    id: "sec-001",
    title: "Setting Up Two-Factor Authentication & Account Security",
    excerpt:
      "A complete guide to enabling 2FA on your account, using authenticator apps, generating backup recovery codes, and session protection.",
    category: "Security",
    readTime: "5 min read",
    updatedAt: "Updated 5 days ago",
  },
];

// ─── Help Center Home Component ───────────────────────────────────────────────

interface HelpCenterHomeProps {
  onSearchClick?: () => void;
}

export function HelpCenterHome({ onSearchClick }: HelpCenterHomeProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(typeof navigator !== "undefined" && /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform));
  }, []);

  const handleSearchSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      navigate({
        to: "/help/knowledge-base",
        search: { q: trimmed } as any,
      });
    } else if (onSearchClick) {
      onSearchClick();
    } else {
      navigate({ to: "/help/knowledge-base" });
    }
  };

  const handleTopicClick = (topic: QuickTopic) => {
    if (topic.articleId) {
      navigate({
        to: "/help/knowledge-base",
        search: { article: topic.articleId } as any,
      });
    } else {
      navigate({
        to: "/help/knowledge-base",
        search: { q: topic.query } as any,
      });
    }
  };

  const handleArticleClick = (articleId: string) => {
    navigate({
      to: "/help/knowledge-base",
      search: { article: articleId } as any,
    });
  };

  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-12 sm:space-y-14">
        {/* ─── 1. Help Introduction & Primary Search ───────────────────────── */}
        <section className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              How can we help?
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
              Search the GreenGuard AI knowledge base, explore troubleshooting guides, or contact our
              support team.
            </p>
          </div>

          {/* Primary Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <div
              className={cn(
                "relative flex items-center w-full rounded-xl border border-border bg-card/90",
                "shadow-sm transition-all duration-200",
                "hover:border-border/90 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10",
              )}
            >
              <div className="grid place-items-center pl-4 pr-2 text-muted-foreground pointer-events-none">
                <Search className="size-5 shrink-0" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles, guides, topics, and FAQs…"
                className="w-full bg-transparent py-3.5 pr-20 sm:pr-24 text-sm sm:text-base text-foreground placeholder:text-muted-foreground/60 outline-none"
                aria-label="Search help resources"
              />
              <div className="absolute right-3 flex items-center gap-1.5">
                {searchQuery ? (
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    Search
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-[10px] font-mono font-medium text-muted-foreground/70 bg-muted/60 border border-border rounded">
                    {isMac ? "⌘K" : "Ctrl+K"}
                  </kbd>
                )}
              </div>
            </div>
          </form>

          {/* Quick Topic Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground mr-1">Popular topics:</span>
            {QUICK_TOPICS.map((topic) => (
              <button
                key={topic.label}
                type="button"
                onClick={() => handleTopicClick(topic)}
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-normal text-muted-foreground bg-muted/40 border border-border/80 hover:bg-muted hover:text-foreground hover:border-border transition-all duration-150"
              >
                {topic.label}
              </button>
            ))}
          </div>
        </section>

        {/* ─── 2. Quick Support Actions (4 cards) ──────────────────────────── */}
        <section className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {SUPPORT_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.id}
                  to={action.to as any}
                  className={cn(
                    "group relative flex flex-col p-4 sm:p-5 rounded-xl border border-border/80 bg-card/70",
                    "hover:border-primary/40 hover:bg-card hover:shadow-sm",
                    "transition-all duration-200 text-left",
                  )}
                >
                  <div className="size-9 rounded-lg bg-muted/70 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors duration-200 mb-3.5 shrink-0">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
                      {action.title}
                    </h2>
                    <ChevronRight className="size-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-150 shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {action.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ─── 3. Popular Help / Common Questions ──────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4 border-b border-border/60 pb-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Popular Help
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Common questions and useful guides
              </p>
            </div>
            <Link
              to="/help/knowledge-base"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group shrink-0"
            >
              <span>Browse Knowledge Base</span>
              <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform duration-150" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {POPULAR_RESOURCES.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => handleArticleClick(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleArticleClick(item.id);
                  }
                }}
                className={cn(
                  "group flex flex-col justify-between p-4 sm:p-5 rounded-xl border border-border/80 bg-card/60",
                  "hover:border-primary/40 hover:bg-card hover:shadow-sm cursor-pointer",
                  "transition-all duration-200",
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-medium tracking-wide uppercase text-muted-foreground/80">
                      {item.category}
                    </span>
                    <span className="text-[11px] text-muted-foreground/70 flex items-center gap-1">
                      <Clock className="size-3" />
                      {item.readTime}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors duration-200">
                    {item.title}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {item.excerpt}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="text-[11px] text-muted-foreground/60">{item.updatedAt}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground/70 group-hover:text-primary transition-colors">
                    Read guide
                    <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform duration-150" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── 4. Support & Feedback Dual Section ──────────────────────────── */}
        <section className="pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {/* Block 1: Contact Support */}
            <div className="flex flex-col justify-between p-5 sm:p-6 rounded-xl border border-border/80 bg-card/50 space-y-4">
              <div className="space-y-1.5">
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <HeadphonesIcon className="size-4" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  Need help with something specific?
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Can’t find what you’re looking for? Contact the GreenGuard AI support team.
                </p>
              </div>
              <div className="pt-1">
                <Link
                  to="/help/support"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs sm:text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <HeadphonesIcon className="size-3.5" />
                  Contact Support
                </Link>
              </div>
            </div>

            {/* Block 2: Share Feedback */}
            <div className="flex flex-col justify-between p-5 sm:p-6 rounded-xl border border-border/80 bg-card/50 space-y-4">
              <div className="space-y-1.5">
                <div className="size-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center mb-3">
                  <MessageSquarePlus className="size-4" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  Help us improve GreenGuard AI
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Tell us what worked well, what was confusing, or what you’d like to see improved.
                </p>
              </div>
              <div className="pt-1">
                <Link
                  to="/help/feedback"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-muted text-foreground text-xs sm:text-sm font-medium transition-colors"
                >
                  <MessageSquarePlus className="size-3.5 text-muted-foreground" />
                  Share Feedback
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
