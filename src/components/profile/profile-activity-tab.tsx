import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Activity,
  Camera,
  CheckCircle2,
  Info,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  RefreshCw,
  Shield,
  User,
  UserPlus,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { profileApi, type ActivityItem, type ActivityCategory } from "@/lib/api/profile.api";

// ─── Icon + colour map by activity type ─────────────────────────────────────

interface ActivityMeta {
  icon: ReactNode;
  colour: string;
}

function getActivityMeta(activityType: string): ActivityMeta {
  switch (activityType) {
    case "account_created":
      return {
        icon: <UserPlus className="size-4" aria-hidden="true" />,
        colour: "bg-green-500/15 text-green-600 dark:text-green-400",
      };
    case "login":
      return {
        icon: <LogIn className="size-4" aria-hidden="true" />,
        colour: "bg-primary/10 text-primary",
      };
    case "logout":
      return {
        icon: <LogOut className="size-4" aria-hidden="true" />,
        colour: "bg-muted text-muted-foreground",
      };
    case "profile_updated":
      return {
        icon: <User className="size-4" aria-hidden="true" />,
        colour: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
      };
    case "photo_uploaded":
      return {
        icon: <Camera className="size-4" aria-hidden="true" />,
        colour: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
      };
    case "photo_removed":
      return {
        icon: <Camera className="size-4" aria-hidden="true" />,
        colour: "bg-muted text-muted-foreground",
      };
    case "password_changed":
    case "password_reset":
      return {
        icon: <KeyRound className="size-4" aria-hidden="true" />,
        colour: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
      };
    default:
      return {
        icon: <Activity className="size-4" aria-hidden="true" />,
        colour: "bg-muted text-muted-foreground",
      };
  }
}

// ─── Category badge ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<ActivityCategory, { label: string; icon: ReactNode }> = {
  authentication: {
    label: "Authentication",
    icon: <Shield className="size-2.5" aria-hidden="true" />,
  },
  profile: { label: "Profile", icon: <User className="size-2.5" aria-hidden="true" /> },
  security: { label: "Security", icon: <CheckCircle2 className="size-2.5" aria-hidden="true" /> },
};

function CategoryBadge({ category }: { category: ActivityCategory }) {
  const meta = CATEGORY_LABELS[category] ?? {
    label: category,
    icon: <Info className="size-2.5" />,
  };
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
      {meta.icon}
      {meta.label}
    </span>
  );
}

// ─── Time helpers ────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function exactTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type DateGroup = "Today" | "Yesterday" | "This Week" | "Earlier";

function getDateGroup(iso: string): DateGroup {
  const now = new Date();
  const date = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);
  const startOfWeek = new Date(startOfToday.getTime() - 6 * 86_400_000);

  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  if (date >= startOfWeek) return "This Week";
  return "Earlier";
}

// ─── Timeline entry — icon sits on a connecting vertical line ──────────────

function TimelineEntry({
  item,
  index,
  isLast,
}: {
  item: ActivityItem;
  index: number;
  isLast: boolean;
}) {
  const { icon, colour } = getActivityMeta(item.activityType);
  return (
    <li
      className="relative flex gap-4 pb-7 last:pb-0 group animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both"
      style={{ animationDelay: `${index * 40}ms`, animationDuration: "260ms" }}
    >
      {/* Connecting line */}
      {!isLast && (
        <span
          className="absolute left-[19px] top-10 bottom-0 w-px bg-border/70"
          aria-hidden="true"
        />
      )}

      {/* Icon node on the line */}
      <div
        className={`relative z-10 size-10 rounded-xl grid place-items-center shrink-0 border-2 border-background shadow-sm ${colour} transition-transform duration-150 group-hover:scale-110`}
      >
        {icon}
      </div>

      {/* Content card */}
      <div className="flex-1 min-w-0 rounded-xl px-4 py-3 -mt-0.5 group-hover:bg-muted/30 transition-colors duration-150">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <p className="text-sm font-semibold leading-snug">{item.title}</p>
          <time
            dateTime={item.createdAt}
            title={exactTime(item.createdAt)}
            className="text-xs text-muted-foreground shrink-0 tabular-nums"
          >
            {relativeTime(item.createdAt)}
          </time>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
        <div className="flex items-center gap-2 pt-2">
          <CategoryBadge category={item.category} />
          <span className="text-[10px] text-muted-foreground/60">{exactTime(item.createdAt)}</span>
        </div>
      </div>
    </li>
  );
}

// ─── Timeline skeleton ───────────────────────────────────────────────────────

function ActivitySkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in-0 duration-300">
      {["Today", "Yesterday"].map((group) => (
        <div key={group} className="space-y-4">
          <Skeleton className="h-4 w-24 rounded shimmer" />
          <div className="glass rounded-2xl p-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 pb-7 last:pb-0">
                <Skeleton className="size-10 rounded-xl shrink-0 shimmer" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="flex justify-between gap-2">
                    <Skeleton className="h-4 w-40 shimmer" />
                    <Skeleton className="h-3 w-14 shimmer" />
                  </div>
                  <Skeleton className="h-3.5 w-64 max-w-full shimmer" />
                  <Skeleton className="h-5 w-28 rounded-full shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function ActivityEmpty() {
  const { t } = useTranslation("profile");
  return (
    <div className="glass rounded-2xl p-12 sm:p-16 flex flex-col items-center text-center gap-4 animate-in fade-in-0 zoom-in-95 duration-400">
      <div className="size-14 rounded-2xl bg-muted grid place-items-center text-muted-foreground">
        <Activity className="size-7" aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold">{t("noActivity", "No recent activity")}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Activity will appear here as you use your account — sign-ins, profile updates, and
          security changes.
        </p>
      </div>
    </div>
  );
}

// ─── Error state ─────────────────────────────────────────────────────────────

function ActivityError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="glass rounded-2xl p-10 flex flex-col items-center text-center gap-3 animate-in fade-in-0 duration-300"
      role="alert"
    >
      <p className="text-sm text-muted-foreground">Couldn't load activity.</p>
      <Button
        size="sm"
        variant="outline"
        onClick={onRetry}
        className="gap-1.5 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
      >
        <RefreshCw className="size-3.5" aria-hidden="true" />
        Retry
      </Button>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

const PAGE_LIMIT = 20;
const GROUP_ORDER: DateGroup[] = ["Today", "Yesterday", "This Week", "Earlier"];

export function ActivityTab({ userId }: { userId?: string } = {}) {
  const [loadingMore, setLoadingMore] = useState(false);

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["profile", "activity", userId],
      queryFn: ({ pageParam }) => profileApi.getActivity(pageParam as number, PAGE_LIMIT),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => {
        const d = lastPage.data;
        return d.hasMore ? d.page + 1 : undefined;
      },
      enabled: userId !== undefined ? !!userId : true,
    });

  if (isLoading) return <ActivitySkeleton />;
  if (isError || !data) return <ActivityError onRetry={() => refetch()} />;

  const allActivities = data.pages.flatMap((p) => p.data.activities);
  if (allActivities.length === 0) return <ActivityEmpty />;

  const groups = new Map<DateGroup, ActivityItem[]>();
  for (const item of allActivities) {
    const g = getDateGroup(item.createdAt);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(item);
  }

  async function handleLoadMore() {
    setLoadingMore(true);
    await fetchNextPage();
    setLoadingMore(false);
  }

  return (
    <div className="space-y-8">
      {GROUP_ORDER.filter((g) => groups.has(g)).map((group, groupIndex) => {
        const items = groups.get(group)!;
        return (
          <section
            key={group}
            aria-label={group}
            className="animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both"
            style={{ animationDelay: `${groupIndex * 90}ms`, animationDuration: "320ms" }}
          >
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
              {group}
            </h3>
            <div className="glass rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-shadow duration-200">
              <ol className="relative" role="list">
                {items.map((item, i) => (
                  <TimelineEntry
                    key={item._id}
                    item={item}
                    index={i}
                    isLast={i === items.length - 1}
                  />
                ))}
              </ol>
            </div>
          </section>
        );
      })}

      {(hasNextPage || isFetchingNextPage) && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={isFetchingNextPage || loadingMore}
            className="gap-1.5 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isFetchingNextPage || loadingMore ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                Loading…
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
