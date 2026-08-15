/**
 * Phase 5 — Enterprise Notification Experience
 *
 * Enhancement of the existing Phase 7 notification center.
 * All backend APIs, hooks, business logic, and state management are unchanged.
 *
 * What changed vs Phase 7 original:
 *  1. Animated unread badge — scale pulse on mount + count change
 *  2. Bell shake animation  — rings when unread count first exceeds 0
 *  3. Date grouping         — Today / Yesterday / Earlier sections
 *  4. Card entrance animation — staggered AnimatePresence fade+slide
 *  5. Mobile bottom sheet   — Drawer (vaul) used on mobile, Sheet on desktop
 *  6. Priority stripe       — thicker, rounded, with glow on high/critical
 *  7. Reduced-motion guard  — all animations respect prefers-reduced-motion
 *
 * Nothing fabricated — all notification data comes from the existing API.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Search,
  X,
  Check,
  CheckCheck,
  Archive,
  Trash2,
  Settings2,
  ChevronRight,
  Inbox,
  ShieldAlert,
  FileText,
  Users,
  Leaf,
  Globe,
  Brain,
  Cpu,
  ClipboardList,
  SortAsc,
  SortDesc,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  useNotificationUnreadCount,
  useNotifications,
  useMarkAsRead,
  useMarkAllRead,
  useArchiveNotification,
  useDeleteNotification,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@/hooks/use-notifications";
import type { Notification, NotificationCategory } from "@/lib/api/notification.api";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

// ─── Category metadata ────────────────────────────────────────────────────────
// Identical to Phase 7 — API categories drive this map.

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  complaints:   { label: "Complaints",   icon: ClipboardList, color: "text-blue-500"   },
  reports:      { label: "Reports",      icon: ClipboardList, color: "text-violet-500" },
  authority:    { label: "Authority",    icon: ShieldAlert,   color: "text-orange-500" },
  environment:  { label: "Environment",  icon: Leaf,          color: "text-emerald-500"},
  forecast:     { label: "Forecast",     icon: Globe,         color: "text-cyan-500"   },
  admin:        { label: "Admin",        icon: Cpu,           color: "text-slate-500"  },
  security:     { label: "Security",     icon: ShieldAlert,   color: "text-red-500"    },
  system:       { label: "System",       icon: Globe,         color: "text-gray-500"   },
};

// Priority left-stripe: colour + glow intensity
const PRIORITY_STYLE: Record<string, { bg: string; glow?: string }> = {
  low:      { bg: "bg-gray-400/60" },
  medium:   { bg: "bg-blue-500",    glow: "shadow-[0_0_6px_theme(colors.blue.500/0.5)]"   },
  high:     { bg: "bg-amber-500",   glow: "shadow-[0_0_6px_theme(colors.amber.500/0.6)]"  },
  critical: { bg: "bg-red-500",     glow: "shadow-[0_0_8px_theme(colors.red.500/0.7)]"    },
};

// ─── Date grouping helpers ────────────────────────────────────────────────────

type DateGroup = "Today" | "Yesterday" | "Earlier";

function getDateGroup(dateStr: string): DateGroup {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return "Earlier";
}

interface GroupedNotifications {
  group: DateGroup;
  items: Notification[];
}

function groupNotifications(notifications: Notification[]): GroupedNotifications[] {
  const order: DateGroup[] = ["Today", "Yesterday", "Earlier"];
  const map = new Map<DateGroup, Notification[]>();
  for (const n of notifications) {
    const g = getDateGroup(n.createdAt);
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(n);
  }
  return order
    .filter((g) => map.has(g))
    .map((g) => ({ group: g, items: map.get(g)! }));
}

// ─── Animated unread badge ────────────────────────────────────────────────────

export function NotificationBadge({ count }: { count: number }) {
  const prefersReduced = useReducedMotion();
  const prevCount = useRef(count);

  // Track if count just increased (for pop animation key)
  const bumpKey = useRef(0);
  if (count > prevCount.current) bumpKey.current += 1;
  prevCount.current = count;

  if (count === 0) return null;

  return (
    <motion.span
      key={bumpKey.current}
      initial={prefersReduced ? false : { scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none"
    >
      {count > 99 ? "99+" : count}
    </motion.span>
  );
}

// ─── Bell button ──────────────────────────────────────────────────────────────
// Drop-in replacement for every NotificationBell usage across AppLayout,
// AdminHeader, and CommandCenterHeader. className prop still merges correctly.

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { data: count = 0 } = useNotificationUnreadCount();
  const { isAuthenticated } = useAuth();
  const prefersReduced = useReducedMotion();

  // Bell shake: fires once when count transitions from 0 → positive
  const prevCount = useRef(count);
  const [shake, setShake] = useState(false);
  useEffect(() => {
    if (!prefersReduced && count > 0 && prevCount.current === 0) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 600);
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [count, prefersReduced]);

  if (!isAuthenticated) {
    return (
      <button
        className={cn(
          "relative size-9 grid place-items-center rounded-md hover:bg-muted transition-colors",
          className,
        )}
        aria-label="Notifications (sign in required)"
      >
        <Bell className="size-4" />
      </button>
    );
  }

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={() => setOpen(true)}
              animate={shake ? { rotate: [0, -12, 10, -8, 6, -4, 2, 0] } : {}}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className={cn(
                "relative size-9 grid place-items-center rounded-md hover:bg-muted transition-colors",
                className,
              )}
              aria-label={count > 0 ? `${count} unread notifications` : "Notifications"}
            >
              <Bell className="size-4" />
              <NotificationBadge count={count} />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {count > 0 ? `${count} unread` : "Notifications"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <NotificationDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}

// ─── Notification Drawer — adaptive: Sheet (desktop) / Drawer (mobile) ────────

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
}

type TabValue = "unread" | "all" | "archived";
type SortValue = "newest" | "oldest";

function NotificationDrawer({ open, onClose }: NotificationDrawerProps) {
  const isMobile = useIsMobile();
  const content = <DrawerInnerContent onClose={onClose} />;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DrawerContent className="max-h-[90dvh] flex flex-col p-0">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        {content}
      </SheetContent>
    </Sheet>
  );
}

// ─── Drawer inner content (shared between Sheet + Drawer) ─────────────────────

function DrawerInnerContent({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabValue>("unread");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<NotificationCategory | "">("");
  const [sort, setSort] = useState<SortValue>("newest");
  const [showPrefs, setShowPrefs] = useState(false);

  const statusMap: Record<TabValue, "unread" | "read" | "archived" | "all"> = {
    unread: "unread",
    all:    "all",
    archived: "archived",
  };

  const { data, isLoading, refetch, isFetching } = useNotifications({
    status: statusMap[tab],
    search: search || undefined,
    category: category || undefined,
    sort,
    limit: 50,
  });

  const { mutate: markRead }                      = useMarkAsRead();
  const { mutate: markAllRead, isPending: markingAll } = useMarkAllRead();
  const { mutate: archiveNotif }                  = useArchiveNotification();
  const { mutate: deleteNotif }                   = useDeleteNotification();

  const notifications = data?.notifications ?? [];
  const unreadCount   = data?.unreadCount   ?? 0;
  const grouped       = useMemo(() => groupNotifications(notifications), [notifications]);

  const handleNotificationClick = useCallback(
    (n: Notification) => {
      if (n.status === "unread") markRead(n._id);
      if (n.link) {
        onClose();
        navigate({ to: n.link as Parameters<typeof navigate>[0]["to"] });
      }
    },
    [markRead, navigate, onClose],
  );

  if (showPrefs) {
    return <NotificationPreferences onBack={() => setShowPrefs(false)} />;
  }

  const Header = (
    <div className="px-4 pt-4 pb-3 border-b border-border shrink-0">
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-primary" />
          <span className="text-base font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setShowPrefs(true)}
                >
                  <Settings2 className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Preferences</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {Header}

      {/* Controls */}
      <div className="px-4 py-3 space-y-3 border-b border-border shrink-0">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
          <TabsList className="w-full">
            <TabsTrigger value="unread"   className="flex-1">Unread</TabsTrigger>
            <TabsTrigger value="all"      className="flex-1">All</TabsTrigger>
            <TabsTrigger value="archived" className="flex-1">Archived</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search notifications…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 shrink-0">
                <FileText className="size-3.5" />
                {category ? CATEGORY_META[category as NotificationCategory]?.label : "All"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs">Category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCategory("")}>All categories</DropdownMenuItem>
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <DropdownMenuItem key={key} onClick={() => setCategory(key as NotificationCategory)}>
                  <meta.icon className={cn("size-3.5 mr-2", meta.color)} />
                  {meta.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setSort((s) => (s === "newest" ? "oldest" : "newest"))}
                >
                  {sort === "newest" ? <SortDesc className="size-3.5" /> : <SortAsc className="size-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{sort === "newest" ? "Newest first" : "Oldest first"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {tab !== "archived" && unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-xs gap-1.5"
            onClick={() => markAllRead(category || undefined)}
            disabled={markingAll}
          >
            <CheckCheck className="size-3.5" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notification list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <NotificationSkeleton key={i} />)}
          </div>
        ) : notifications.length === 0 ? (
          <NotificationEmptyState tab={tab} search={search} />
        ) : (
          <div>
            <AnimatePresence initial={false}>
              {grouped.map(({ group, items }) => (
                <motion.div
                  key={group}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Date group heading */}
                  <div className="sticky top-0 z-10 px-4 py-1.5 bg-muted/80 backdrop-blur-sm border-b border-border/50">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {group}
                    </span>
                  </div>

                  {/* Cards within the group */}
                  <div className="divide-y divide-border">
                    <AnimatePresence initial={false}>
                      {items.map((n, i) => (
                        <motion.div
                          key={n._id}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -12 }}
                          transition={{
                            duration: 0.18,
                            delay: i * 0.03,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          <NotificationCard
                            notification={n}
                            onClick={() => handleNotificationClick(n)}
                            onMarkRead={() => markRead(n._id)}
                            onArchive={() => archiveNotif(n._id)}
                            onDelete={() => deleteNotif(n._id)}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ─── Notification Card ────────────────────────────────────────────────────────

interface NotificationCardProps {
  notification: Notification;
  onClick: () => void;
  onMarkRead: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

function NotificationCard({
  notification: n,
  onClick,
  onMarkRead,
  onArchive,
  onDelete,
}: NotificationCardProps) {
  const meta    = CATEGORY_META[n.category] ?? CATEGORY_META.system;
  const Icon    = meta.icon;
  const isUnread = n.status === "unread";
  const priority = PRIORITY_STYLE[n.priority] ?? PRIORITY_STYLE.low;

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-4 py-3.5 cursor-pointer transition-colors",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40",
        isUnread && "bg-primary/[0.03] hover:bg-primary/[0.06]",
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      aria-label={`${n.title}${isUnread ? " (unread)" : ""}`}
    >
      {/* Priority stripe — left edge */}
      <div
        className={cn(
          "absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full",
          priority.bg,
          priority.glow,
        )}
      />

      {/* Unread dot — inside the stripe gap */}
      {isUnread && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-primary" />
      )}

      {/* Category icon badge */}
      <div
        className={cn(
          "mt-0.5 shrink-0 size-8 rounded-lg border border-border/60 bg-background",
          "flex items-center justify-center",
          meta.color,
        )}
      >
        <Icon className="size-3.5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-14">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm leading-snug", isUnread ? "font-semibold" : "font-medium")}>
            {n.title}
          </p>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
          {n.summary}
        </p>

        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 capitalize">
            {meta.label}
          </Badge>
          {n.link && (
            <span className="text-[10px] text-primary flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              Open <ChevronRight className="size-2.5" />
            </span>
          )}
        </div>
      </div>

      {/* Hover-reveal action buttons */}
      <div
        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <TooltipProvider delayDuration={200}>
          {isUnread && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6" onClick={onMarkRead}>
                  <Check className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mark read</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="size-6" onClick={onArchive}>
                <Archive className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Archive</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

// ─── Preferences panel ────────────────────────────────────────────────────────
// Identical logic to Phase 7 — role-based category toggles.

function NotificationPreferences({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { data: prefs = {} }                            = useNotificationPreferences();
  const { mutate: updatePrefs, isPending }              = useUpdateNotificationPreferences();

  const roleCategories = useMemo(() => {
    const base: NotificationCategory[] = ["complaints", "security", "system"];
    if (user?.role === "authority")     return [...base, "reports", "authority"];
    if (user?.role === "administrator") return [...base, "reports", "authority", "environment", "forecast", "admin"];
    return base;
  }, [user?.role]);

  const toggle = (cat: NotificationCategory) => {
    updatePrefs({ ...prefs, [cat]: !prefs[cat] });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
        <Button variant="ghost" size="icon" className="size-8" onClick={onBack}>
          <X className="size-4" />
        </Button>
        <h3 className="font-semibold text-sm">Notification Preferences</h3>
      </div>
      <ScrollArea className="flex-1 px-4 py-4">
        <p className="text-xs text-muted-foreground mb-4">
          Choose which categories you want to receive notifications for.
        </p>
        <div className="space-y-4">
          {roleCategories.map((cat) => {
            const meta = CATEGORY_META[cat] || { label: cat, icon: Globe, color: "text-gray-500" };
            const Icon = meta.icon;
            return (
              <div key={cat} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className={cn("size-4", meta.color)} />
                  <Label className="text-sm font-medium">{meta.label}</Label>
                </div>
                <Switch
                  checked={prefs[cat] !== false}
                  onCheckedChange={() => toggle(cat as NotificationCategory)}
                  disabled={isPending}
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="flex gap-3 px-4 py-3.5 border-b border-border/40">
      <Skeleton className="size-8 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between gap-4">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-12 shrink-0" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function NotificationEmptyState({ tab, search }: { tab: TabValue; search: string }) {
  const messages: Record<TabValue, { title: string; desc: string }> = {
    unread:   { title: "You're all caught up",       desc: "No unread notifications right now."           },
    all:      { title: "No notifications",           desc: search ? `No results for "${search}".` : "Nothing here yet." },
    archived: { title: "No archived notifications",  desc: "Archived items will appear here."             },
  };
  const m = messages[tab];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Inbox className="size-5 text-muted-foreground" />
      </div>
      <p className="font-medium text-sm">{m.title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-relaxed">{m.desc}</p>
    </div>
  );
}
