import { motion } from "framer-motion";
import {
  Search,
  Sparkles,
  HeadphonesIcon,
  TicketIcon,
  Bug,
  MessageSquarePlus,
  Lightbulb,
  Phone,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  User,
  ShieldCheck,
  Leaf,
  Map,
  Settings,
  FileText,
  ChevronRight,
  Clock,
  Eye,
  ArrowUpRight,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { FADE_UP, STAGGER, DUR_MD, EASE_OUT } from "@/lib/motion";
import {
  SectionHeader,
  CategoryCard,
  QuickActionCard,
  ArticleCard,
  TimelineCard,
  EmptyState,
} from "./help-card";
import { InlineSearchBar } from "./help-search-bar";

// ─── Placeholder data ─────────────────────────────────────────────────────────

const HELP_CATEGORIES = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Account setup, first steps, and platform orientation",
    icon: BookOpen,
    count: 12,
    color: "var(--color-primary)",
  },
  {
    id: "citizen-portal",
    title: "Citizen Portal",
    description: "Submit complaints, track reports, and view local alerts",
    icon: User,
    count: 8,
    color: "var(--color-info)",
  },
  {
    id: "authority-portal",
    title: "Authority Portal",
    description: "Command center, complaint management, and enforcement tools",
    icon: ShieldCheck,
    count: 14,
    color: "var(--color-warning)",
  },
  {
    id: "administrator-portal",
    title: "Administrator Portal",
    description: "Platform governance, user management, and city configuration",
    icon: Settings,
    count: 9,
    color: "var(--color-destructive)",
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Environmental metrics, widgets, and real-time data panels",
    icon: LayoutDashboard,
    count: 11,
    color: "var(--color-primary)",
  },
  {
    id: "ai-copilot",
    title: "AI Copilot",
    description: "Natural language queries, AI brief, and smart analysis",
    icon: Sparkles,
    count: 6,
    color: "var(--color-info)",
  },
  {
    id: "reports",
    title: "Reports",
    description: "Generate, export, and schedule environmental reports",
    icon: FileText,
    count: 7,
    color: "var(--color-warning)",
  },
  {
    id: "sustainability",
    title: "Sustainability",
    description: "ESG tracking, sustainability scores, and green initiatives",
    icon: Leaf,
    count: 5,
    color: "var(--color-success)",
  },
  {
    id: "maps",
    title: "Smart Maps",
    description: "GIS layers, air quality overlays, and hazard intelligence",
    icon: Map,
    count: 8,
    color: "var(--color-primary)",
  },
  {
    id: "settings",
    title: "Settings & Security",
    description: "Profile, notifications, 2FA, and data privacy",
    icon: ShieldCheck,
    count: 10,
    color: "var(--color-success)",
  },
];

const QUICK_ACTIONS = [
  {
    id: "search-help",
    title: "Search Help",
    description: "Find answers instantly with full-text search across all articles",
    icon: Search,
    color: "var(--color-primary)",
  },
  {
    id: "ai-assistant",
    title: "AI Assistant",
    description: "Get AI-powered answers to complex platform questions",
    icon: Sparkles,
    color: "var(--color-info)",
    badge: "AI",
  },
  {
    id: "contact-support",
    title: "Contact Support",
    description: "Reach our team via email, chat, or phone support",
    icon: HeadphonesIcon,
    color: "var(--color-success)",
  },
  {
    id: "open-ticket",
    title: "Open Support Ticket",
    description: "Create a tracked support request for complex issues",
    icon: TicketIcon,
    color: "var(--color-warning)",
  },
  {
    id: "report-bug",
    title: "Report Bug",
    description: "Found a bug? Report it and help us improve the platform",
    icon: Bug,
    color: "var(--color-destructive)",
  },
  {
    id: "submit-feedback",
    title: "Submit Feedback",
    description: "Share your experience and help shape product decisions",
    icon: MessageSquarePlus,
    color: "var(--color-primary)",
  },
  {
    id: "request-feature",
    title: "Request Feature",
    description: "Suggest new features or vote on community requests",
    icon: Lightbulb,
    color: "var(--color-warning)",
  },
  {
    id: "emergency",
    title: "Emergency Contacts",
    description: "Critical incident contacts and escalation procedures",
    icon: Phone,
    color: "var(--color-destructive)",
    badge: "24/7",
  },
];

const POPULAR_ARTICLES = [
  {
    id: "1",
    title: "Understanding the Air Quality Index (AQI) and Health Guidelines",
    excerpt:
      "A comprehensive guide to how GreenGuard calculates AQI, what each category means, and recommended actions for different pollution levels.",
    category: "Getting Started",
    readTime: "5 min read",
    updatedAt: "2 days ago",
    views: 4821,
  },
  {
    id: "2",
    title: "How to Submit and Track Environmental Complaints",
    excerpt:
      "Step-by-step instructions for filing pollution complaints, adding photo evidence, tracking resolution status, and receiving notifications.",
    category: "Citizen Portal",
    readTime: "4 min read",
    updatedAt: "1 week ago",
    views: 3604,
  },
  {
    id: "3",
    title: "Authority Command Center: Managing Alerts and Dispatching",
    excerpt:
      "Complete walkthrough of the Authority Command Center — assigning complaints, escalating critical events, and coordinating response.",
    category: "Authority Portal",
    readTime: "8 min read",
    updatedAt: "3 days ago",
    views: 2190,
  },
  {
    id: "4",
    title: "Using the AI Copilot for Environmental Analysis",
    excerpt:
      "Learn how to query the AI Copilot for data insights, generate automated daily briefs, and interpret trend analysis.",
    category: "AI Copilot",
    readTime: "6 min read",
    updatedAt: "5 days ago",
    views: 1876,
  },
];

const RECENTLY_UPDATED = [
  {
    id: "u1",
    title: "New Smart Map Hazard Intelligence Layer added",
    description:
      "Documentation updated to cover the new wildfire risk, flood zone, and industrial hazard overlays in the Smart Map view.",
    date: "Today",
    type: "feature" as const,
  },
  {
    id: "u2",
    title: "Enterprise Profile: Photo Cropper Guide",
    description:
      "Added guide for the new canvas-based profile photo cropper, including aspect ratio and file size recommendations.",
    date: "Yesterday",
    type: "update" as const,
  },
  {
    id: "u3",
    title: "Complaint Workflow: Assignment & Escalation",
    description:
      "Guide updated to reflect the new authority assignment dialog and complaint escalation workflow introduced in v2.4.",
    date: "3 days ago",
    type: "update" as const,
  },
  {
    id: "u4",
    title: "Fixed: Session timeout documentation",
    description: "Corrected inaccurate session expiry times in the Security Center guide.",
    date: "5 days ago",
    type: "fix" as const,
  },
];

const CONTINUE_READING = [
  {
    id: "c1",
    title: "Setting Up Two-Factor Authentication",
    progress: 65,
    category: "Settings & Security",
    timeLeft: "2 min left",
  },
  {
    id: "c2",
    title: "Advanced Map Layers: GIS Configuration",
    progress: 30,
    category: "Smart Maps",
    timeLeft: "5 min left",
  },
];

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function WelcomeSection({ onSearchClick }: { onSearchClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_MD, ease: EASE_OUT }}
      className="relative rounded-2xl overflow-hidden border border-border bg-card"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 size-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 size-48 rounded-full bg-info/5 blur-3xl" />
      </div>

      <div className="relative p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Text */}
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-medium">
                Help Center
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
              How can we help you?
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              Browse our comprehensive knowledge base, watch guided tutorials, or reach our support
              team — everything you need to get the most from GreenGuard AI.
            </p>

            {/* CTA row */}
            <div className="flex flex-wrap gap-3 mt-5">
              <Link
                to="/help/knowledge-base"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Search className="size-4" />
                Search Help
              </Link>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted transition-colors text-muted-foreground"
                onClick={onSearchClick}
              >
                <HeadphonesIcon className="size-4" />
                Contact Support
              </button>
            </div>
          </div>

          {/* Stats chips */}
          <div className="flex md:flex-col gap-3 md:gap-2 flex-wrap">
            {[
              { label: "Help Articles", value: "120+" },
              { label: "Video Guides", value: "40+" },
              { label: "Avg. Response", value: "< 2h" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col px-4 py-2.5 rounded-xl border border-border bg-background/60 min-w-[100px]"
              >
                <span className="text-lg font-bold tabular-nums">{stat.value}</span>
                <span className="text-[10px] text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inline search */}
        <div className="mt-6">
          <InlineSearchBar onFocus={onSearchClick} />
        </div>
      </div>
    </motion.div>
  );
}

function QuickActionsSection() {
  return (
    <section>
      <SectionHeader
        eyebrow="Quick Access"
        title="Quick Actions"
        description="Common tasks and shortcuts"
      />
      <motion.div
        variants={STAGGER(0.05, 0.1)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {QUICK_ACTIONS.map((action) => (
          <motion.div key={action.id} variants={FADE_UP}>
            <QuickActionCard
              title={action.title}
              description={action.description}
              icon={action.icon}
              accentColor={action.color}
              badge={"badge" in action ? (action.badge as string) : undefined}
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function PopularArticlesSection() {
  return (
    <section>
      <SectionHeader
        eyebrow="Top Reads"
        title="Popular Articles"
        action={
          <Link
            to="/help/knowledge-base"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            View all
            <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
          </Link>
        }
      />
      <motion.div
        variants={STAGGER(0.06, 0.1)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
      >
        {POPULAR_ARTICLES.map((article) => (
          <motion.div key={article.id} variants={FADE_UP}>
            <ArticleCard
              title={article.title}
              excerpt={article.excerpt}
              category={article.category}
              readTime={article.readTime}
              updatedAt={article.updatedAt}
              views={article.views}
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function RecentlyUpdatedSection() {
  return (
    <section>
      <SectionHeader
        eyebrow="Latest"
        title="Recently Updated"
        action={
          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group">
            View changelog
            <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
          </button>
        }
      />
      <motion.div
        variants={STAGGER(0.06, 0.1)}
        initial="hidden"
        animate="show"
        className="rounded-xl border border-border bg-card p-4"
      >
        {RECENTLY_UPDATED.map((item) => (
          <motion.div key={item.id} variants={FADE_UP}>
            <TimelineCard
              title={item.title}
              description={item.description}
              date={item.date}
              type={item.type}
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function ContinueReadingSection() {
  if (CONTINUE_READING.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No reading history yet"
        description="Articles you start reading will appear here so you can pick up where you left off."
      />
    );
  }

  return (
    <section>
      <SectionHeader eyebrow="Pick Up Where You Left Off" title="Continue Reading" />
      <div className="space-y-3">
        {CONTINUE_READING.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR_MD, ease: EASE_OUT }}
            className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-all duration-200 group cursor-pointer"
          >
            <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <BookOpen className="size-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-0.5">
                {item.category}
              </div>
              <p className="text-sm font-medium truncate">{item.title}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60 transition-all duration-500"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{item.timeLeft}</span>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function CategoriesSection() {
  const navigate = useNavigate();

  return (
    <section>
      <SectionHeader
        eyebrow="Browse by Topic"
        title="Help Categories"
        description="Everything organized by platform area"
        action={
          <Link
            to="/help/knowledge-base"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            Browse all
            <ArrowUpRight className="size-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
          </Link>
        }
      />
      <motion.div
        variants={STAGGER(0.04, 0.1)}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
      >
        {HELP_CATEGORIES.map((cat) => (
          <motion.div key={cat.id} variants={FADE_UP}>
            <CategoryCard
              title={cat.title}
              description={cat.description}
              icon={cat.icon}
              count={cat.count}
              accentColor={cat.color}
              onClick={() => navigate({ to: "/help/knowledge-base" })}
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ─── Main home page ───────────────────────────────────────────────────────────

export function HelpCenterHome({ onSearchClick }: { onSearchClick: () => void }) {
  return (
    <div className="p-4 md:p-6 max-w-[1200px] mx-auto space-y-8 pb-16">
      {/* Welcome + search hero */}
      <WelcomeSection onSearchClick={onSearchClick} />

      {/* Quick actions */}
      <QuickActionsSection />

      {/* Two-column layout for mid sections */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
        {/* Popular articles — wider */}
        <div className="xl:col-span-3">
          <PopularArticlesSection />
        </div>

        {/* Right column — recently updated + continue reading */}
        <div className="xl:col-span-2 space-y-8">
          <RecentlyUpdatedSection />
          <ContinueReadingSection />
        </div>
      </div>

      {/* Category grid */}
      <CategoriesSection />
    </div>
  );
}
