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

/**
 * Single source of truth for the Administrator sidebar.
 *
 * A discriminated union — rather than two independent optional fields — so
 * a real nav row provably has a `to` (and the compiler proves it, since
 * TanStack Router's typed `<Link>` rejects anything that isn't a real,
 * registered route) while a future-module row provably has none. There is
 * no state where both or neither are present.
 *
 * `comingSoon` items are every future business module this layout is built
 * to host (User Management, Complaint Management, ...) — rendered as inert
 * placeholders, since implementing them is explicitly out of scope for the
 * Layout Foundation phase.
 */
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
    // Renamed from "management"/"Management" in Phase 3.1 — that phase's
    // own sidebar requirement explicitly asks for a "Governance" group
    // containing Authority Requests and the new Authority Directory. The
    // rest of this group's items (User/Complaint/City directories and
    // their still-placeholder full-management siblings) stayed put rather
    // than being split into a separate group — Phase 3.1 only asked for
    // the Governance label and the two Authority items to sit under it.
    id: "governance",
    label: "Governance",
    items: [
      // Phase 2.4 — read-only directory + details only. Full User
      // Management (edit, suspend, role changes, deletion) is explicitly
      // future work, so — same pattern as Authority Requests vs Authority
      // Management above — it's its own separate, still-coming-soon entry.
      { label: "User Directory", icon: UserSearch, to: "/admin/users" },
      { label: "User Management", icon: Users, comingSoon: true },
      // Phase 2.5 — verify/reject/assign only, on the statuses the
      // Complaint model actually has. Full Complaint Management (editing,
      // deletion, reporting) is explicitly future work, so — same pattern
      // as the two splits above — it's its own separate, still-coming-soon
      // entry.
      { label: "Complaint Queue", icon: ClipboardCheck, to: "/admin/complaints" },
      { label: "Complaint Management", icon: ClipboardList, comingSoon: true },
      // Phase 2.3 — request review/approve/reject only, onboarding-focused.
      { label: "Authority Requests", icon: UserCog, to: "/admin/authority-requests" },
      // Phase 3.1 — ongoing lifecycle management for already-approved
      // authorities (activate/deactivate), a deliberately separate module
      // from Authority Requests above rather than a merge of it — see
      // authority-directory/ for the reasoning. Also handles approve/reject
      // for any pending accounts encountered here, reusing the exact same
      // capability Authority Requests uses, so both pages stay authoritative.
      { label: "Authority Directory", icon: IdCard, to: "/admin/authorities" },
      // Remaining scope after Phase 3.1: profile editing and city
      // assignment. Activation/deactivation now lives in Authority
      // Directory above, not here.
      { label: "Authority Management", icon: ShieldCheck, comingSoon: true },
      // Phase 2.6 — read-only directory + details only, same split pattern
      // as the three above. Full City Management (create/edit/delete,
      // authority assignment, environmental configuration) is future work.
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
      // Phase 2.7 — monitoring only (backend/database/scheduler/AI/pipeline
      // status). This is a distinct capability from Platform
      // Administration below, not a narrower version of it — that item
      // remains its own placeholder for config/settings, a different scope
      // entirely, not something being split like the Management group above.
      { label: "Platform Health", icon: HeartPulse, to: "/admin/platform-health" },
      { label: "Platform Administration", icon: Cog, comingSoon: true },
      { label: "Security", icon: Lock, comingSoon: true },
      // Renamed from "Settings" during Phase 2.8's Portal Finalization pass
      // — that phase added a real personal "Profile & Settings" page
      // (header dropdown), so the platform-wide placeholder needed a
      // distinct label to avoid reading as the same destination.
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

/**
 * Path-segment → friendly label, shared by the sidebar and the breadcrumb so
 * the two can never drift out of sync. Extend this when a placeholder above
 * gains a real route in a future phase.
 */
export const ADMIN_LABEL_MAP: Record<string, string> = {
  admin: "Dashboard",
  "authority-requests": "Authority Requests",
  authorities: "Authority Directory",
  users: "User Directory",
  complaints: "Complaint Queue",
  cities: "City Directory",
  "platform-health": "Platform Health",
  profile: "Profile & Settings",
};
