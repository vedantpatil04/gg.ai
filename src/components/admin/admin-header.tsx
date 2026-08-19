import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Menu, X, Search, User, LogOut, ChevronDown } from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-center";
import { useAuth } from "@/lib/auth-context";
import { AdminBreadcrumb } from "./admin-breadcrumb";
import { ADMIN_LABEL_MAP } from "./admin-nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function humanize(segment: string): string {
  return segment
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Current page title — the last URL segment, resolved through the same
 *  label map the breadcrumb uses so the two never disagree. */
function usePageTitle(): string {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "admin";
  return ADMIN_LABEL_MAP[last] ?? humanize(last);
}

interface AdminHeaderProps {
  onMenuClick: () => void;
  mobileOpen: boolean;
}

export function AdminHeader({ onMenuClick, mobileOpen }: AdminHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const title = usePageTitle();

  const initials =
    user?.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "A";

  const handleLogout = async () => {
    await logout();
    navigate({ to: "/login" });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl shrink-0">
      <div className="flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-4 md:px-6 py-2.5 sm:py-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuClick}
          className="lg:hidden -ml-1 size-9 grid place-items-center rounded-lg hover:bg-muted active:bg-muted/80 text-foreground shrink-0 transition-colors"
          aria-label={mobileOpen ? "Close navigation drawer" : "Open navigation drawer"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        {/* Breadcrumb + page title */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <AdminBreadcrumb />
          <h1 className="text-base sm:text-lg font-bold tracking-tight leading-tight truncate">
            {title}
          </h1>
        </div>

        {/* Search placeholder — desktop */}
        <div className="hidden md:flex items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground/70 w-52 lg:w-60 shrink-0 cursor-not-allowed select-none">
          <Search className="size-3.5" />
          <span className="truncate">Search platform...</span>
        </div>

        {/* Notification Center */}
        <NotificationBell className="shrink-0" />

        {/* Administrator profile menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2 rounded-full pl-0.5 sm:pl-1 pr-1 sm:pr-2 py-0.5 sm:py-1 hover:bg-muted active:bg-muted/80 shrink-0 transition-colors"
              aria-label="Administrator profile menu"
            >
              <Avatar className="size-7 sm:size-8">
                <AvatarFallback className="aurora text-primary-foreground text-[11px] sm:text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="size-3.5 text-muted-foreground hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="text-sm font-medium truncate">{user?.name ?? "Administrator"}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/admin/profile" className="flex items-center gap-2 cursor-pointer">
                <User className="size-4" /> Profile &amp; Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
