/**
 * Phase 7 — Enterprise Notification Center
 *
 * Shared component used by all three portal headers (AppLayout, AdminHeader,
 * CommandCenterHeader). Replaces the static placeholder bell.
 *
 * Features:
 *  - Unread badge with 99+ cap
 *  - Full-width enterprise drawer (sheet)
 *  - Tabs: Unread / All / Archived
 *  - Search, category filter, sort
 *  - Mark read / mark all read / archive / delete
 *  - Skeleton loading & empty states
 *  - Deep-link navigation on click
 *  - Notification preferences panel
 */

import { useState, useMemo, useCallback } from "react";
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
  AlertTriangle,
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
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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

const CATEGORY_META: Record<
  NotificationCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  complaints: { label: "Complaints", icon: ClipboardList, color: "text-blue-500" },
  assignments: { label: "Assignments", icon: Users, color: "text-violet-500" },
  authorities: { label: "Authorities", icon: ShieldAlert, color: "text-orange-500" },
  platform: { label: "Platform", icon: Cpu, color: "text-slate-500" },
  environmental: { label: "Environmental", icon: Leaf, color: "text-emerald-500" },
  security: { label: "Security", icon: ShieldAlert, color: "text-red-500" },
  ai: { label: "AI", icon: Brain, color: "text-purple-500" },
  system: { label: "System", icon: Globe, color: "text-gray-500" },
};

const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-gray-400",
  medium: "bg-blue-500",
  high: "bg-amber-500",
  critical: "bg-red-500",
};

// ─── Unread badge ─────────────────────────────────────────────────────────────

export function NotificationBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ─── Bell button (drop-in replacement for existing bells) ────────────────────

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { data: count = 0 } = useNotificationUnreadCount();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <button className={cn("relative size-9 grid place-items-center rounded-md hover:bg-muted", className)}>
        <Bell className="size-4" />
      </button>
    );
  }

  return (
    <>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setOpen(true)}
              className={cn(
                "relative size-9 grid place-items-center rounded-md hover:bg-muted transition-colors",
                className,
              )}
              aria-label={count > 0 ? `${count} unread notifications` : "Notifications"}
            >
              <Bell className="size-4" />
              <NotificationBadge count={count} />
            </button>
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

// ─── Notification Drawer ──────────────────────────────────────────────────────

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
}

type TabValue = "unread" | "all" | "archived";
type SortValue = "newest" | "oldest";

function NotificationDrawer({ open, onClose }: NotificationDrawerProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabValue>("unread");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<NotificationCategory | "">("");
  const [sort, setSort] = useState<SortValue>("newest");
  const [showPrefs, setShowPrefs] = useState(false);

  const statusMap: Record<TabValue, "unread" | "read" | "archived" | "all"> = {
    unread: "unread",
    all: "all",
    archived: "archived",
  };

  const { data, isLoading, refetch, isFetching } = useNotifications({
    status: statusMap[tab],
    search: search || undefined,
    category: category || undefined,
    sort,
    limit: 30,
  });

  const { mutate: markRead } = useMarkAsRead();
  const { mutate: markAllRead, isPending: markingAll } = useMarkAllRead();
  const { mutate: archiveNotif } = useArchiveNotification();
  const { mutate: deleteNotif } = useDeleteNotification();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

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

  const handleMarkAllRead = () => {
    markAllRead(category || undefined);
  };

  if (showPrefs) {
    return (
      <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <NotificationPreferences onBack={() => setShowPrefs(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-semibold flex items-center gap-2">
              <Bell className="size-4 text-primary" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </SheetTitle>
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
        </SheetHeader>

        {/* Controls */}
        <div className="px-4 py-3 space-y-3 border-b border-border shrink-0">
          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
            <TabsList className="w-full">
              <TabsTrigger value="unread" className="flex-1">Unread</TabsTrigger>
              <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
              <TabsTrigger value="archived" className="flex-1">Archived</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search + Filters row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search notifications…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>

            {/* Category filter */}
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

            {/* Sort */}
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

          {/* Mark all read */}
          {tab !== "archived" && unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs gap-1.5"
              onClick={handleMarkAllRead}
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
              {[...Array(5)].map((_, i) => (
                <NotificationSkeleton key={i} />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState tab={tab} search={search} />
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((n) => (
                <NotificationCard
                  key={n._id}
                  notification={n}
                  onClick={() => handleNotificationClick(n)}
                  onMarkRead={() => markRead(n._id)}
                  onArchive={() => archiveNotif(n._id)}
                  onDelete={() => deleteNotif(n._id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
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

function NotificationCard({ notification: n, onClick, onMarkRead, onArchive, onDelete }: NotificationCardProps) {
  const meta = CATEGORY_META[n.category] ?? CATEGORY_META.system;
  const Icon = meta.icon;
  const isUnread = n.status === "unread";

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-4 py-3.5 cursor-pointer hover:bg-muted/50 transition-colors",
        isUnread && "bg-primary/[0.03] hover:bg-primary/[0.06]",
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      {/* Unread dot */}
      {isUnread && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-primary" />
      )}

      {/* Priority stripe */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-0.5 rounded-r",
          PRIORITY_COLOR[n.priority] ?? "bg-transparent",
        )}
      />

      {/* Category icon */}
      <div className={cn("mt-0.5 shrink-0 size-8 rounded-lg border border-border bg-background flex items-center justify-center", meta.color)}>
        <Icon className="size-3.5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
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

      {/* Action buttons (hover reveal) */}
      <div
        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        {isUnread && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6" onClick={onMarkRead}>
                  <Check className="size-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Mark read</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <TooltipProvider delayDuration={200}>
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

function NotificationPreferences({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { data: prefs = {} } = useNotificationPreferences();
  const { mutate: updatePrefs, isPending } = useUpdateNotificationPreferences();

  const roleCategories = useMemo(() => {
    const all: NotificationCategory[] = ["complaints", "security", "system"];
    if (user?.role === "authority") return [...all, "assignments"];
    if (user?.role === "administrator") {
      return [...all, "assignments", "authorities", "platform", "environmental", "ai"];
    }
    return all;
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
            const meta = CATEGORY_META[cat];
            const Icon = meta.icon;
            return (
              <div key={cat} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className={cn("size-4", meta.color)} />
                  <div>
                    <Label className="text-sm font-medium">{meta.label}</Label>
                  </div>
                </div>
                <Switch
                  checked={prefs[cat] !== false}
                  onCheckedChange={() => toggle(cat)}
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="flex gap-3 px-1 py-2">
      <Skeleton className="size-8 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab, search }: { tab: TabValue; search: string }) {
  const messages: Record<TabValue, { title: string; desc: string }> = {
    unread: { title: "All caught up", desc: "No unread notifications right now." },
    all: { title: "No notifications", desc: search ? "No results match your search." : "Nothing here yet." },
    archived: { title: "No archived notifications", desc: "Archived items will appear here." },
  };
  const m = messages[tab];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Inbox className="size-5 text-muted-foreground" />
      </div>
      <p className="font-medium text-sm">{m.title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">{m.desc}</p>
    </div>
  );
}
