import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Search, Bell, User, LogOut, ChevronDown } from "lucide-react";
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
    <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 md:px-6 py-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden -ml-1 size-9 grid place-items-center rounded-md hover:bg-muted shrink-0"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>

        {/* Breadcrumb + page title */}
        <div className="min-w-0 flex-1">
          <AdminBreadcrumb />
          <h1 className="text-lg font-bold tracking-tight leading-tight mt-0.5 truncate">
            {title}
          </h1>
        </div>

        {/* Search placeholder — no business logic wired up yet */}
        <div className="hidden md:flex items-center gap-2 rounded-lg border border-input bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground/70 w-56 shrink-0 cursor-not-allowed">
          <Search className="size-3.5" />
          <span>Search platform...</span>
        </div>

        {/* Notification Center */}
        <NotificationBell className="shrink-0" />

        {/* Administrator profile menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-muted shrink-0">
              <Avatar className="size-7">
                <AvatarFallback className="aurora text-primary-foreground text-[11px] font-semibold">
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
                <User className="size-4" /> Profile & Settings
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
