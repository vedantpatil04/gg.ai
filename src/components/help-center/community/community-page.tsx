import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  MessageSquare,
  HelpCircle,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertCircle,
  Check,
  Tag,
  Eye,
  MessageCircle,
  Pencil,
  Trash2,
  Award,
  X,
  Filter,
  Leaf,
  Compass,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DUR_MD, DUR_SM, EASE_OUT, HOVER_LIFT_SM, TAP_PRESS_SM } from "@/lib/motion";
import { SectionHeader, EmptyState } from "../help-card";
import { FormField, FormInput, FormTextarea, FormSelect, SuccessState } from "../support/support-ui";
import { useCommunityPosts, useCommunityPost, useCreatePost } from "./community-store";
import { useAuth } from "@/lib/auth-context";
import type {
  PostListItem,
  CommunityPostDTO,
  CommunityReply,
  PostType,
} from "@/lib/api/community.api";

// ─── Topics / Categories ──────────────────────────────────────────────────────

const COMMUNITY_TOPICS = [
  "All",
  "Environmental Monitoring",
  "AQI & Air Quality",
  "Citizen Hub",
  "Weather & Forecast",
  "Smart Map",
  "Sustainability",
  "GreenGuard AI",
] as const;

const POST_CATEGORIES = [
  "Environmental Monitoring",
  "AQI & Air Quality",
  "Citizen Hub",
  "Weather & Forecast",
  "Smart Map",
  "Sustainability",
  "GreenGuard AI",
  "Sensor Alerts & Early Warnings",
];

type CommunityView = "hub" | "browse" | "post-detail" | "create";
type BrowseFilter = "all" | "discussions" | "questions" | "answered" | "unanswered";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 2) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ─── Status & Type Styles ─────────────────────────────────────────────────────

const POST_TYPE_STYLE: Record<
  PostType,
  { label: string; icon: typeof MessageSquare; color: string }
> = {
  discussion: { label: "Discussion", icon: MessageSquare, color: "var(--color-primary)" },
  question: { label: "Question", icon: HelpCircle, color: "var(--color-warning)" },
};

const STATUS_STYLE = {
  open: { label: "Open", color: "var(--color-info)" },
  resolved: { label: "Resolved", color: "var(--color-success)" },
  closed: { label: "Closed", color: "var(--color-muted-foreground)" },
};

// ─── 1. Community Hero ────────────────────────────────────────────────────────

function CommunityHero({
  onStartDiscussion,
  onBrowse,
}: {
  onStartDiscussion: () => void;
  onBrowse: () => void;
}) {
  return (
    <div className="relative rounded-2xl border border-border bg-card/80 p-6 sm:p-8 md:p-10 space-y-6">
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
          <Leaf className="size-3 text-primary" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold">
            Environmental Community
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          Learn, share, and explore environmental insights
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
          Ask questions, share local observations, discuss environmental topics, and learn from
          other GreenGuard AI users.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={onStartDiscussion}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="size-4" />
            Start a Discussion
          </button>
          <button
            onClick={onBrowse}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-sm font-semibold text-foreground transition-colors"
          >
            <Search className="size-4 text-muted-foreground" />
            Browse Community
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 2. Topic Filter Chips ────────────────────────────────────────────────────

function TopicFilterChips({
  selectedTopic,
  onSelectTopic,
}: {
  selectedTopic: string;
  onSelectTopic: (topic: string) => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {COMMUNITY_TOPICS.map((topic) => (
        <button
          key={topic}
          onClick={() => onSelectTopic(topic)}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 shrink-0",
            selectedTopic === topic
              ? "bg-primary text-primary-foreground font-semibold shadow-sm"
              : "border border-border/80 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          {topic}
        </button>
      ))}
    </div>
  );
}

// ─── 3. Post Card Item ────────────────────────────────────────────────────────

function PostCard({
  post,
  onClick,
}: {
  post: PostListItem;
  onClick: () => void;
}) {
  const typeStyle = POST_TYPE_STYLE[post.type] ?? POST_TYPE_STYLE.discussion;
  const TypeIcon = typeStyle.icon;
  const statusStyle = STATUS_STYLE[post.status] ?? STATUS_STYLE.open;

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border/80 bg-card p-4 sm:p-5 hover:border-primary/40 hover:bg-card transition-all duration-150 group flex items-start gap-4"
    >
      <div
        className="size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `color-mix(in oklab, ${typeStyle.color} 12%, transparent)` }}
      >
        <TypeIcon className="size-4" style={{ color: typeStyle.color }} />
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              color: typeStyle.color,
              background: `color-mix(in oklab, ${typeStyle.color} 10%, transparent)`,
            }}
          >
            {typeStyle.label}
          </span>
          <span
            className="text-[9px] font-semibold"
            style={{ color: statusStyle.color }}
          >
            {statusStyle.label}
          </span>
          {post.hasBestAnswer && (
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-success">
              <Check className="size-2.5" /> Answered
            </span>
          )}
          <span className="text-[11px] text-muted-foreground/70">·</span>
          <span className="text-[11px] text-muted-foreground">{post.category}</span>
        </div>

        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
          {post.title}
        </h3>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span>{post.authorName}</span>
          <span>·</span>
          <span>{timeAgo(post.createdAt)}</span>
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 text-[9px] px-2 py-0.5 rounded-full border border-border text-muted-foreground"
              >
                <Tag className="size-2" /> {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground pt-1">
        <div className="flex items-center gap-1">
          <MessageCircle className="size-3.5" />
          <span>{post.replyCount}</span>
        </div>
        {post.views > 0 && (
          <div className="flex items-center gap-1 hidden sm:flex">
            <Eye className="size-3.5" />
            <span>{post.views}</span>
          </div>
        )}
        <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
      </div>
    </button>
  );
}

// ─── 4. Join the Community Section ────────────────────────────────────────────

function JoinCommunitySection({
  onAskQuestion,
  onStartDiscussion,
  onBrowse,
}: {
  onAskQuestion: () => void;
  onStartDiscussion: () => void;
  onBrowse: () => void;
}) {
  const actions = [
    {
      title: "Ask a Question",
      description:
        "Get perspectives from other GreenGuard users and environmental community members.",
      icon: HelpCircle,
      actionText: "Ask a Question",
      onClick: onAskQuestion,
      color: "var(--color-warning)",
    },
    {
      title: "Start a Discussion",
      description:
        "Share an idea, local environmental observation, experience, or research topic.",
      icon: MessageSquare,
      actionText: "Start Discussion",
      onClick: onStartDiscussion,
      color: "var(--color-primary)",
    },
    {
      title: "Browse Discussions",
      description:
        "Explore conversations about environmental monitoring, alerts, sustainability, and GreenGuard AI.",
      icon: Compass,
      actionText: "Browse Community",
      onClick: onBrowse,
      color: "var(--color-info)",
    },
  ];

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Join the Community</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Ask a question, share what you're seeing, or start a conversation about your local
          environment.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {actions.map(({ title, description, icon: Icon, actionText, onClick, color }) => (
          <button
            key={title}
            type="button"
            onClick={onClick}
            className="text-left flex flex-col justify-between p-5 rounded-xl border border-border/80 bg-card/70 hover:border-primary/40 hover:bg-card transition-all duration-200 group h-full"
          >
            <div className="space-y-3">
              <div
                className="size-10 rounded-xl flex items-center justify-center"
                style={{ background: `color-mix(in oklab, ${color} 12%, transparent)` }}
              >
                <Icon className="size-5" style={{ color }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  {title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">{description}</p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors inline-flex items-center gap-1">
                {actionText}
                <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform duration-150" />
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

// ─── 5. Browse / Search View ──────────────────────────────────────────────────

function BrowseCommunityPosts({
  onBack,
  onViewPost,
  onCreate,
  initialTopic,
}: {
  onBack: () => void;
  onViewPost: (id: string) => void;
  onCreate: (type?: PostType) => void;
  initialTopic?: string;
}) {
  const [filter, setFilter] = useState<BrowseFilter>("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(
    initialTopic && initialTopic !== "All" ? initialTopic : "",
  );
  const [debouncedQ, setDebouncedQ] = useState("");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQ(search), 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [search]);

  const apiFilters = useMemo(() => {
    const f: Parameters<typeof useCommunityPosts>[0] = {};
    if (filter === "discussions") f.type = "discussion";
    if (filter === "questions") f.type = "question";
    if (filter === "answered") {
      f.type = "question";
      f.status = "resolved";
    }
    if (filter === "unanswered") {
      f.type = "question";
      f.status = "open";
    }
    if (debouncedQ.trim()) f.q = debouncedQ.trim();
    if (category) f.category = category;
    return f;
  }, [filter, debouncedQ, category]);

  const { data, isLoading, isError, refetch } = useCommunityPosts(apiFilters);
  const posts = data?.posts ?? [];

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Back to Community
      </button>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Community Discussions</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Explore conversations, questions, and observations from GreenGuard AI users.
            </p>
          </div>
          <button
            onClick={() => onCreate()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shrink-0 self-start sm:self-auto"
          >
            <Plus className="size-3.5" />
            New Post
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-primary/50 transition-all">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search discussions, questions, observations…"
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2.5 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground sm:w-52 shrink-0"
          >
            <option value="">All Topics</option>
            {POST_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Sub-Filters */}
        <div className="flex gap-1 p-1 rounded-xl border border-border bg-muted/30 overflow-x-auto">
          {(["all", "discussions", "questions", "answered", "unanswered"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 shrink-0 capitalize",
                filter === f
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "unanswered" ? "Unanswered" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Loading discussions…</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <p className="text-sm text-muted-foreground">Failed to load discussions.</p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted transition-colors"
            >
              <RefreshCw className="size-3.5" /> Retry
            </button>
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={Users}
            title={debouncedQ ? "No matching discussions" : "No discussions yet"}
            description={
              debouncedQ
                ? `No results found for "${debouncedQ}". Try different keywords or clear filters.`
                : "Be the first to ask a question or start an environmental conversation."
            }
            action={
              <button
                onClick={() => onCreate()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Start a Discussion
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <PostCard key={post._id} post={post} onClick={() => onViewPost(post._id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 6. Create Post Form ──────────────────────────────────────────────────────

function CreatePostForm({
  initialType = "discussion",
  onBack,
  onSuccess,
}: {
  initialType?: PostType;
  onBack: () => void;
  onSuccess: (id: string) => void;
}) {
  const { submit, isSubmitting, submitted, newPost, reset } = useCreatePost();
  const [type, setType] = useState<PostType>(initialType);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(POST_CATEGORIES[0] || "Environmental Monitoring");
  const [body, setBody] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim() || title.length < 5) e.title = "Title must be at least 5 characters";
    if (!body.trim() || body.length < 10) e.body = "Content must be at least 10 characters";
    if (!category) e.category = "Please select a topic";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags((prev) => [...prev, t]);
      setTagInput("");
    }
  };

  const handleSubmit = () => {
    if (!validate() || isSubmitting) return;
    submit({ type, title, body, category, tags });
  };

  if (submitted && newPost) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <SuccessState
          title={type === "question" ? "Question Published!" : "Discussion Started!"}
          description="Your post is now live in the GreenGuard AI community. Other members can read and reply to it."
          onReset={() => {
            reset();
            onSuccess(newPost._id);
          }}
          resetLabel="View Your Post"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Back to Community
      </button>

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {type === "question" ? "Ask the Community" : "Start an Environmental Discussion"}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Share questions, field observations, or insights with other GreenGuard platform users.
          </p>
        </div>

        {/* Type selector */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("discussion")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all",
              type === "discussion"
                ? "border-primary/50 bg-primary/10 text-primary shadow-sm"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <MessageSquare className="size-4" />
            Discussion / Observation
          </button>
          <button
            type="button"
            onClick={() => setType("question")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all",
              type === "question"
                ? "border-warning/50 bg-warning/10 text-warning shadow-sm"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <HelpCircle className="size-4" />
            Question / Need Help
          </button>
        </div>

        <div className="space-y-4">
          <FormField label="Title" required>
            <FormInput
              value={title}
              onChange={setTitle}
              placeholder={
                type === "question"
                  ? "e.g., How should I interpret PM2.5 changes during rainfall?"
                  : "e.g., AQI increased sharply near the industrial zone today — observations"
              }
            />
            {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
          </FormField>

          <FormField label="Topic" required>
            <FormSelect
              value={category}
              onChange={setCategory}
              options={POST_CATEGORIES}
              placeholder="Select a topic"
            />
            {errors.category && (
              <p className="text-xs text-destructive mt-1">{errors.category}</p>
            )}
          </FormField>

          <FormField label="Content" required>
            <FormTextarea
              value={body}
              onChange={setBody}
              placeholder={
                type === "question"
                  ? "Describe what you need clarification on or what situation you're analyzing…"
                  : "Share your observation, context, station location, or environmental insight…"
              }
              rows={6}
            />
            {errors.body && <p className="text-xs text-destructive mt-1">{errors.body}</p>}
          </FormField>

          <FormField label="Tags (optional, up to 5)">
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Type a tag and press Enter…"
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/60"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || tags.length >= 5}
                  className="px-3 py-2 rounded-lg border border-border text-xs hover:bg-muted transition-colors disabled:opacity-40"
                >
                  Add
                </button>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
                    >
                      <Tag className="size-2.5" />
                      {t}
                      <button
                        type="button"
                        onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                        className="hover:text-destructive transition-colors ml-0.5"
                      >
                        <X className="size-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </FormField>

          <div className="flex flex-col sm:flex-row gap-3 pt-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {isSubmitting
                ? "Publishing…"
                : type === "question"
                  ? "Post Question"
                  : "Start Discussion"}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 7. Post Detail View ──────────────────────────────────────────────────────

function PostDetailView({
  postId,
  onBack,
  onCreateNew,
}: {
  postId: string;
  onBack: () => void;
  onCreateNew: () => void;
}) {
  const {
    post,
    isLoading,
    isError,
    addReply,
    isReplying,
    editReply,
    deleteReply,
    markBestAnswer,
    isMarkingBest,
  } = useCommunityPost(postId);

  const [replyBody, setReplyBody] = useState("");
  const { user } = useAuth();
  const currentUserId = user?._id ?? "";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">Loading discussion…</span>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-sm text-muted-foreground">Discussion not found.</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
        >
          <ChevronLeft className="size-3.5" /> Back to Community
        </button>
      </div>
    );
  }

  const typeStyle = POST_TYPE_STYLE[post.type] ?? POST_TYPE_STYLE.discussion;
  const isQuestion = post.type === "question";

  const handleSendReply = async () => {
    if (!replyBody.trim() || isReplying) return;
    try {
      await addReply(replyBody.trim());
      setReplyBody("");
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
          Back to Discussions
        </button>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
        >
          <Plus className="size-3.5" /> Start another discussion
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{
              color: typeStyle.color,
              background: `color-mix(in oklab, ${typeStyle.color} 12%, transparent)`,
            }}
          >
            {typeStyle.label}
          </span>
          <span className="text-xs text-muted-foreground">{post.category}</span>
          <span className="text-xs text-muted-foreground/60">·</span>
          <span className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-snug">{post.title}</h1>

        <div className="flex items-center gap-2.5 pt-1 text-xs text-muted-foreground">
          <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
            {post.authorName.charAt(0).toUpperCase()}
          </div>
          <span>
            Posted by <span className="font-semibold text-foreground">{post.authorName}</span>
          </span>
        </div>

        <div className="pt-3 border-t border-border text-sm text-foreground leading-relaxed whitespace-pre-wrap">
          {post.body}
        </div>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground"
              >
                <Tag className="size-3" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Replies list */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">
          {post.replies.length} {post.replies.length === 1 ? "Response" : "Responses"}
        </h2>

        {post.replies.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
            No responses yet. Share your thoughts or knowledge below.
          </div>
        ) : (
          <div className="space-y-3">
            {post.replies.map((reply) => {
              const isBest = reply.isBestAnswer;
              const canMarkBest = isQuestion && post.authorId === currentUserId && !isBest;
              return (
                <div
                  key={reply._id}
                  className={cn(
                    "rounded-xl border p-4 sm:p-5 space-y-2.5 transition-colors",
                    isBest ? "border-success/40 bg-success/5" : "border-border bg-card",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                        {reply.authorName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-foreground">
                        {reply.authorName}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {timeAgo(reply.createdAt)}
                      </span>
                    </div>

                    {isBest && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/10">
                        <Award className="size-3" /> Best Answer
                      </span>
                    )}

                    {canMarkBest && (
                      <button
                        onClick={() => markBestAnswer(reply._id)}
                        disabled={isMarkingBest}
                        className="inline-flex items-center gap-1 text-[11px] text-success hover:underline font-semibold"
                      >
                        <Award className="size-3" /> Mark as Best Answer
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                    {reply.body}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Reply composer */}
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3">
          <label className="text-xs font-semibold text-foreground block">
            {isQuestion ? "Share an Answer" : "Leave a Reply"}
          </label>
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write your response with helpful context or observations…"
            rows={3}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/60 resize-none"
          />
          <button
            onClick={handleSendReply}
            disabled={!replyBody.trim() || isReplying}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isReplying ? <Loader2 className="size-3.5 animate-spin" /> : <MessageCircle className="size-3.5" />}
            {isReplying ? "Submitting…" : "Post Response"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Root Community Page ──────────────────────────────────────────────────────

export function CommunityPage() {
  const [view, setView] = useState<CommunityView>("hub");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>("All");
  const [createInitialType, setCreateInitialType] = useState<PostType>("discussion");

  // Fetch recent posts for hub
  const apiTopic = selectedTopic !== "All" ? selectedTopic : undefined;
  const { data, isLoading, isError } = useCommunityPosts({
    category: apiTopic,
    sort: "recent",
    page: 1,
  });
  const recentPosts = data?.posts ?? [];

  const handleOpenPost = (id: string) => {
    setSelectedPostId(id);
    setView("post-detail");
  };

  const handleStartDiscussion = (type: PostType = "discussion") => {
    setCreateInitialType(type);
    setView("create");
  };

  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10 sm:space-y-12">
        <AnimatePresence mode="wait">
          {view === "hub" && (
            <motion.div
              key="hub"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10 sm:space-y-12"
            >
              {/* 1. Community Hero */}
              <CommunityHero
                onStartDiscussion={() => handleStartDiscussion("discussion")}
                onBrowse={() => setView("browse")}
              />

              {/* 2. Topic Filter Chips & Recent Discussions */}
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-border/60 pb-3">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">
                      Recent Discussions
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Questions, observations, and conversations from the GreenGuard community.
                    </p>
                  </div>
                  <button
                    onClick={() => setView("browse")}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group shrink-0"
                  >
                    <span>View all discussions</span>
                    <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform duration-150" />
                  </button>
                </div>

                {/* Topic Navigation Chips */}
                <TopicFilterChips
                  selectedTopic={selectedTopic}
                  onSelectTopic={setSelectedTopic}
                />

                {/* Discussions List */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-sm">Loading discussions…</span>
                  </div>
                ) : isError ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    Failed to load community discussions.
                  </div>
                ) : recentPosts.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No discussions yet"
                    description={
                      selectedTopic !== "All"
                        ? `No discussions found in ${selectedTopic}. Be the first to start one!`
                        : "Be the first to ask a question or start an environmental conversation."
                    }
                    action={
                      <button
                        onClick={() => handleStartDiscussion("discussion")}
                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                      >
                        Start a Discussion
                      </button>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {recentPosts.slice(0, 6).map((post) => (
                      <PostCard
                        key={post._id}
                        post={post}
                        onClick={() => handleOpenPost(post._id)}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* 3. Join the Community Section */}
              <JoinCommunitySection
                onAskQuestion={() => handleStartDiscussion("question")}
                onStartDiscussion={() => handleStartDiscussion("discussion")}
                onBrowse={() => setView("browse")}
              />
            </motion.div>
          )}

          {view === "browse" && (
            <motion.div
              key="browse"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: DUR_SM, ease: EASE_OUT }}
            >
              <BrowseCommunityPosts
                onBack={() => setView("hub")}
                onViewPost={handleOpenPost}
                onCreate={(t) => handleStartDiscussion(t)}
                initialTopic={selectedTopic}
              />
            </motion.div>
          )}

          {view === "create" && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: DUR_SM, ease: EASE_OUT }}
            >
              <CreatePostForm
                initialType={createInitialType}
                onBack={() => setView("hub")}
                onSuccess={(id) => handleOpenPost(id)}
              />
            </motion.div>
          )}

          {view === "post-detail" && selectedPostId && (
            <motion.div
              key="post-detail"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: DUR_SM, ease: EASE_OUT }}
            >
              <PostDetailView
                postId={selectedPostId}
                onBack={() => setView("hub")}
                onCreateNew={() => handleStartDiscussion("discussion")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
