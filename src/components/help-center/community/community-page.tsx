import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, MessageSquare, HelpCircle, Search, Plus,
  ChevronLeft, ChevronRight, Loader2, RefreshCw,
  AlertCircle, Check, Tag, Eye, MessageCircle,
  Pencil, Trash2, Award, X, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FADE_UP, STAGGER, DUR_MD, DUR_SM, EASE_OUT,
  HOVER_LIFT_SM, TAP_PRESS_SM,
} from "@/lib/motion";
import { SectionHeader, EmptyState } from "../help-card";
import { FormField, FormInput, FormTextarea, FormSelect, SuccessState } from "../support/support-ui";
import { useCommunityPosts, useCommunityPost, useCreatePost } from "./community-store";
import { useAuth } from "@/lib/auth-context";
import type { PostListItem, CommunityPostDTO, CommunityReply, PostType } from "@/lib/api/community.api";

// ─── Constants ────────────────────────────────────────────────────────────────

const COMMUNITY_CATEGORIES = [
  "GreenGuard Platform",
  "Citizen Portal",
  "Authority Portal",
  "Administrator Portal",
  "Environmental Monitoring",
  "Smart Maps",
  "Reports & Analytics",
  "Sustainability",
  "AI Copilot",
  "Notifications",
  "General",
];

type CommunityView = "hub" | "browse" | "post-detail" | "create";
type BrowseFilter  = "all" | "discussions" | "questions" | "answered" | "unanswered";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 2)   return "just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ─── Status / type styling ────────────────────────────────────────────────────

const POST_TYPE_STYLE: Record<PostType, { label: string; icon: typeof MessageSquare; color: string }> = {
  discussion: { label: "Discussion", icon: MessageSquare, color: "var(--color-primary)"  },
  question:   { label: "Question",   icon: HelpCircle,    color: "var(--color-warning)"   },
};

const STATUS_STYLE = {
  open:     { label: "Open",     color: "var(--color-info)"    },
  resolved: { label: "Resolved", color: "var(--color-success)" },
  closed:   { label: "Closed",   color: "var(--color-muted-foreground)" },
};

// ─── Post List Card ───────────────────────────────────────────────────────────

function PostCard({
  post,
  onClick,
}: {
  post:    PostListItem;
  onClick: () => void;
}) {
  const typeStyle   = POST_TYPE_STYLE[post.type];
  const TypeIcon    = typeStyle.icon;
  const statusStyle = STATUS_STYLE[post.status];

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      whileHover={{ y: -1, transition: { duration: 0.12 } }}
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border bg-background p-4 hover:border-primary/25 transition-colors duration-200 group"
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div
          className="size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: `color-mix(in oklab, ${typeStyle.color} 10%, transparent)` }}
        >
          <TypeIcon className="size-4" style={{ color: typeStyle.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em]" style={{ color: typeStyle.color }}>
              {typeStyle.label}
            </span>
            <span className="text-[9px] text-muted-foreground/60">·</span>
            <span
              className="text-[9px] font-semibold"
              style={{ color: statusStyle.color }}
            >
              {statusStyle.label}
            </span>
            {post.hasBestAnswer && (
              <>
                <span className="text-[9px] text-muted-foreground/60">·</span>
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-success">
                  <Check className="size-2.5" /> Answered
                </span>
              </>
            )}
          </div>

          <h4 className="text-sm font-semibold leading-snug mb-1.5 group-hover:text-primary transition-colors duration-150 line-clamp-2">
            {post.title}
          </h4>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <span>{post.authorName}</span>
            <span>·</span>
            <span>{post.category}</span>
            <span>·</span>
            <span>{timeAgo(post.createdAt)}</span>
          </div>

          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.tags.slice(0, 3).map(tag => (
                <span key={tag} className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground">
                  <Tag className="size-2" /> {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex flex-col items-end gap-1.5 shrink-0 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <MessageCircle className="size-3" />
            <span>{post.replyCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="size-3" />
            <span>{post.views}</span>
          </div>
          <ChevronRight className="size-3.5 text-muted-foreground/30 mt-0.5" />
        </div>
      </div>
    </motion.button>
  );
}

// ─── Community Hub Hero ───────────────────────────────────────────────────────

function CommunityHero({
  onBrowse,
  onCreate,
}: {
  onBrowse: () => void;
  onCreate: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_MD, ease: EASE_OUT }}
      className="relative rounded-2xl overflow-hidden border border-border bg-card"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 size-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 size-52 rounded-full bg-info/5 blur-3xl" />
      </div>

      <div className="relative p-6 md:p-10">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Users className="size-3 text-primary" />
              <span className="text-[10px] uppercase tracking-[0.22em] text-primary font-semibold">Community Hub</span>
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-4">
            Learn, share, and connect
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mb-8">
            Ask questions, start discussions, and help other GreenGuard users. Every post is read by the community and our platform team.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <motion.button
              whileHover={HOVER_LIFT_SM} whileTap={TAP_PRESS_SM}
              onClick={() => onCreate()}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="size-4" /> Start a Post
            </motion.button>
            <motion.button
              whileHover={HOVER_LIFT_SM} whileTap={TAP_PRESS_SM}
              onClick={onBrowse}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-muted transition-colors"
            >
              <Search className="size-4" /> Browse Community
            </motion.button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-8 mt-8 border-t border-border">
            {[
              { value: "Q&A", label: "Ask anything, get answers", icon: HelpCircle },
              { value: "Forums", label: "Discussions on every topic", icon: MessageSquare },
              { value: "Real",   label: "Real users, real insights", icon: Users },
            ].map(({ value, label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-sm font-bold">{value}</div>
                  <div className="text-[10px] text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Recent Posts Preview (on hub) ───────────────────────────────────────────

function RecentPostsPreview({
  onViewPost,
  onBrowse,
}: {
  onViewPost: (id: string) => void;
  onBrowse:   () => void;
}) {
  const { data, isLoading, isError } = useCommunityPosts({ sort: "recent", page: 1 });
  const posts = data?.posts.slice(0, 4) ?? [];

  if (isLoading) return (
    <div className="flex items-center justify-center py-10 gap-3 text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  );

  if (isError) return (
    <div className="text-center py-8 text-sm text-muted-foreground">Failed to load posts.</div>
  );

  if (posts.length === 0) return (
    <EmptyState
      icon={Users}
      title="No posts yet"
      description="Be the first to start a discussion or ask a question!"
    />
  );

  return (
    <div className="space-y-3">
      {posts.map(p => (
        <PostCard key={p._id} post={p} onClick={() => onViewPost(p._id)} />
      ))}
    </div>
  );
}

// ─── Browse Posts ─────────────────────────────────────────────────────────────

function BrowsePosts({
  onBack,
  onViewPost,
  onCreate,
}: {
  onBack:     () => void;
  onViewPost: (id: string) => void;
  onCreate:   () => void;
}) {
  const [filter,   setFilter]   = useState<BrowseFilter>("all");
  const [search,   setSearch]   = useState("");
  const [category, setCategory] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  // Debounce search
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQ(search), 350);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [search]);

  const apiFilters = useMemo(() => {
    const f: Parameters<typeof useCommunityPosts>[0] = {};
    if (filter === "discussions") f.type   = "discussion";
    if (filter === "questions")   f.type   = "question";
    if (filter === "answered")   { f.type  = "question"; f.status = "resolved"; }
    if (filter === "unanswered") { f.type  = "question"; f.status = "open"; }
    if (debouncedQ.trim()) f.q = debouncedQ.trim();
    if (category) f.category = category;
    return f;
  }, [filter, debouncedQ, category]);

  const { data, isLoading, isError, refetch } = useCommunityPosts(apiFilters);
  const posts = data?.posts ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_MD, ease: EASE_OUT }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 group"
      >
        <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Back to Community
      </button>

      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h2 className="text-xl font-bold">Community Posts</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Browse discussions and questions from the community.</p>
          </div>
          <motion.button
            whileHover={HOVER_LIFT_SM} whileTap={TAP_PRESS_SM}
            onClick={onCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shrink-0 self-start sm:self-auto"
          >
            <Plus className="size-3.5" /> New Post
          </motion.button>
        </div>

        {/* Search + category */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-2.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all group">
            <Search className="size-4 text-muted-foreground shrink-0 group-focus-within:text-primary transition-colors" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search posts, questions, discussions…"
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60"
              aria-label="Search community posts"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground" aria-label="Clear search">
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground sm:w-48 shrink-0"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {COMMUNITY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Filter tabs */}
        <div
          className="flex gap-1 p-1 rounded-xl border border-border bg-muted/30 overflow-x-auto"
          role="radiogroup"
          aria-label="Filter posts"
        >
          {(["all", "discussions", "questions", "answered", "unanswered"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              role="radio"
              aria-checked={filter === f}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 shrink-0 capitalize",
                filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f === "unanswered" ? "Unanswered" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Search note */}
        {debouncedQ && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="size-3.5" />
            <span>{posts.length} result{posts.length !== 1 ? "s" : ""} for "{debouncedQ}"</span>
          </div>
        )}

        {/* List */}
        {isLoading && (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Loading posts…</span>
          </div>
        )}
        {isError && (
          <div className="flex flex-col items-center py-12 gap-3">
            <AlertCircle className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Failed to load posts.</p>
            <button onClick={() => refetch()} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted transition-colors">
              <RefreshCw className="size-3.5" /> Retry
            </button>
          </div>
        )}
        {!isLoading && !isError && (
          <AnimatePresence mode="popLayout">
            {posts.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyState
                  icon={debouncedQ ? Search : Users}
                  title={debouncedQ ? "No matching posts" : "No posts yet"}
                  description={debouncedQ ? `No results for "${debouncedQ}"` : "Start the conversation!"}
                  action={
                    debouncedQ ? (
                      <button onClick={() => setSearch("")} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
                        Clear Search
                      </button>
                    ) : (
                      <button onClick={onCreate} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">
                        Create First Post
                      </button>
                    )
                  }
                />
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {posts.map(post => (
                  <PostCard key={post._id} post={post} onClick={() => onViewPost(post._id)} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
}

// ─── Reply Component ──────────────────────────────────────────────────────────

function ReplyItem({
  reply,
  postAuthorId,
  currentUserId,
  isAdmin,
  onMarkBest,
  onEdit,
  onDelete,
  isQuestion,
  isMarkingBest,
}: {
  reply:         CommunityReply;
  postAuthorId:  string;
  currentUserId: string;
  isAdmin:       boolean;
  onMarkBest:    (id: string) => void;
  onEdit:        (id: string, body: string) => void;
  onDelete:      (id: string) => void;
  isQuestion:    boolean;
  isMarkingBest: boolean;
}) {
  const [editing,  setEditing]  = useState(false);
  const [editBody, setEditBody] = useState(reply.body);
  const isOwner  = reply.authorId === currentUserId;
  const canBest  = isQuestion && postAuthorId === currentUserId && !reply.isBestAnswer;

  const handleSave = () => {
    if (editBody.trim()) {
      onEdit(reply._id, editBody.trim());
      setEditing(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_SM }}
      className={cn(
        "rounded-xl border p-4 transition-colors duration-200",
        reply.isBestAnswer
          ? "border-success/30 bg-success/5"
          : "border-border bg-background",
      )}
    >
      {reply.isBestAnswer && (
        <div className="flex items-center gap-1.5 mb-3">
          <Award className="size-3.5 text-success" />
          <span className="text-[10px] font-bold text-success uppercase tracking-[0.15em]">Best Answer</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
              {reply.authorName.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="text-xs font-semibold">{reply.authorName}</span>
              <span className="text-[10px] text-muted-foreground ml-1.5">{timeAgo(reply.createdAt)}</span>
            </div>
          </div>

          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                aria-label="Edit reply"
              />
              <div className="flex gap-2">
                <button onClick={handleSave} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity">Save</button>
                <button onClick={() => { setEditing(false); setEditBody(reply.body); }} className="px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted transition-colors">Cancel</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{reply.body}</p>
          )}
        </div>

        {/* Actions */}
        {!editing && (
          <div className="flex items-center gap-1 shrink-0">
            {canBest && (
              <button
                onClick={() => onMarkBest(reply._id)}
                disabled={isMarkingBest}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold text-success border border-success/25 bg-success/5 hover:bg-success/10 transition-colors disabled:opacity-50"
                aria-label="Mark as best answer"
              >
                <Award className="size-3" /> Best
              </button>
            )}
            {(isOwner || isAdmin) && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Edit reply"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => onDelete(reply._id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Delete reply"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Post Detail ──────────────────────────────────────────────────────────────

function PostDetail({
  postId,
  onBack,
  onCreateNew,
}: {
  postId:      string;
  onBack:      () => void;
  onCreateNew: () => void;
}) {
  const {
    post, isLoading, isError,
    addReply, isReplying,
    editReply, deleteReply,
    markBestAnswer, isMarkingBest,
  } = useCommunityPost(postId);

  const [replyBody, setReplyBody] = useState("");
  const [replyError, setReplyError] = useState("");

  const { user, isAuthenticated } = useAuth();
  const currentUserId = user?._id ?? "";
  const isAdmin       = user?.role === "administrator";

  const handleReply = async () => {
    if (!isAuthenticated) { setReplyError("Please sign in to post a reply."); return; }
    if (replyBody.trim().length < 5) { setReplyError("Reply must be at least 5 characters"); return; }
    setReplyError("");
    try {
      await addReply(replyBody.trim());
      setReplyBody("");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setReplyError(msg || "Failed to submit reply. Please try again.");
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
      <span className="text-sm">Loading post…</span>
    </div>
  );

  if (isError || !post) return (
    <div className="flex flex-col items-center py-16 gap-3">
      <AlertCircle className="size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Post not found or failed to load.</p>
      <button onClick={onBack} className="px-4 py-2 rounded-lg border border-border text-xs hover:bg-muted">Go back</button>
    </div>
  );

  const typeStyle   = POST_TYPE_STYLE[post.type];
  const statusStyle = STATUS_STYLE[post.status];
  const TypeIcon    = typeStyle.icon;

  // Sort replies: best answer first, then chronological
  const sortedReplies = [...post.replies].sort((a, b) =>
    a.isBestAnswer ? -1 : b.isBestAnswer ? 1 : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_MD, ease: EASE_OUT }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 group"
      >
        <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Back to Community
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="xl:col-span-2 space-y-5">
          {/* Post body */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em] px-2 py-0.5 rounded-full"
                  style={{
                    color:      typeStyle.color,
                    background: `color-mix(in oklab, ${typeStyle.color} 10%, transparent)`,
                  }}
                >
                  <TypeIcon className="size-2.5" /> {typeStyle.label}
                </span>
                <span className="text-[9px] font-semibold" style={{ color: statusStyle.color }}>
                  {statusStyle.label}
                </span>
                {post.hasBestAnswer && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-success">
                    <Check className="size-2.5" /> Answered
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto">{post.category}</span>
              </div>
              <h2 className="text-xl font-bold mb-1">{post.title}</h2>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{post.authorName}</span>
                <span>·</span>
                <span>{timeAgo(post.createdAt)}</span>
                <span>·</span>
                <Eye className="size-3" />
                <span>{post.views} views</span>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{post.body}</p>
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {post.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground">
                      <Tag className="size-3" /> {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Replies */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">
              {post.replyCount} {post.replyCount === 1 ? "Reply" : "Replies"}
            </div>
            <div className="space-y-3">
              <AnimatePresence>
                {sortedReplies.map(reply => (
                  <ReplyItem
                    key={reply._id}
                    reply={reply}
                    postAuthorId={post.authorId}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    onMarkBest={markBestAnswer}
                    onEdit={editReply}
                    onDelete={deleteReply}
                    isQuestion={post.type === "question"}
                    isMarkingBest={isMarkingBest}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Reply form */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-5 border-b border-border">
              <h3 className="text-sm font-bold">
                {post.type === "question" ? "Submit an Answer" : "Add a Reply"}
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <FormTextarea
                value={replyBody}
                onChange={setReplyBody}
                placeholder={post.type === "question"
                  ? "Share your answer or relevant knowledge…"
                  : "Add to the discussion…"
                }
                rows={5}
              />
              {replyError && <p className="text-xs text-destructive">{replyError}</p>}
              <motion.button
                whileHover={HOVER_LIFT_SM} whileTap={TAP_PRESS_SM}
                onClick={handleReply}
                disabled={isReplying || !replyBody.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReplying ? <><Loader2 className="size-4 animate-spin" />Posting…</> : <><MessageCircle className="size-4" />Post Reply</>}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">Post Info</div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-semibold capitalize">{post.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-semibold" style={{ color: statusStyle.color }}>{statusStyle.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="font-semibold">{post.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Replies</span>
                <span className="font-semibold">{post.replyCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Views</span>
                <span className="font-semibold">{post.views}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-2">Start your own post</div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">Have a related question or a new topic?</p>
            <button onClick={onCreateNew} className="w-full text-xs py-2 rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-center gap-1.5">
              <Plus className="size-3.5" /> New Post
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Create Post Form ─────────────────────────────────────────────────────────

function CreatePostForm({
  onBack,
  onSuccess,
}: {
  onBack:    () => void;
  onSuccess: (id: string) => void;
}) {
  const { submit, isSubmitting, submitted, newPost, reset } = useCreatePost();

  const [type,        setType]        = useState<PostType>("discussion");
  const [title,       setTitle]       = useState("");
  const [body,        setBody]        = useState("");
  const [category,    setCategory]    = useState("");
  const [tagInput,    setTagInput]    = useState("");
  const [tags,        setTags]        = useState<string[]>([]);
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  const { isAuthenticated } = useAuth();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!isAuthenticated)                        e.general  = "Please sign in to publish a post.";
    if (!title.trim() || title.length < 5)       e.title    = "Title must be at least 5 characters";
    if (!body.trim()  || body.length  < 10)       e.body     = "Body must be at least 10 characters";
    if (!category)                                e.category = "Please select a category";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (t && !tags.includes(t) && tags.length < 5) { setTags(p => [...p, t]); setTagInput(""); }
  };

  const handleSubmit = () => {
    if (!validate() || isSubmitting) return;
    submit({ type, title, body, category, tags });
  };

  const handleReset = () => {
    reset();
    setType("discussion"); setTitle(""); setBody(""); setCategory("");
    setTagInput(""); setTags([]); setErrors({});
  };

  if (submitted && newPost) {
    return (
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <SuccessState
          title="Post Published!"
          description="Your post is now live in the GreenGuard community. Others can reply and engage with your post."
          onReset={() => { handleReset(); onSuccess(newPost._id); }}
          resetLabel="View Post"
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR_MD, ease: EASE_OUT }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6 group"
      >
        <ChevronLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
        Back to Community
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="text-lg font-bold">Create a Post</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Ask a question or start a discussion with the community.</p>
            </div>
            <div className="p-5 space-y-5">
              {errors.general && (
                <div className="flex items-center gap-2 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{errors.general}</span>
                </div>
              )}
              {/* Type selector */}
              <div>
                <div className="text-xs font-medium mb-2">Post Type <span className="text-destructive">*</span></div>
                <div className="grid grid-cols-2 gap-3">
                  {(["discussion", "question"] as const).map(t => {
                    const ts = POST_TYPE_STYLE[t];
                    const TIcon = ts.icon;
                    return (
                      <button
                        key={t}
                        onClick={() => setType(t)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left",
                          type === t ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/20",
                        )}
                        aria-pressed={type === t}
                      >
                        <div className="size-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `color-mix(in oklab, ${ts.color} 10%, transparent)` }}>
                          <TIcon className="size-4" style={{ color: ts.color }} />
                        </div>
                        <div>
                          <div className="text-xs font-semibold">{ts.label}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {t === "discussion" ? "Share ideas, tips, news" : "Get answers from the community"}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <FormField label="Title" required>
                <FormInput value={title} onChange={setTitle} placeholder="A clear, descriptive title…" />
                {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
              </FormField>

              <FormField label="Category" required>
                <FormSelect value={category} onChange={setCategory} options={COMMUNITY_CATEGORIES} placeholder="Which area does this relate to?" />
                {errors.category && <p className="text-xs text-destructive mt-1">{errors.category}</p>}
              </FormField>

              <FormField label={type === "question" ? "Question Details" : "Post Content"} required>
                <FormTextarea
                  value={body}
                  onChange={setBody}
                  placeholder={type === "question"
                    ? "Describe your question in detail. What have you already tried?"
                    : "Share your thoughts, experience, or information with the community…"
                  }
                  rows={7}
                />
                {errors.body && <p className="text-xs text-destructive mt-1">{errors.body}</p>}
              </FormField>

              <FormField label="Tags (optional, up to 5)">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); handleAddTag(); } }}
                      placeholder="Type a tag and press Enter…"
                      maxLength={50}
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/60"
                      aria-label="Add tag"
                    />
                    <button onClick={handleAddTag} disabled={!tagInput.trim() || tags.length >= 5} className="px-3 py-2 rounded-lg border border-border text-xs hover:bg-muted transition-colors disabled:opacity-40">Add</button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map(t => (
                        <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          <Tag className="size-2.5" /> {t}
                          <button onClick={() => setTags(p => p.filter(x => x !== t))} className="ml-0.5 hover:text-destructive" aria-label={`Remove tag ${t}`}>
                            <X className="size-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </FormField>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <motion.button
                  whileHover={HOVER_LIFT_SM} whileTap={TAP_PRESS_SM}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSubmitting
                    ? <><Loader2 className="size-4 animate-spin" />Publishing…</>
                    : <><Plus className="size-4" />Publish Post</>
                  }
                </motion.button>
                <button onClick={onBack} className="px-4 py-2.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-3">Community Guidelines</div>
            <ul className="space-y-2.5">
              {[
                "Be respectful and constructive",
                "Stay on topic for GreenGuard",
                "Search before posting — your question may already be answered",
                "Include enough detail for others to help",
                "Use appropriate categories and tags",
              ].map(g => (
                <li key={g} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <div className="size-1.5 rounded-full bg-primary/50 shrink-0 mt-1.5" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Root Page ────────────────────────────────────────────────────────────────

export function CommunityPage() {
  const [view,       setView]       = useState<CommunityView>("hub");
  const [activePost, setActivePost] = useState<string | null>(null);

  const goToPost = useCallback((id: string) => {
    setActivePost(id);
    setView("post-detail");
  }, []);

  const goBack = useCallback(() => {
    setActivePost(null);
    setView("hub");
  }, []);

  return (
    <div className="p-4 md:p-6 xl:p-8 max-w-none space-y-8 pb-16">
      <AnimatePresence mode="wait">
        {view === "hub" && (
          <motion.div key="hub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: DUR_SM }} className="space-y-8">
            <CommunityHero
              onBrowse={() => setView("browse")}
              onCreate={() => setView("create")}
            />
            <section>
              <SectionHeader
                eyebrow="Latest Activity"
                title="Recent Posts"
                description="The latest discussions and questions from the community"
                action={
                  <button onClick={() => setView("browse")} className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                    View all <ChevronRight className="size-3" />
                  </button>
                }
              />
              <RecentPostsPreview onViewPost={goToPost} onBrowse={() => setView("browse")} />
            </section>

            {/* Quick action cards */}
            <section>
              <SectionHeader eyebrow="Get Started" title="Join the Conversation" />
              <motion.div
                variants={STAGGER(0.06, 0.05)}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {[
                  {
                    icon: HelpCircle,
                    title: "Ask a Question",
                    description: "Get help from the GreenGuard community and expert users",
                    color: "var(--color-warning)",
                    action: () => setView("create"),
                  },
                  {
                    icon: MessageSquare,
                    title: "Start a Discussion",
                    description: "Share ideas, tips, or environmental data insights",
                    color: "var(--color-primary)",
                    action: () => setView("create"),
                  },
                ].map(({ icon: Icon, title, description, color, action }) => (
                  <motion.button
                    key={title}
                    variants={FADE_UP}
                    whileHover={HOVER_LIFT_SM}
                    whileTap={TAP_PRESS_SM}
                    onClick={action}
                    className="text-left rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-all duration-200 group relative overflow-hidden"
                  >
                    <div className="absolute -bottom-6 -right-6 size-24 rounded-full opacity-0 group-hover:opacity-10 blur-xl transition-opacity pointer-events-none" style={{ background: color }} />
                    <div className="size-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `color-mix(in oklab, ${color} 12%, transparent)` }}>
                      <Icon className="size-5" style={{ color }} />
                    </div>
                    <h3 className="text-sm font-bold mb-1">{title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                  </motion.button>
                ))}
              </motion.div>
            </section>
          </motion.div>
        )}

        {view === "browse" && (
          <motion.div key="browse" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: DUR_SM }}>
            <BrowsePosts
              onBack={goBack}
              onViewPost={goToPost}
              onCreate={() => setView("create")}
            />
          </motion.div>
        )}

        {view === "post-detail" && activePost && (
          <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: DUR_SM }}>
            <PostDetail
              postId={activePost}
              onBack={() => setView("browse")}
              onCreateNew={() => setView("create")}
            />
          </motion.div>
        )}

        {view === "create" && (
          <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: DUR_SM }}>
            <CreatePostForm
              onBack={() => setView("hub")}
              onSuccess={(id) => { setActivePost(id); setView("post-detail"); }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
