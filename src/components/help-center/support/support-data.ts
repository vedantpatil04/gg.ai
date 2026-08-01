import type { ComponentType } from "react";
import {
  MessageSquare, Mail, Phone, Video, Calendar,
  TicketIcon, Bug, Lightbulb, Star, Users,
  ShieldAlert, Zap, HeadphonesIcon, ShieldCheck,
  Wind, Droplets, Flame, Trash2, FlaskConical, Bird,
  MessageCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TicketStatus   = "open" | "in_progress" | "waiting" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";
export type BugSeverity    = "minor" | "major" | "critical" | "blocker";
export type FeatureStatus  = "submitted" | "planned" | "in_progress" | "shipped" | "declined";

export interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  assignedTeam: string;
  department: string;
  environment: string;
  estimatedResponse: string;
  description: string;
  tags: string[];
}

export interface AuthorityCard {
  id: string;
  name: string;
  department: string;
  role: string;
  email: string;
  phone: string;
  serviceArea: string;
  availability: "available" | "busy" | "offline";
  officeHours: string;
  responseTime: string;
}

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  status: FeatureStatus;
  votes: number;
  submittedAt: string;
  estimatedRelease?: string;
  tags: string[];
}

export interface ContactMethod {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  available: boolean;
  comingSoon?: boolean;
  badge?: string;
  accentColor: string;
  action: string;
  availability: string;
  responseTime: string;
}

export interface EmergencyType {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  level: "critical" | "high" | "medium";
  number: string;
  accentColor: string;
  protocol: string;
}

// ─── Status / priority styling ────────────────────────────────────────────────

export const TICKET_STATUS_STYLE: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  open:        { label: "Open",        color: "var(--color-info)",            bg: "color-mix(in oklab, var(--color-info) 12%, transparent)"        },
  in_progress: { label: "In Progress", color: "var(--color-warning)",         bg: "color-mix(in oklab, var(--color-warning) 12%, transparent)"     },
  waiting:     { label: "Waiting",     color: "var(--color-muted-foreground)", bg: "var(--color-muted)"                                            },
  resolved:    { label: "Resolved",    color: "var(--color-success)",         bg: "color-mix(in oklab, var(--color-success) 12%, transparent)"     },
  closed:      { label: "Closed",      color: "var(--color-muted-foreground)", bg: "var(--color-muted)"                                            },
};

export const TICKET_PRIORITY_STYLE: Record<TicketPriority, { label: string; color: string }> = {
  low:      { label: "Low",      color: "var(--color-muted-foreground)" },
  medium:   { label: "Medium",   color: "var(--color-info)"             },
  high:     { label: "High",     color: "var(--color-warning)"          },
  critical: { label: "Critical", color: "var(--color-destructive)"      },
};

export const BUG_SEVERITY_STYLE: Record<BugSeverity, { label: string; color: string }> = {
  minor:    { label: "Minor",    color: "var(--color-muted-foreground)" },
  major:    { label: "Major",    color: "var(--color-warning)"          },
  critical: { label: "Critical", color: "var(--color-destructive)"      },
  blocker:  { label: "Blocker",  color: "var(--color-destructive)"      },
};

export const FEATURE_STATUS_STYLE: Record<FeatureStatus, { label: string; color: string }> = {
  submitted:   { label: "Submitted",   color: "var(--color-muted-foreground)" },
  planned:     { label: "Planned",     color: "var(--color-info)"             },
  in_progress: { label: "In Progress", color: "var(--color-warning)"          },
  shipped:     { label: "Shipped",     color: "var(--color-success)"          },
  declined:    { label: "Declined",    color: "var(--color-destructive)"      },
};

// ─── Contact methods ──────────────────────────────────────────────────────────

export const CONTACT_METHODS: ContactMethod[] = [
  {
    id: "ticket",
    label: "Support Ticket",
    description: "Create a tracked request with full audit trail and guaranteed SLA response",
    icon: TicketIcon,
    available: true,
    badge: "Recommended",
    accentColor: "var(--color-primary)",
    action: "Create Ticket",
    availability: "24/7",
    responseTime: "< 4 hours",
  },
  {
    id: "email",
    label: "Email Support",
    description: "Send a detailed message and receive a thorough written response",
    icon: Mail,
    available: true,
    accentColor: "var(--color-info)",
    action: "Send Email",
    availability: "Mon–Fri 9am–6pm",
    responseTime: "< 8 hours",
  },
  {
    id: "phone",
    label: "Phone Support",
    description: "Speak directly with a platform specialist for immediate guidance",
    icon: Phone,
    available: true,
    accentColor: "var(--color-success)",
    action: "Call Now",
    availability: "Mon–Fri 8am–8pm",
    responseTime: "Immediate",
  },
  {
    id: "callback",
    label: "Schedule Callback",
    description: "Book a convenient time and a specialist will call you back",
    icon: Calendar,
    available: true,
    accentColor: "var(--color-warning)",
    action: "Book Callback",
    availability: "Mon–Fri 9am–5pm",
    responseTime: "At scheduled time",
  },
  {
    id: "live-chat",
    label: "Live Chat",
    description: "Real-time chat with support agents or authority coordinators",
    icon: MessageSquare,
    available: false,
    comingSoon: true,
    accentColor: "var(--color-primary)",
    action: "Start Chat",
    availability: "24/7 (coming soon)",
    responseTime: "< 2 min",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    description: "Connect via WhatsApp for quick questions and status updates",
    icon: MessageCircle,
    available: false,
    comingSoon: true,
    accentColor: "var(--color-success)",
    action: "Open WhatsApp",
    availability: "Coming soon",
    responseTime: "< 1 hour",
  },
];

// ─── Emergency types ──────────────────────────────────────────────────────────

export const EMERGENCY_TYPES: EmergencyType[] = [
  {
    id: "air-pollution",
    label: "Air Pollution Emergency",
    description: "Hazardous AQI levels, toxic gas release, or industrial air contamination posing immediate health risk",
    icon: Wind,
    level: "critical",
    number: "1-800-AIR-HELP",
    accentColor: "var(--color-destructive)",
    protocol: "Evacuate affected area, report exact location and visible symptoms",
  },
  {
    id: "water-pollution",
    label: "Water Pollution",
    description: "Contamination of water supply, illegal discharge into waterways, or chemical spills near water bodies",
    icon: Droplets,
    level: "critical",
    number: "1-800-WTR-HELP",
    accentColor: "var(--color-info)",
    protocol: "Do not consume water, isolate source if safe to do so",
  },
  {
    id: "fire-hazard",
    label: "Fire & Smoke",
    description: "Wildfires, industrial fires producing toxic smoke, or uncontrolled burns violating environmental codes",
    icon: Flame,
    level: "critical",
    number: "911 / 1-800-ENV-FIRE",
    accentColor: "var(--color-warning)",
    protocol: "Call 911 first, then report to GreenGuard for environmental monitoring",
  },
  {
    id: "illegal-dumping",
    label: "Illegal Dumping",
    description: "Illegal disposal of waste, hazardous materials, or large-scale littering in protected areas",
    icon: Trash2,
    level: "high",
    number: "1-800-DUMP-911",
    accentColor: "var(--color-warning)",
    protocol: "Photograph evidence if safe, do not touch materials",
  },
  {
    id: "chemical-spill",
    label: "Chemical Spill",
    description: "Release of hazardous chemicals, industrial solvents, or toxic substances into the environment",
    icon: FlaskConical,
    level: "critical",
    number: "1-800-CHEM-911",
    accentColor: "var(--color-destructive)",
    protocol: "Clear the area immediately, call HAZMAT, do not attempt cleanup",
  },
  {
    id: "wildlife-emergency",
    label: "Wildlife Emergency",
    description: "Injured protected wildlife, illegal poaching, habitat destruction, or invasive species detection",
    icon: Bird,
    level: "medium",
    number: "1-800-WILD-HELP",
    accentColor: "var(--color-success)",
    protocol: "Do not approach animals, document with photos, note location",
  },
];

// ─── Mock tickets ─────────────────────────────────────────────────────────────

export const MOCK_TICKETS: SupportTicket[] = [
  {
    id: "TKT-2041",
    subject: "Dashboard AQI widget not updating after sensor replacement",
    category: "Technical Issue",
    status: "in_progress",
    priority: "high",
    createdAt: "2 hours ago",
    updatedAt: "30 min ago",
    assignedTeam: "Platform Engineering",
    department: "Environmental Monitoring",
    environment: "Production",
    estimatedResponse: "Within 2 hours",
    description: "The AQI overview widget stopped refreshing after we replaced Sensor S-142.",
    tags: ["dashboard", "sensors", "AQI"],
  },
  {
    id: "TKT-2038",
    subject: "Cannot export enforcement report to XLSX format",
    category: "Bug Report",
    status: "open",
    priority: "medium",
    createdAt: "1 day ago",
    updatedAt: "1 day ago",
    assignedTeam: "Reports Team",
    department: "Reports & Exports",
    environment: "Production",
    estimatedResponse: "Within 4 hours",
    description: "XLSX export produces empty file. PDF works fine.",
    tags: ["reports", "export", "xlsx"],
  },
  {
    id: "TKT-2031",
    subject: "Request access to District 4 complaint management",
    category: "Access Request",
    status: "waiting",
    priority: "low",
    createdAt: "3 days ago",
    updatedAt: "2 days ago",
    assignedTeam: "Administrator",
    department: "Platform Administration",
    environment: "Production",
    estimatedResponse: "Within 24 hours",
    description: "Need permission to manage complaints in District 4 following restructure.",
    tags: ["access", "permissions", "authority"],
  },
  {
    id: "TKT-2019",
    subject: "Smart Map hazard layer missing wildfire data for July",
    category: "Data Issue",
    status: "resolved",
    priority: "high",
    createdAt: "1 week ago",
    updatedAt: "4 days ago",
    assignedTeam: "Data Operations",
    department: "Smart Maps",
    environment: "Production",
    estimatedResponse: "Resolved",
    description: "Wildfire risk layer not displaying July data. Fixed — delayed satellite feed.",
    tags: ["maps", "wildfire", "data"],
  },
  {
    id: "TKT-2005",
    subject: "AI Copilot daily brief fails for custom district scope",
    category: "Technical Issue",
    status: "closed",
    priority: "medium",
    createdAt: "2 weeks ago",
    updatedAt: "1 week ago",
    assignedTeam: "AI Team",
    department: "AI Copilot",
    environment: "Production",
    estimatedResponse: "Resolved",
    description: "Fixed in v2.3.8 — multi-district brief scope now supported.",
    tags: ["AI", "copilot", "brief"],
  },
];

// ─── Authority directory ──────────────────────────────────────────────────────

export const AUTHORITY_DIRECTORY: AuthorityCard[] = [
  {
    id: "auth-001",
    name: "Dr. Sarah Chen",
    department: "Air Quality Division",
    role: "Senior Environmental Officer",
    email: "s.chen@greenguard.gov",
    phone: "+1 (555) 201-4400",
    serviceArea: "Districts 1–3",
    availability: "available",
    officeHours: "Mon–Fri 8am–5pm",
    responseTime: "< 2 hours",
  },
  {
    id: "auth-002",
    name: "Marcus Williams",
    department: "Water Quality Control",
    role: "Compliance Inspector",
    email: "m.williams@greenguard.gov",
    phone: "+1 (555) 201-4402",
    serviceArea: "City-wide",
    availability: "busy",
    officeHours: "Mon–Fri 9am–6pm",
    responseTime: "< 4 hours",
  },
  {
    id: "auth-003",
    name: "Aisha Patel",
    department: "Noise & Industrial",
    role: "Enforcement Coordinator",
    email: "a.patel@greenguard.gov",
    phone: "+1 (555) 201-4405",
    serviceArea: "Districts 4–6",
    availability: "available",
    officeHours: "Tue–Sat 8am–4pm",
    responseTime: "< 3 hours",
  },
  {
    id: "auth-004",
    name: "James Okonkwo",
    department: "Hazardous Materials",
    role: "HAZMAT Response Lead",
    email: "j.okonkwo@greenguard.gov",
    phone: "+1 (555) 201-4410",
    serviceArea: "City-wide",
    availability: "offline",
    officeHours: "Mon–Fri 7am–3pm",
    responseTime: "Next business day",
  },
  {
    id: "auth-005",
    name: "Elena Rodriguez",
    department: "Platform Administration",
    role: "City Administrator",
    email: "e.rodriguez@greenguard.gov",
    phone: "+1 (555) 201-4420",
    serviceArea: "All Districts",
    availability: "available",
    officeHours: "Mon–Fri 9am–5pm",
    responseTime: "< 1 hour",
  },
  {
    id: "auth-006",
    name: "David Kim",
    department: "Sustainability Office",
    role: "ESG & Sustainability Lead",
    email: "d.kim@greenguard.gov",
    phone: "+1 (555) 201-4415",
    serviceArea: "City-wide",
    availability: "busy",
    officeHours: "Mon–Thu 9am–6pm",
    responseTime: "< 4 hours",
  },
];

// ─── Feature requests ─────────────────────────────────────────────────────────

export const FEATURE_REQUESTS: FeatureRequest[] = [
  {
    id: "fr-001",
    title: "Dark mode for the mobile app",
    description: "Allow users to switch to a dark theme on the mobile interface to reduce eye strain and improve battery life on OLED displays.",
    category: "UI/UX",
    status: "planned",
    votes: 428,
    submittedAt: "3 months ago",
    estimatedRelease: "Q3 2026",
    tags: ["mobile", "dark mode", "accessibility"],
  },
  {
    id: "fr-002",
    title: "Bulk complaint status updates for authority users",
    description: "Allow authority officers to select multiple complaints and update status or assign them in a single action.",
    category: "Authority Portal",
    status: "in_progress",
    votes: 312,
    submittedAt: "2 months ago",
    estimatedRelease: "Q2 2026",
    tags: ["authority", "complaints", "productivity"],
  },
  {
    id: "fr-003",
    title: "Webhook support for alert notifications",
    description: "Configure webhook endpoints for real-time alert payloads — Slack, Teams, PagerDuty, and custom systems.",
    category: "Integrations",
    status: "planned",
    votes: 287,
    submittedAt: "6 weeks ago",
    estimatedRelease: "Q4 2026",
    tags: ["webhooks", "integrations", "alerts"],
  },
  {
    id: "fr-004",
    title: "PDF report with custom branding / logo",
    description: "Add municipality logo and colour scheme to exported PDF reports for official regulatory submissions.",
    category: "Reports",
    status: "shipped",
    votes: 264,
    submittedAt: "4 months ago",
    estimatedRelease: "v2.3",
    tags: ["reports", "branding", "PDF"],
  },
  {
    id: "fr-005",
    title: "AI Copilot conversation history and saved queries",
    description: "Save AI Copilot sessions so users can revisit previous analyses without re-running queries.",
    category: "AI Copilot",
    status: "submitted",
    votes: 198,
    submittedAt: "3 weeks ago",
    tags: ["AI", "copilot", "history"],
  },
  {
    id: "fr-006",
    title: "Offline mode for field officers",
    description: "Allow field officers to view complaint data and submit updates while offline, syncing on reconnect.",
    category: "Mobile",
    status: "submitted",
    votes: 156,
    submittedAt: "2 weeks ago",
    tags: ["mobile", "offline", "authority"],
  },
];

// ─── Support analytics ────────────────────────────────────────────────────────

export const SUPPORT_ANALYTICS = {
  openTickets:       3,
  resolvedThisMonth: 12,
  avgResponseTime:   "2.4h",
  satisfactionScore: 4.7,
  totalTickets:      17,
  resolutionRate:    "94%",
  pendingRequests:   2,
};

// ─── Form option arrays ───────────────────────────────────────────────────────

export const SUPPORT_CATEGORIES = [
  "Technical Issue",
  "Access Request",
  "Bug Report",
  "Data Issue",
  "Account & Billing",
  "Feature Request",
  "Complaint Management",
  "Sensor & Hardware",
  "Reports & Exports",
  "AI Copilot",
  "Other",
];

export const DEPARTMENTS = [
  "Environmental Monitoring",
  "Smart Maps",
  "AI Copilot",
  "Reports & Exports",
  "Platform Administration",
  "Authority Portal",
  "Citizen Portal",
  "Security & Access",
  "Sensor Network",
  "Other",
];

export const ENVIRONMENTS = [
  "Production",
  "Staging",
  "Development",
  "Mobile App (iOS)",
  "Mobile App (Android)",
];

export const BUG_CATEGORIES = [
  "Dashboard & Widgets",
  "Smart Maps",
  "Complaint Management",
  "Reports & Exports",
  "AI Copilot",
  "Sensor Network",
  "Authentication & Login",
  "Notifications",
  "Mobile App",
  "API / Integrations",
  "Other",
];

export const PLATFORMS = [
  "Web Browser",
  "iOS Mobile App",
  "Android Mobile App",
  "Desktop App",
  "API",
];

export const BROWSERS = ["Chrome", "Firefox", "Safari", "Edge", "Opera", "Mobile Chrome", "Mobile Safari", "Other"];
export const DEVICES  = ["Desktop (Windows)", "Desktop (Mac)", "Desktop (Linux)", "iPhone", "Android Phone", "iPad", "Android Tablet", "Other"];

// ─── localStorage keys ────────────────────────────────────────────────────────

export const SUPPORT_STORAGE_KEYS = {
  tickets:         "gg-support-tickets",
  featureVotes:    "gg-support-feature-votes",
  bugReports:      "gg-support-bug-reports",
  feedbackHistory: "gg-support-feedback",
};
