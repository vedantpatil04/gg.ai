import type { ComponentType } from "react";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  ClipboardCheck,
  ShieldCheck,
  Building2,
  MapPinned,
  UserCog,
  UserSearch,
  IdCard,
  Radar,
  FileText,
  BarChart3,
  Cog,
  Lock,
  Settings,
  Bell,
  MessageSquare,
  HeartPulse,
} from "lucide-react";

export type AdminNavItem =
  | { label: string; icon: ComponentType<{ className?: string }>; to: string; comingSoon?: false }
  | { label: string; icon: ComponentType<{ className?: string }>; comingSoon: true };

export interface AdminNavGroup {
  id: string;
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [{ label: "Dashboard", icon: LayoutDashboard, to: "/admin" }],
  },
  {
    id: "governance",
    label: "Governance",
    items: [
      { label: "User Directory", icon: UserSearch, to: "/admin/users" },
      { label: "User Management", icon: Users, comingSoon: true },
      { label: "Complaint Queue", icon: ClipboardCheck, to: "/admin/complaints" },
      { label: "Complaint Management", icon: ClipboardList, comingSoon: true },
      { label: "Authority Requests", icon: UserCog, to: "/admin/authority-requests" },
      { label: "Authority Directory", icon: IdCard, to: "/admin/authorities" },
      { label: "Authority Management", icon: ShieldCheck, comingSoon: true },
      { label: "City Directory", icon: MapPinned, to: "/admin/cities" },
      { label: "City Management", icon: Building2, comingSoon: true },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    items: [
      { label: "Environmental Monitoring", icon: Radar, comingSoon: true },
      { label: "Reports", icon: FileText, comingSoon: true },
      { label: "Analytics", icon: BarChart3, comingSoon: true },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    items: [
      { label: "Platform Health", icon: HeartPulse, to: "/admin/platform-health" },
      // Phase 6 — Enterprise Platform Administration (live)
      { label: "Platform Administration", icon: Cog, to: "/admin/platform" },
      { label: "Security", icon: Lock, comingSoon: true },
      { label: "Platform Settings", icon: Settings, comingSoon: true },
    ],
  },
  {
    id: "engagement",
    label: "Engagement",
    items: [
      { label: "Notification Center", icon: Bell, comingSoon: true },
      { label: "Communication Hub", icon: MessageSquare, comingSoon: true },
    ],
  },
];

export const ADMIN_LABEL_MAP: Record<string, string> = {
  admin: "Dashboard",
  "authority-requests": "Authority Requests",
  authorities: "Authority Directory",
  users: "User Directory",
  complaints: "Complaint Queue",
  cities: "City Directory",
  "platform-health": "Platform Health",
  platform: "Platform Administration", // Phase 6
  profile: "Profile & Settings",
};
