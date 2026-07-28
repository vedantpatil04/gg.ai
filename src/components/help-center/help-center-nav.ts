import type { ComponentType } from "react";
import {
  Home,
  BookOpen,
  GraduationCap,
  HeadphonesIcon,
  MessageSquarePlus,
  Users,
  Activity,
  Sparkles,
  ScrollText,
} from "lucide-react";

export interface HelpNavItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  to: string;
  badge?: string;
  comingSoon?: boolean;
}

export const HELP_NAV_ITEMS: HelpNavItem[] = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    to: "/help",
  },
  {
    id: "knowledge-base",
    label: "Knowledge Base",
    icon: BookOpen,
    to: "/help/knowledge-base",
  },
  {
    id: "tutorials",
    label: "Tutorials & Guides",
    icon: GraduationCap,
    to: "/help/tutorials",
    comingSoon: true,
  },
  {
    id: "support",
    label: "Support Center",
    icon: HeadphonesIcon,
    to: "/help/support",
    comingSoon: true,
  },
  {
    id: "feedback",
    label: "Feedback",
    icon: MessageSquarePlus,
    to: "/help/feedback",
    comingSoon: true,
  },
  {
    id: "community",
    label: "Community",
    icon: Users,
    to: "/help/community",
    comingSoon: true,
    badge: "New",
  },
  {
    id: "status",
    label: "System Status",
    icon: Activity,
    to: "/help/status",
    comingSoon: true,
  },
  {
    id: "whats-new",
    label: "What's New",
    icon: Sparkles,
    to: "/help/whats-new",
    comingSoon: true,
    badge: "v2.4",
  },
  {
    id: "about",
    label: "About & Policies",
    icon: ScrollText,
    to: "/help/about",
    comingSoon: true,
  },
];

/** Path-segment → friendly label used by breadcrumbs */
export const HELP_LABEL_MAP: Record<string, string> = {
  help: "Help Center",
  "knowledge-base": "Knowledge Base",
  tutorials: "Tutorials & Guides",
  support: "Support Center",
  feedback: "Feedback",
  community: "Community",
  status: "System Status",
  "whats-new": "What's New",
  about: "About & Policies",
};
