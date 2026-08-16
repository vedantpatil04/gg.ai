import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Shield,
  Search,
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Command,
  Sliders,
  Menu,
  X,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/notification-center";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface NavTab {
  id: string;
  label: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface CommandCenterHeaderProps {
  roleLabel: string;
  activeTitle?: string;
  topTabs?: NavTab[];
  activeTop?: string;
  onTopChange?: (id: string) => void;
}

export function CommandCenterHeader({
  roleLabel,
  activeTitle = "Mission Control",
  topTabs,
  activeTop,
  onTopChange,
}: CommandCenterHeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userName = user?.name || "Vedant Patil";
  const userEmail = user?.email || "authority@greenguard.gov";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    try {
      await logout();
      navigate({ to: "/login" });
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4 py-1">
        {/* Left: Logo & Current Module Title */}
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/command-center" className="flex items-center gap-2.5 group focus:outline-none">
            <div className="size-8 rounded-lg bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 grid place-items-center text-white shadow-md group-hover:scale-105 transition-transform duration-200">
              <Shield className="size-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-foreground leading-none">
                  GreenGuard<span className="text-emerald-500">.AI</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-500/20">
                  HQ
                </span>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground leading-tight mt-0.5 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {activeTitle}
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Primary Navigation (Desktop) */}
        {topTabs && topTabs.length > 0 && (
          <nav
            className="hidden lg:flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/60"
            aria-label="Mission Control sections"
          >
            {topTabs.map((tab) => {
              const isActive = activeTop === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTopChange?.(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 shrink-0",
                    isActive
                      ? "bg-background text-foreground shadow-xs border border-border/70 font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-3.5",
                      isActive ? "text-emerald-500" : "text-muted-foreground",
                    )}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Right: Search, Notifications, Profile Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground h-8 px-2.5 bg-muted/30 border-border/70 hover:bg-muted/60"
          >
            <Search className="size-3.5 text-muted-foreground" />
            <span className="hidden md:inline">Search operations…</span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border/60">
              <Command className="size-2.5" />K
            </kbd>
          </Button>

          {/* Search Button for Mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            aria-label="Search operations"
            className="sm:hidden size-8 text-muted-foreground"
          >
            <Search className="size-4" />
          </Button>

          {/* Notification Center */}
          <NotificationBell className="text-muted-foreground hover:text-foreground" />

          {/* Profile Dropdown (Enterprise Grade) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label={`Account menu for ${userName}`}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-xl border border-border/60 hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                <div className="size-7 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-xs grid place-items-center shadow-xs shrink-0">
                  {initials}
                </div>
                <div className="hidden md:flex flex-col items-start text-left">
                  <span className="text-xs font-semibold leading-none text-foreground">
                    {userName}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-none mt-1 font-medium">
                    {roleLabel}
                  </span>
                </div>
                <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl border-border/80">
              {/* Profile Header: Avatar, User Name, Role */}
              <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 mb-1 space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-xs grid place-items-center shadow-xs shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-foreground truncate leading-none">
                      {userName}
                    </p>
                    <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1 leading-none">
                      {roleLabel}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5 leading-none">
                      {userEmail}
                    </p>
                  </div>
                </div>
              </div>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem asChild>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 text-xs py-2 px-2.5 cursor-pointer rounded-md focus:bg-muted font-medium"
                >
                  <User className="size-3.5 text-emerald-500" />
                  <span>My Profile</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  to="/settings"
                  className="flex items-center gap-2 text-xs py-2 px-2.5 cursor-pointer rounded-md focus:bg-muted font-medium"
                >
                  <Settings className="size-3.5 text-emerald-500" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  to="/security"
                  className="flex items-center gap-2 text-xs py-2 px-2.5 cursor-pointer rounded-md focus:bg-muted font-medium"
                >
                  <Shield className="size-3.5 text-emerald-500" />
                  <span>Security Center</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 text-xs py-2 px-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer font-semibold rounded-md"
              >
                <LogOut className="size-3.5" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle Button */}
          {topTabs && topTabs.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="command-center-mobile-nav"
              className="lg:hidden size-8 text-muted-foreground"
            >
              {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Dropdown Bar */}
      {mobileMenuOpen && topTabs && (
        <div
          id="command-center-mobile-nav"
          className="lg:hidden mt-2 pt-2 border-t border-border/60 space-y-1"
        >
          {topTabs.map((tab) => {
            const isActive = activeTop === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onTopChange?.(tab.id);
                  setMobileMenuOpen(false);
                }}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                  isActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-4" />
                  <span>{tab.label}</span>
                </div>
                {isActive && <ArrowRight className="size-3 text-emerald-500" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Quick Command Palette Search Modal */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden border-border/80 shadow-2xl">
          <DialogHeader className="p-3 border-b border-border/60">
            <DialogTitle className="sr-only">Search Operations</DialogTitle>
            <div className="flex items-center gap-2 px-2">
              <Search className="size-4 text-emerald-500 shrink-0" />
              <Input
                placeholder="Search complaints, sensors, cities, reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-xs h-8 bg-transparent"
                autoFocus
              />
            </div>
          </DialogHeader>

          <div className="p-3 max-h-80 overflow-y-auto space-y-3">
            <div>
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-2">
                Quick Navigation
              </div>
              <div className="space-y-1">
                {[
                  { label: "Mission Control HQ", path: "/command-center", icon: Shield },
                  {
                    label: "Active Work Queue & Complaints",
                    path: "/command-center",
                    icon: Sliders,
                  },
                  { label: "Smart GIS Map Console", path: "/map", icon: Sparkles },
                  { label: "Environmental Analytics", path: "/environment", icon: AlertTriangle },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchOpen(false);
                      navigate({ to: item.path });
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-xs hover:bg-muted/60 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-2 text-foreground">
                      <item.icon className="size-3.5 text-emerald-500" />
                      <span>{item.label}</span>
                    </div>
                    <ArrowRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
