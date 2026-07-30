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
      { label: "User Management", icon: Users, to: "/admin/user-management" },
      { label: "Complaint Queue", icon: ClipboardCheck, to: "/admin/complaints" },
      { label: "Complaint Management", icon: ClipboardList, to: "/admin/complaint-management" },
      { label: "Authority Requests", icon: UserCog, to: "/admin/authority-requests" },
      { label: "Authority Directory", icon: IdCard, to: "/admin/authorities" },
      { label: "Authority Management", icon: ShieldCheck, to: "/admin/authority-management" },
      { label: "City Directory", icon: MapPinned, to: "/admin/cities" },
      { label: "City Management", icon: Building2, to: "/admin/city-management" },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    items: [
      { label: "Environmental Monitoring", icon: Radar, to: "/admin/environmental-monitoring" },
      { label: "Reports", icon: FileText, to: "/admin/reports" },
      { label: "Analytics", icon: BarChart3, to: "/admin/analytics" },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    items: [
      { label: "Platform Health", icon: HeartPulse, to: "/admin/platform-health" },
      { label: "Platform Administration", icon: Cog, to: "/admin/platform-administration" },
      { label: "Security", icon: Lock, to: "/admin/security-center" },
      { label: "Platform Settings", icon: Settings, to: "/admin/platform-settings" },
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
  "authority-management": "Authority Management",
  users: "User Directory",
  "user-management": "User Management",
  complaints: "Complaint Queue",
  "complaint-management": "Complaint Management",
  cities: "City Directory",
  "city-management": "City Management",
  "environmental-monitoring": "Environmental Monitoring",
  reports: "Reports",
  analytics: "Analytics",
  "platform-health": "Platform Health",
  "platform-administration": "Platform Administration",
  "security-center": "Security",
  "platform-settings": "Platform Settings",
  profile: "Profile & Settings",
};
