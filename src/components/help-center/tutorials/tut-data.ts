import type { ComponentType, CSSProperties } from "react";
import {
  User, ShieldCheck, Settings, LayoutDashboard,
  Sparkles, Map, FileText, Shield, BookOpen,
  Play, List, Zap, GraduationCap, CloudSun,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TutDifficulty = "Beginner" | "Intermediate" | "Advanced";
export type TutFormat = "video" | "interactive" | "guide" | "path";

export interface TutCategory {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  accentColor: string;
  tutorialCount: number;
  estimatedHours: number;
}

export interface TutStep {
  id: string;
  title: string;
  description: string;
  duration: string;
  type: "read" | "watch" | "practice" | "quiz";
  content: TutStepContent[];
  completed?: boolean;
}

export interface TutStepContent {
  type: "paragraph" | "heading" | "list" | "callout" | "code" | "tip";
  level?: 2 | 3;
  text?: string;
  items?: string[];
  variant?: "info" | "warning" | "success" | "danger";
  language?: string;
}

export interface Tutorial {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  difficulty: TutDifficulty;
  format: TutFormat;
  duration: string;
  steps: TutStep[];
  prerequisites: string[];
  tags: string[];
  relatedIds: string[];
  views: number;
  completions: number;
  rating: number;
  updatedAt: string;
  author: string;
  featured?: boolean;
  certificate?: boolean;
  downloadable?: boolean;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  targetRole: string;
  difficulty: TutDifficulty;
  tutorialIds: string[];
  estimatedHours: number;
  accentColor: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  featured?: boolean;
}

// ─── Difficulty styling ───────────────────────────────────────────────────────

export const TUT_DIFFICULTY_COLOR: Record<TutDifficulty, string> = {
  Beginner:     "var(--color-success)",
  Intermediate: "var(--color-warning)",
  Advanced:     "var(--color-destructive)",
};

export const TUT_FORMAT_LABEL: Record<TutFormat, string> = {
  video:       "Video",
  interactive: "Interactive",
  guide:       "Step-by-Step",
  path:        "Learning Path",
};

export const TUT_FORMAT_ICON: Record<TutFormat, ComponentType<{ className?: string; style?: CSSProperties }>> = {
  video:       Play,
  interactive: Zap,
  guide:       List,
  path:        GraduationCap,
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const TUT_CATEGORIES: TutCategory[] = [
  {
    id: "platform-basics",
    title: "Platform Basics",
    description: "Get up and running with GreenGuard AI from scratch",
    icon: BookOpen,
    accentColor: "var(--color-primary)",
    tutorialCount: 6,
    estimatedHours: 3,
  },
  {
    id: "citizen-workflows",
    title: "Citizen Workflows",
    description: "Master complaint submission, tracking, and environmental monitoring",
    icon: User,
    accentColor: "var(--color-info)",
    tutorialCount: 5,
    estimatedHours: 2,
  },
  {
    id: "authority-workflows",
    title: "Authority Workflows",
    description: "Command center operations, alert triage, and enforcement",
    icon: ShieldCheck,
    accentColor: "var(--color-warning)",
    tutorialCount: 7,
    estimatedHours: 4,
  },
  {
    id: "admin-workflows",
    title: "Administrator Workflows",
    description: "Platform governance, user management, and city configuration",
    icon: Settings,
    accentColor: "var(--color-destructive)",
    tutorialCount: 5,
    estimatedHours: 4,
  },
  {
    id: "dashboard-mastery",
    title: "Dashboard Mastery",
    description: "Customise, interpret, and get the most from your dashboards",
    icon: LayoutDashboard,
    accentColor: "var(--color-primary)",
    tutorialCount: 4,
    estimatedHours: 2,
  },
  {
    id: "ai-copilot",
    title: "GreenGuard Intelligence Center",
    description: "Natural language queries, daily briefs, and smart analysis",
    icon: Sparkles,
    accentColor: "var(--color-info)",
    tutorialCount: 4,
    estimatedHours: 2,
  },
  {
    id: "smart-maps",
    title: "Smart Maps & GIS",
    description: "Map layers, overlays, and geospatial data visualisation",
    icon: Map,
    accentColor: "var(--color-success)",
    tutorialCount: 4,
    estimatedHours: 3,
  },
  {
    id: "reports",
    title: "Reports & Exports",
    description: "Generate, schedule, and export environmental reports",
    icon: FileText,
    accentColor: "var(--color-warning)",
    tutorialCount: 3,
    estimatedHours: 1,
  },
  {
    id: "security",
    title: "Security & Privacy",
    description: "2FA, sessions, data privacy, and access control",
    icon: Shield,
    accentColor: "var(--color-destructive)",
    tutorialCount: 3,
    estimatedHours: 1,
  },
  {
    id: "environmental-monitoring",
    title: "Environmental Monitoring",
    description: "Sensors, AQI thresholds, alerts, and pollution tracking",
    icon: CloudSun,
    accentColor: "var(--color-success)",
    tutorialCount: 5,
    estimatedHours: 3,
  },
];

export const TUT_CATEGORIES_BY_ID = Object.fromEntries(
  TUT_CATEGORIES.map(c => [c.id, c]),
);

// ─── Tutorials ────────────────────────────────────────────────────────────────

export const TUTORIALS: Tutorial[] = [
  // ── Platform Basics ───────────────────────────────────────────────────────
  {
    id: "pb-001",
    categoryId: "platform-basics",
    title: "GreenGuard AI: Complete Platform Walkthrough",
    description: "A hands-on introduction to every major module — dashboard, maps, GreenGuard Intelligence Center, and role-based portals. Perfect for new users of any role.",
    difficulty: "Beginner",
    format: "guide",
    duration: "30 min",
    views: 14820,
    completions: 8904,
    rating: 4.9,
    updatedAt: "2 days ago",
    author: "GreenGuard Team",
    tags: ["intro", "overview", "onboarding", "all-roles"],
    relatedIds: ["pb-002", "pb-003", "cit-001"],
    featured: true,
    certificate: false,
    downloadable: true,
    prerequisites: [],
    steps: [
      {
        id: "s1",
        title: "Welcome to GreenGuard AI",
        description: "Understand what GreenGuard is and who uses it",
        duration: "5 min",
        type: "read",
        content: [
          { type: "paragraph", text: "GreenGuard AI is an enterprise environmental intelligence platform used by municipalities, environmental authorities, and citizens to monitor, report, and respond to environmental issues in real time." },
          { type: "heading", level: 2, text: "Three Core Roles" },
          { type: "list", items: ["Citizens — Report pollution, monitor local AQI, track complaint status", "Authorities — Triage alerts, dispatch officers, manage enforcement", "Administrators — Govern users, configure cities, oversee platform health"] },
          { type: "callout", variant: "info", text: "Your assigned role determines which modules and features are available to you. Contact your platform administrator if you need access to additional areas." },
        ],
      },
      {
        id: "s2",
        title: "Navigating the Sidebar",
        description: "Learn the sidebar layout and how to reach every module",
        duration: "5 min",
        type: "read",
        content: [
          { type: "paragraph", text: "The sidebar is your primary navigation tool. It adapts based on your role — citizens see the Citizen Portal, authorities see the Command Center, and administrators see governance tools." },
          { type: "heading", level: 2, text: "Universal Sidebar Items" },
          { type: "list", items: ["Dashboard — Your environmental metrics home", "Smart Maps — Geographic view of all data", "GreenGuard Intelligence Center — Natural language assistant", "Reports — Generate and export reports", "Settings — Personal preferences and security"] },
          { type: "tip", text: "Press Ctrl+B (or Cmd+B on Mac) to collapse the sidebar for a wider content view." },
        ],
      },
      {
        id: "s3",
        title: "Your Dashboard at a Glance",
        description: "Interpret the key metrics on your dashboard",
        duration: "8 min",
        type: "read",
        content: [
          { type: "paragraph", text: "The dashboard is your mission control. It displays real-time environmental KPIs, sensor network status, and recent alerts tailored to your role." },
          { type: "heading", level: 2, text: "Key Dashboard Widgets" },
          { type: "list", items: ["AQI Overview — Current air quality for your city or district", "Active Complaints — Open environmental reports awaiting resolution", "Sensor Network Health — Live status of all monitoring stations", "Recent Alerts — Threshold breaches and escalation events"] },
          { type: "callout", variant: "warning", text: "Dashboard data refreshes every 5 minutes. Use the manual refresh icon in the top right for the latest data." },
        ],
      },
      {
        id: "s4",
        title: "Searching and Finding Information",
        description: "Use global search to find anything on the platform",
        duration: "4 min",
        type: "practice",
        content: [
          { type: "paragraph", text: "GreenGuard's global search lets you find complaints, articles, sensors, reports, and settings from anywhere in the app." },
          { type: "heading", level: 2, text: "Practice Exercise" },
          { type: "list", items: ["Click the search icon in the top navigation bar", "Type 'AQI' and observe the results", "Try a complaint ID if you have one available", "Use the keyboard shortcut Cmd+K / Ctrl+K from any page"] },
        ],
      },
      {
        id: "s5",
        title: "Setting Up Your Profile",
        description: "Complete your profile for the best experience",
        duration: "5 min",
        type: "practice",
        content: [
          { type: "paragraph", text: "A complete profile helps colleagues and authorities identify you, and enables personalised notifications and preferences." },
          { type: "heading", level: 2, text: "Steps to Complete" },
          { type: "list", items: ["Navigate to Settings → Profile", "Add your display name and organisation", "Upload a profile photo using the built-in cropper", "Set your preferred language and timezone", "Save your changes"] },
          { type: "callout", variant: "success", text: "Tip: Authorities respond faster to complaints from users with complete, verified profiles." },
        ],
      },
      {
        id: "s6",
        title: "Next Steps by Role",
        description: "Where to go after this tutorial",
        duration: "3 min",
        type: "read",
        content: [
          { type: "paragraph", text: "Congratulations — you know the GreenGuard basics. Your next steps depend on your role." },
          { type: "heading", level: 2, text: "Recommended Paths" },
          { type: "list", items: ["Citizens → Take the 'Submitting Your First Complaint' tutorial", "Authorities → Take the 'Command Center Fundamentals' tutorial", "Administrators → Take the 'Platform Administration Fundamentals' tutorial"] },
        ],
      },
    ],
  },
  {
    id: "pb-002",
    categoryId: "platform-basics",
    title: "Account Setup and Security Essentials",
    description: "Create your account, verify your email, set up 2FA, and configure your security preferences in under 15 minutes.",
    difficulty: "Beginner",
    format: "guide",
    duration: "15 min",
    views: 9210,
    completions: 7102,
    rating: 4.8,
    updatedAt: "1 week ago",
    author: "GreenGuard Team",
    tags: ["account", "security", "2FA", "setup"],
    relatedIds: ["pb-001", "sec-001", "pb-003"],
    featured: true,
    certificate: false,
    downloadable: false,
    prerequisites: [],
    steps: [
      {
        id: "s1",
        title: "Creating Your Account",
        description: "Sign up and verify your email address",
        duration: "3 min",
        type: "practice",
        content: [
          { type: "list", items: ["Go to the signup page and enter your email", "Choose a strong password (12+ characters recommended)", "Accept the Terms of Service", "Click Create Account and check your email for a verification link"] },
          { type: "callout", variant: "warning", text: "Verification links expire after 24 hours. If yours has expired, request a new one from the login page." },
        ],
      },
      {
        id: "s2",
        title: "Enabling Two-Factor Authentication",
        description: "Secure your account with 2FA",
        duration: "5 min",
        type: "practice",
        content: [
          { type: "paragraph", text: "2FA is strongly recommended for all GreenGuard accounts, especially for authority and administrator roles." },
          { type: "list", items: ["Navigate to Settings → Security → Two-Factor Authentication", "Choose Authenticator App (recommended) or SMS", "Scan the QR code with your authenticator app", "Enter the 6-digit code to confirm", "Download and store your backup codes safely"] },
          { type: "callout", variant: "danger", text: "Store backup codes offline. They are the only recovery method if you lose your authenticator device." },
        ],
      },
      {
        id: "s3",
        title: "Session Management",
        description: "Understand and manage your active sessions",
        duration: "4 min",
        type: "read",
        content: [
          { type: "paragraph", text: "GreenGuard tracks every active session so you can monitor and revoke access from devices you no longer use." },
          { type: "list", items: ["Sessions expire after 60 minutes of inactivity", "Maximum session duration is 12 hours", "View active sessions at Settings → Security → Sessions", "Click Revoke to terminate any session remotely"] },
        ],
      },
      {
        id: "s4",
        title: "Notification Preferences",
        description: "Configure how and when GreenGuard contacts you",
        duration: "3 min",
        type: "practice",
        content: [
          { type: "list", items: ["Navigate to Settings → Notifications", "Choose your preferred channels: email, push, or SMS", "Set AQI alert thresholds", "Configure complaint update notifications", "Save your preferences"] },
        ],
      },
    ],
  },
  {
    id: "pb-003",
    categoryId: "platform-basics",
    title: "Understanding the GreenGuard Dashboard",
    description: "Learn to customise, read, and interpret every metric and widget on your personalised GreenGuard dashboard.",
    difficulty: "Beginner",
    format: "video",
    duration: "20 min",
    views: 7650,
    completions: 5401,
    rating: 4.7,
    updatedAt: "5 days ago",
    author: "GreenGuard Team",
    tags: ["dashboard", "widgets", "customisation", "metrics"],
    relatedIds: ["pb-001", "dash-001", "pb-002"],
    featured: false,
    certificate: false,
    downloadable: true,
    prerequisites: ["pb-001"],
    steps: [
      {
        id: "s1",
        title: "Dashboard Layout Overview",
        description: "Understand the structure of your dashboard",
        duration: "5 min",
        type: "watch",
        content: [
          { type: "paragraph", text: "Your GreenGuard dashboard is divided into three zones: the header KPI strip, the main widget grid, and the right-hand summary panel (visible on wide screens)." },
          { type: "callout", variant: "info", text: "This tutorial includes a video walkthrough. Press Play in the video panel above to follow along." },
        ],
      },
      {
        id: "s2",
        title: "Customising Widget Layout",
        description: "Add, remove, and rearrange widgets",
        duration: "8 min",
        type: "practice",
        content: [
          { type: "list", items: ["Click Edit Layout in the top right", "Drag widgets to reorder them", "Resize by dragging the bottom-right corner handle", "Remove a widget by clicking the × icon", "Add new widgets from the widget library panel", "Click Save Layout when done"] },
        ],
      },
      {
        id: "s3",
        title: "Reading Environmental KPIs",
        description: "Interpret the numbers correctly",
        duration: "7 min",
        type: "read",
        content: [
          { type: "paragraph", text: "Each KPI on your dashboard has a specific data source and calculation method. Misreading these metrics can lead to incorrect decisions." },
          { type: "heading", level: 2, text: "Core KPI Definitions" },
          { type: "list", items: ["City AQI — Weighted average of active sensor readings, population-density adjusted", "Active Complaints — Count of unresolved complaints within your scope", "Sensor Health — Percentage of sensors reporting within the last 15 minutes", "Alert Response Time — Mean time from alert creation to authority acknowledgement"] },
          { type: "callout", variant: "warning", text: "A Sensor Health below 80% indicates network issues. Notify your platform administrator if this persists." },
        ],
      },
    ],
  },

  // ── Citizen Workflows ─────────────────────────────────────────────────────
  {
    id: "cit-001",
    categoryId: "citizen-workflows",
    title: "Submitting Your First Environmental Complaint",
    description: "A complete step-by-step walkthrough for filing a pollution complaint — from choosing the right category to attaching evidence and tracking your submission.",
    difficulty: "Beginner",
    format: "guide",
    duration: "12 min",
    views: 11240,
    completions: 8901,
    rating: 4.9,
    updatedAt: "3 days ago",
    author: "GreenGuard Team",
    tags: ["complaint", "citizen", "pollution", "report"],
    relatedIds: ["cit-002", "cit-003", "pb-001"],
    featured: true,
    certificate: false,
    downloadable: false,
    prerequisites: ["pb-001"],
    steps: [
      {
        id: "s1",
        title: "Before You Submit",
        description: "Gather the right information for a strong complaint",
        duration: "3 min",
        type: "read",
        content: [
          { type: "paragraph", text: "A complete complaint is resolved faster. Before you open the submission form, gather: the exact location, time of incident, pollution type, and any photos or videos." },
          { type: "heading", level: 2, text: "What Makes a Strong Complaint" },
          { type: "list", items: ["Precise location — pin on map or full street address", "Date and time of the incident", "Type of pollution — air, water, noise, soil, or other", "Description — what you saw, smelled, or heard", "Photos or video — visual evidence greatly speeds resolution"] },
        ],
      },
      {
        id: "s2",
        title: "Opening the Complaint Form",
        description: "Navigate to the New Complaint form",
        duration: "2 min",
        type: "practice",
        content: [
          { type: "list", items: ["From the sidebar, click Citizen Portal", "Click the New Complaint button in the top right", "Alternatively, use the Quick Actions shortcut on your dashboard"] },
        ],
      },
      {
        id: "s3",
        title: "Filling in the Details",
        description: "Complete every section of the form accurately",
        duration: "4 min",
        type: "practice",
        content: [
          { type: "list", items: ["Select the pollution type from the dropdown", "Pin the incident location on the interactive map", "Set the date and time (or mark as ongoing)", "Write a clear, factual description in the details field", "Attach photos — drag and drop or use the file picker", "Review all fields before submitting"] },
          { type: "callout", variant: "info", text: "Descriptions should be factual and objective. Avoid subjective language — stick to what you observed." },
        ],
      },
      {
        id: "s4",
        title: "Tracking Your Complaint",
        description: "Follow your complaint from submission to resolution",
        duration: "3 min",
        type: "read",
        content: [
          { type: "paragraph", text: "After submission you receive a complaint ID and can monitor progress in Citizen Portal → My Complaints." },
          { type: "list", items: ["Submitted — Awaiting authority assignment", "Under Review — Assigned to an officer", "In Progress — Active investigation underway", "Resolved — Issue addressed, outcome recorded", "Closed — Case closed, no further action"] },
          { type: "callout", variant: "success", text: "You will receive a notification at each status change. Make sure email notifications are enabled in your settings." },
        ],
      },
    ],
  },
  {
    id: "cit-002",
    categoryId: "citizen-workflows",
    title: "Reading and Interpreting Your Local AQI",
    description: "Understand what the Air Quality Index means for your health, how GreenGuard calculates it, and how to set up personalised AQI alerts.",
    difficulty: "Beginner",
    format: "guide",
    duration: "15 min",
    views: 9870,
    completions: 7201,
    rating: 4.8,
    updatedAt: "1 week ago",
    author: "GreenGuard Team",
    tags: ["AQI", "air quality", "health", "alerts"],
    relatedIds: ["cit-001", "env-001", "cit-003"],
    featured: false,
    certificate: false,
    downloadable: true,
    prerequisites: [],
    steps: [
      {
        id: "s1",
        title: "What Is the AQI?",
        description: "The standardised scale for communicating air quality",
        duration: "5 min",
        type: "read",
        content: [
          { type: "paragraph", text: "The Air Quality Index (AQI) converts complex pollutant measurements into a single number that communicates how clean or polluted the air is and what health effects might be a concern." },
          { type: "heading", level: 2, text: "AQI Scale" },
          { type: "list", items: ["0–50 (Good) — Satisfactory, little or no health risk", "51–100 (Moderate) — Acceptable for most, sensitive groups should limit prolonged exertion outdoors", "101–150 (Unhealthy for Sensitive Groups) — At-risk groups should reduce outdoor activity", "151–200 (Unhealthy) — Everyone may experience effects", "201–300 (Very Unhealthy) — Avoid prolonged outdoor exposure", "301+ (Hazardous) — Emergency conditions, remain indoors"] },
        ],
      },
      {
        id: "s2",
        title: "Setting Up AQI Alerts",
        description: "Get notified when air quality changes near you",
        duration: "5 min",
        type: "practice",
        content: [
          { type: "list", items: ["Go to Settings → Notifications → Environmental Alerts", "Set your AQI alert threshold (e.g., notify me when AQI exceeds 100)", "Choose your preferred channel: push, email, or SMS", "Optionally pin multiple locations to monitor", "Save your alert configuration"] },
          { type: "callout", variant: "info", text: "GreenGuard AQI reflects conditions up to 30 minutes ago. For truly real-time tracking, check the Smart Maps sensor view." },
        ],
      },
      {
        id: "s3",
        title: "Protective Actions by AQI Level",
        description: "Know when to take precautions",
        duration: "5 min",
        type: "read",
        content: [
          { type: "paragraph", text: "Different AQI levels warrant different responses, especially for sensitive groups including children, the elderly, and those with respiratory conditions." },
          { type: "list", items: ["Good (0–50): Normal outdoor activity", "Moderate (51–100): Sensitive individuals should consider reducing prolonged outdoor exertion", "Unhealthy for Sensitive Groups (101–150): At-risk groups should limit outdoor activity; general public can continue normal activities", "Unhealthy (151–200): Everyone should reduce prolonged outdoor exertion; sensitive groups stay indoors", "Very Unhealthy / Hazardous (201+): Avoid all outdoor activity; keep windows and doors closed"] },
        ],
      },
    ],
  },
  {
    id: "cit-003",
    categoryId: "citizen-workflows",
    title: "Using Smart Maps to Monitor Your Environment",
    description: "Explore sensor data, complaint hotspots, and hazard zones directly on the GreenGuard Smart Map.",
    difficulty: "Beginner",
    format: "interactive",
    duration: "18 min",
    views: 6540,
    completions: 4230,
    rating: 4.6,
    updatedAt: "4 days ago",
    author: "GreenGuard Team",
    tags: ["maps", "sensors", "AQI", "citizen"],
    relatedIds: ["cit-002", "map-001", "pb-001"],
    featured: false,
    certificate: false,
    downloadable: false,
    prerequisites: ["pb-001"],
    steps: [
      {
        id: "s1",
        title: "Opening the Smart Map",
        description: "Navigate to and orient yourself on the map",
        duration: "3 min",
        type: "practice",
        content: [
          { type: "list", items: ["Click Smart Maps in the sidebar", "The map centres on your city by default", "Use scroll/pinch to zoom, click-drag to pan", "Your current location appears as a blue dot if location permissions are granted"] },
        ],
      },
      {
        id: "s2",
        title: "Enabling Map Layers",
        description: "Turn on sensor, AQI, and complaint layers",
        duration: "5 min",
        type: "practice",
        content: [
          { type: "paragraph", text: "Map layers let you overlay different types of environmental data simultaneously." },
          { type: "list", items: ["Open the Layer panel (top right of the map)", "Enable AQI Heatmap to see colour-coded air quality", "Enable Sensor Network to see monitoring station locations", "Enable Complaint Pins to see reported pollution incidents", "Toggle layers on and off to compare views"] },
        ],
      },
      {
        id: "s3",
        title: "Reading Sensor Data",
        description: "Interpret individual sensor station readings",
        duration: "5 min",
        type: "read",
        content: [
          { type: "paragraph", text: "Each sensor station on the map provides real-time readings for multiple pollutants." },
          { type: "list", items: ["Click any sensor dot to open its data card", "View PM2.5, PM10, NO2, SO2, O3, and CO readings", "Check the timestamp to confirm data freshness", "Green = within safe limits, Yellow = moderate, Orange/Red = elevated concern"] },
        ],
      },
      {
        id: "s4",
        title: "Reporting from the Map",
        description: "Submit a complaint directly from the map",
        duration: "5 min",
        type: "practice",
        content: [
          { type: "list", items: ["Long-press or right-click any map location", "Select Report Environmental Issue from the context menu", "The location is pre-filled from your map selection", "Complete the remaining complaint fields and submit"] },
        ],
      },
    ],
  },

  // ── Authority Workflows ───────────────────────────────────────────────────
  {
    id: "auth-001",
    categoryId: "authority-workflows",
    title: "Command Center Fundamentals",
    description: "Master the Authority Command Center — triaging incoming alerts, assigning complaints, escalating critical events, and tracking resolution through to close.",
    difficulty: "Intermediate",
    format: "guide",
    duration: "35 min",
    views: 4210,
    completions: 2840,
    rating: 4.8,
    updatedAt: "1 day ago",
    author: "GreenGuard Team",
    tags: ["command center", "authority", "alerts", "triage"],
    relatedIds: ["auth-002", "auth-003", "pb-001"],
    featured: true,
    certificate: true,
    downloadable: true,
    prerequisites: ["pb-001"],
    steps: [
      {
        id: "s1",
        title: "Command Center Overview",
        description: "Understand the layout and key panels",
        duration: "5 min",
        type: "read",
        content: [
          { type: "paragraph", text: "The Authority Command Center is the operational hub for environmental enforcement. It aggregates incoming complaints, sensor alerts, and AI-flagged events into a unified triage interface." },
          { type: "heading", level: 2, text: "Key Panels" },
          { type: "list", items: ["Alert Triage Queue — Incoming alerts sorted by severity", "Active Assignments — Complaints currently being investigated", "Resolved Today — Cases closed in the last 24 hours", "Escalation Log — Escalated cases awaiting senior review"] },
        ],
      },
      {
        id: "s2",
        title: "Triaging the Alert Queue",
        description: "Prioritise and categorise incoming alerts efficiently",
        duration: "10 min",
        type: "practice",
        content: [
          { type: "paragraph", text: "The triage queue displays all incoming alerts sorted by severity: Critical → High → Medium → Low. Your goal is to assess each alert and route it appropriately within your SLA window." },
          { type: "list", items: ["Review the severity badge and alert type first", "Open the alert detail drawer by clicking the row", "Read the AI-generated incident summary", "Classify the alert: Legitimate, Duplicate, or False Positive", "Assign or dismiss accordingly"] },
          { type: "callout", variant: "danger", text: "Critical alerts (AQI > 300 or confirmed industrial spill) must be escalated within 15 minutes per compliance requirements." },
        ],
      },
      {
        id: "s3",
        title: "Assigning Complaints to Officers",
        description: "Route complaints to the right field officer",
        duration: "8 min",
        type: "practice",
        content: [
          { type: "list", items: ["Open the complaint detail drawer", "Click the Assign Officer dropdown", "Filter officers by availability and district", "Select the most suitable officer", "Set a target resolution date", "Add internal notes if needed", "Confirm the assignment"] },
          { type: "callout", variant: "info", text: "Officers are notified immediately upon assignment via push notification and email." },
        ],
      },
      {
        id: "s4",
        title: "Escalation Workflow",
        description: "Escalate complaints that exceed field capacity",
        duration: "7 min",
        type: "read",
        content: [
          { type: "paragraph", text: "Not all complaints can be resolved at field level. The escalation workflow routes cases to senior authority tier for strategic response." },
          { type: "list", items: ["Open any active complaint", "Click the Escalate button in the action bar", "Select the escalation reason from the dropdown", "Add a briefing note for the senior authority", "Confirm escalation — supervisors are notified immediately"] },
        ],
      },
      {
        id: "s5",
        title: "Closing and Resolving Cases",
        description: "Document outcomes and close resolved complaints",
        duration: "5 min",
        type: "practice",
        content: [
          { type: "list", items: ["Navigate to the complaint after field resolution", "Click Mark as Resolved", "Record the resolution type: Enforced, Advisory, No Action, or Referred", "Add resolution notes — these are visible to the citizen", "Close the case to update the citizen and clear the queue"] },
        ],
      },
    ],
  },
  {
    id: "auth-002",
    categoryId: "authority-workflows",
    title: "Generating Enforcement Reports",
    description: "Create, configure, and export authority enforcement reports for regulatory submissions and internal review.",
    difficulty: "Intermediate",
    format: "guide",
    duration: "20 min",
    views: 2890,
    completions: 1940,
    rating: 4.6,
    updatedAt: "3 days ago",
    author: "GreenGuard Team",
    tags: ["reports", "enforcement", "export", "authority"],
    relatedIds: ["auth-001", "rep-001"],
    featured: false,
    certificate: false,
    downloadable: true,
    prerequisites: ["auth-001"],
    steps: [
      {
        id: "s1",
        title: "Report Types for Authority Users",
        description: "Understand which report templates apply to your role",
        duration: "5 min",
        type: "read",
        content: [
          { type: "list", items: ["Enforcement Activity Summary — Case volume, resolution rates, officer performance", "AQI Compliance Report — Threshold breach frequency by district", "Complaint Category Breakdown — Distribution by pollution type and area", "Monthly Executive Summary — High-level overview for management"] },
        ],
      },
      {
        id: "s2",
        title: "Creating and Configuring a Report",
        description: "Build your first enforcement report",
        duration: "10 min",
        type: "practice",
        content: [
          { type: "list", items: ["Navigate to Reports from the sidebar", "Click New Report", "Select Authority Enforcement Summary", "Set the date range", "Choose scope: city-wide or by district", "Select output format: PDF, CSV, or XLSX", "Click Generate and wait for completion (typically < 30 seconds)"] },
        ],
      },
      {
        id: "s3",
        title: "Scheduling Recurring Reports",
        description: "Automate regular report delivery",
        duration: "5 min",
        type: "practice",
        content: [
          { type: "list", items: ["Open any completed report", "Click Schedule Recurring", "Set frequency: Daily, Weekly, or Monthly", "Add recipient email addresses", "Click Activate — reports will be generated and delivered automatically"] },
        ],
      },
    ],
  },

  // ── GreenGuard Intelligence Center ─────────────────────────────────────────
  {
    id: "ai-001",
    categoryId: "ai-copilot",
    title: "GreenGuard Intelligence Center: Your First Conversation",
    description: "Learn to query the GreenGuard Intelligence Center in natural language, interpret its responses, and use it to generate insights you couldn't get from dashboards alone.",
    difficulty: "Beginner",
    format: "interactive",
    duration: "20 min",
    views: 8920,
    completions: 6104,
    rating: 4.8,
    updatedAt: "1 week ago",
    author: "GreenGuard Team",
    tags: ["AI", "copilot", "natural language", "analysis"],
    relatedIds: ["ai-002", "ai-003", "pb-001"],
    featured: true,
    certificate: false,
    downloadable: false,
    prerequisites: ["pb-001"],
    steps: [
      {
        id: "s1",
        title: "Opening the Intelligence Center",
        description: "Navigate to the GreenGuard Intelligence Center module",
        duration: "2 min",
        type: "practice",
        content: [
          { type: "list", items: ["Click GreenGuard Intelligence Center in the sidebar (Sparkles icon)", "Or press Cmd+J / Ctrl+J from anywhere in the app", "A new conversation starts automatically"] },
        ],
      },
      {
        id: "s2",
        title: "Your First Query",
        description: "Ask the Intelligence Center a data question",
        duration: "5 min",
        type: "practice",
        content: [
          { type: "paragraph", text: "The Intelligence Center understands natural language. Type your question as if talking to a knowledgeable colleague." },
          { type: "heading", level: 2, text: "Try These Starter Queries" },
          { type: "list", items: ["\"What's the current AQI for the city centre?\"", "\"Which area has the most open complaints right now?\"", "\"Show me pollution trends for the past week\"", "\"Generate a summary of today's environmental status\""] },
          { type: "callout", variant: "info", text: "The Intelligence Center draws on data up to 30 minutes old. For real-time readings, check Smart Maps directly." },
        ],
      },
      {
        id: "s3",
        title: "Generating the Daily Brief",
        description: "Use the Intelligence Center to produce an executive summary",
        duration: "5 min",
        type: "practice",
        content: [
          { type: "list", items: ["Click the Daily Brief button in the Intelligence Center sidebar", "The Intelligence Center generates a formatted summary of the last 24 hours", "Review AQI trends, notable events, and complaint volume", "Copy or export the brief from the top right menu"] },
        ],
      },
      {
        id: "s4",
        title: "Understanding Intelligence Center Limitations",
        description: "Know what the Intelligence Center can and cannot do",
        duration: "8 min",
        type: "read",
        content: [
          { type: "heading", level: 2, text: "What It Can Access" },
          { type: "list", items: ["Real-time and historical sensor data (up to 30-min lag)", "Complaint records within your permission scope", "Environmental alerts and threshold breach logs", "Published documentation and guidelines"] },
          { type: "heading", level: 2, text: "What It Cannot Access" },
          { type: "list", items: ["Personal user data outside your scope", "External databases not connected to GreenGuard", "Data from the last 30 minutes"] },
          { type: "callout", variant: "warning", text: "Always verify AI summaries against source data before using them in regulatory submissions or official reports." },
        ],
      },
    ],
  },
  {
    id: "ai-002",
    categoryId: "ai-copilot",
    title: "Advanced GreenGuard Intelligence Center: Data Analysis Techniques",
    description: "Go beyond simple queries — use the Intelligence Center for trend analysis, comparative studies, anomaly detection, and automated briefing generation.",
    difficulty: "Advanced",
    format: "guide",
    duration: "40 min",
    views: 3104,
    completions: 1890,
    rating: 4.7,
    updatedAt: "2 weeks ago",
    author: "GreenGuard Team",
    tags: ["AI", "analysis", "advanced", "trends"],
    relatedIds: ["ai-001", "env-001"],
    featured: false,
    certificate: true,
    downloadable: true,
    prerequisites: ["ai-001", "pb-001"],
    steps: [
      {
        id: "s1",
        title: "Structured Query Techniques",
        description: "Write better queries to get better answers",
        duration: "10 min",
        type: "read",
        content: [
          { type: "paragraph", text: "The quality of the Intelligence Center's response correlates directly with how you phrase your query. Structured queries consistently yield more precise results." },
          { type: "heading", level: 2, text: "Query Structure Best Practices" },
          { type: "list", items: ["Specify a time range: 'over the last 7 days', 'in March 2024'", "Name a specific district or sensor: 'in District 4', 'from Sensor S-142'", "State the output format: 'as a table', 'as a bullet summary', 'as a daily chart'", "Ask for comparisons: 'compare District 3 vs District 5'"] },
          { type: "callout", variant: "info", text: "Example: 'Compare average PM2.5 readings in District 3 vs District 5 over the last 30 days and highlight any anomalies.'" },
        ],
      },
      {
        id: "s2",
        title: "Trend and Anomaly Analysis",
        description: "Use the Intelligence Center to identify patterns in environmental data",
        duration: "15 min",
        type: "practice",
        content: [
          { type: "list", items: ["Ask: 'What are the top 3 pollution trend changes this month?'", "Ask: 'Which sensors showed unusual readings last week?'", "Ask: 'Is there a pattern in complaint volume on weekdays vs weekends?'", "Request a chart: 'Show AQI trends for the city as a 30-day line chart'"] },
        ],
      },
      {
        id: "s3",
        title: "Automated Briefing Generation",
        description: "Set up recurring AI-generated environmental briefs",
        duration: "15 min",
        type: "practice",
        content: [
          { type: "list", items: ["Open the Intelligence Center and click Scheduled Briefs", "Click New Schedule and choose a template", "Customise the scope: city, district, or custom sensor list", "Set the delivery time and format", "Add recipients and activate the schedule"] },
          { type: "callout", variant: "success", text: "Scheduled briefs are ideal for morning environmental briefings for authority teams and city council reports." },
        ],
      },
    ],
  },

  // ── Smart Maps ────────────────────────────────────────────────────────────
  {
    id: "map-001",
    categoryId: "smart-maps",
    title: "Smart Maps: Complete Layer Guide",
    description: "Master every map layer — AQI heatmap, sensor network, complaint pins, wildfire risk, flood zones, and industrial hazards.",
    difficulty: "Intermediate",
    format: "interactive",
    duration: "30 min",
    views: 5801,
    completions: 3620,
    rating: 4.7,
    updatedAt: "6 days ago",
    author: "GreenGuard Team",
    tags: ["maps", "GIS", "layers", "heatmap"],
    relatedIds: ["map-002", "cit-003", "env-001"],
    featured: false,
    certificate: false,
    downloadable: false,
    prerequisites: ["pb-001"],
    steps: [
      {
        id: "s1",
        title: "Layer Manager Overview",
        description: "Navigate the layer control panel",
        duration: "5 min",
        type: "read",
        content: [
          { type: "list", items: ["Click the Layers icon in the top-right map toolbar", "The layer manager slides in from the right", "Each layer has a toggle, opacity slider, and info popover", "Layers render in z-order — drag to reorder if needed"] },
        ],
      },
      {
        id: "s2",
        title: "AQI Heatmap Layer",
        description: "Read and interpret the air quality overlay",
        duration: "8 min",
        type: "practice",
        content: [
          { type: "paragraph", text: "The AQI heatmap renders colour-coded air quality intensity across the city, interpolated between sensor readings." },
          { type: "list", items: ["Green (0–50): Good air quality", "Yellow (51–100): Moderate", "Orange (101–150): Unhealthy for sensitive groups", "Red (151–200): Unhealthy", "Purple (201–300): Very unhealthy", "Dark red (301+): Hazardous"] },
          { type: "callout", variant: "info", text: "The heatmap is interpolated between sensor locations. Areas without nearby sensors show estimated values with lower confidence." },
        ],
      },
      {
        id: "s3",
        title: "Hazard Intelligence Layers",
        description: "Use wildfire, flood, and industrial hazard overlays",
        duration: "12 min",
        type: "practice",
        content: [
          { type: "list", items: ["Enable Wildfire Risk to see AI-predicted high-risk zones (updated daily)", "Enable Flood Zones to view FEMA-integrated flood risk mapping", "Enable Industrial Hazards to see registered facilities and compliance status", "Click any hazard area to view the detailed risk assessment"] },
          { type: "callout", variant: "warning", text: "Hazard layer data is updated daily. For real-time emergency response, cross-reference with official emergency management sources." },
        ],
      },
      {
        id: "s4",
        title: "Saving and Sharing Map Views",
        description: "Export and share configured map views",
        duration: "5 min",
        type: "practice",
        content: [
          { type: "list", items: ["Configure your layers and zoom level", "Click Save View in the toolbar", "Name the view and optionally share with your team", "Saved views appear in the Views dropdown for quick access", "Export a screenshot via the Export button for reports"] },
        ],
      },
    ],
  },

  // ── Security ──────────────────────────────────────────────────────────────
  {
    id: "sec-001",
    categoryId: "security",
    title: "Securing Your GreenGuard Account",
    description: "A complete security tutorial covering 2FA setup, session management, password best practices, and recognising phishing attempts.",
    difficulty: "Beginner",
    format: "guide",
    duration: "25 min",
    views: 6120,
    completions: 4980,
    rating: 4.9,
    updatedAt: "5 days ago",
    author: "GreenGuard Team",
    tags: ["security", "2FA", "password", "phishing"],
    relatedIds: ["pb-002", "sec-002"],
    featured: false,
    certificate: true,
    downloadable: true,
    prerequisites: [],
    steps: [
      {
        id: "s1",
        title: "Why Account Security Matters",
        description: "Understand the risks and your responsibility",
        duration: "5 min",
        type: "read",
        content: [
          { type: "paragraph", text: "GreenGuard accounts — especially authority and administrator accounts — have access to sensitive environmental data and enforcement actions. A compromised account can cause real harm." },
          { type: "list", items: ["Authority accounts can modify complaint statuses and dispatch officers", "Admin accounts can deactivate users and change city configurations", "Even citizen accounts contain personal location and contact data"] },
          { type: "callout", variant: "danger", text: "Never share your credentials with anyone, including GreenGuard support staff. We will never ask for your password." },
        ],
      },
      {
        id: "s2",
        title: "Enabling Two-Factor Authentication",
        description: "Add the second layer of protection",
        duration: "8 min",
        type: "practice",
        content: [
          { type: "list", items: ["Navigate to Settings → Security → Two-Factor Authentication", "Choose Authenticator App", "Install an app: Google Authenticator, Authy, or 1Password", "Scan the QR code shown on screen", "Enter the 6-digit code to confirm setup", "Save your backup codes in a secure offline location"] },
        ],
      },
      {
        id: "s3",
        title: "Managing Active Sessions",
        description: "Monitor and revoke device access",
        duration: "5 min",
        type: "practice",
        content: [
          { type: "list", items: ["Go to Settings → Security → Active Sessions", "Review the list of devices and locations", "Identify any sessions you don't recognise", "Click Revoke next to any suspicious session", "If you see unauthorised access, change your password immediately"] },
        ],
      },
      {
        id: "s4",
        title: "Password Best Practices",
        description: "Create and manage strong passwords",
        duration: "7 min",
        type: "read",
        content: [
          { type: "list", items: ["Use a minimum of 16 characters", "Include a mix of uppercase, lowercase, numbers, and symbols", "Never reuse passwords across platforms", "Use a password manager (1Password, Bitwarden, or Dashlane)", "Change your password if you suspect a breach"] },
          { type: "callout", variant: "info", text: "GreenGuard enforces a minimum 12-character password policy. We recommend 16+ characters for all accounts." },
        ],
      },
    ],
  },

  // ── Environmental Monitoring ───────────────────────────────────────────────
  {
    id: "env-001",
    categoryId: "environmental-monitoring",
    title: "Understanding GreenGuard's Sensor Network",
    description: "How the IoT sensor network works, what it measures, how data is validated, and how to interpret readings accurately.",
    difficulty: "Intermediate",
    format: "guide",
    duration: "25 min",
    views: 5400,
    completions: 3210,
    rating: 4.7,
    updatedAt: "3 days ago",
    author: "GreenGuard Team",
    tags: ["sensors", "IoT", "monitoring", "data"],
    relatedIds: ["env-002", "map-001", "cit-002"],
    featured: false,
    certificate: false,
    downloadable: true,
    prerequisites: ["pb-001"],
    steps: [
      {
        id: "s1",
        title: "Sensor Network Architecture",
        description: "How sensors connect and transmit data",
        duration: "8 min",
        type: "read",
        content: [
          { type: "paragraph", text: "GreenGuard's sensor network comprises hundreds of IoT devices distributed across city districts, transmitting measurements every 60 seconds to the GreenGuard cloud." },
          { type: "heading", level: 2, text: "What Sensors Measure" },
          { type: "list", items: ["PM2.5 — Fine particulate matter (most health-relevant)", "PM10 — Coarse particulate matter", "NO2 — Nitrogen dioxide (traffic and industrial combustion)", "SO2 — Sulfur dioxide (industrial sources)", "O3 — Ground-level ozone", "CO — Carbon monoxide", "Temperature and Relative Humidity"] },
        ],
      },
      {
        id: "s2",
        title: "Data Validation and Accuracy",
        description: "How GreenGuard ensures reading quality",
        duration: "10 min",
        type: "read",
        content: [
          { type: "paragraph", text: "Raw sensor data goes through a multi-stage validation pipeline before appearing in the platform." },
          { type: "list", items: ["Range check — Readings outside physically possible ranges are discarded", "Cross-validation — Readings are compared against nearby sensors", "Reference comparison — Validated against certified reference stations", "Drift correction — Software algorithm adjusts for sensor ageing", "Anomaly flagging — Statistically unusual readings are flagged for review"] },
          { type: "callout", variant: "info", text: "Flagged readings are excluded from AQI calculations until manually reviewed by a platform administrator." },
        ],
      },
      {
        id: "s3",
        title: "Interpreting Sensor Data on the Map",
        description: "Read sensor data cards effectively",
        duration: "7 min",
        type: "practice",
        content: [
          { type: "list", items: ["Click any sensor dot on the Smart Map", "The data card shows current readings for all pollutants", "Green indicators = within safe limits", "The timestamp shows data freshness — fresh data is < 5 minutes old", "A grey 'Offline' badge indicates the sensor is not transmitting — notify your admin"] },
        ],
      },
    ],
  },
  {
    id: "env-002",
    categoryId: "environmental-monitoring",
    title: "Configuring Environmental Alert Thresholds",
    description: "Set up custom AQI and pollutant alert thresholds, choose notification channels, and configure escalation rules for your city or district.",
    difficulty: "Advanced",
    format: "guide",
    duration: "30 min",
    views: 2890,
    completions: 1640,
    rating: 4.6,
    updatedAt: "5 days ago",
    author: "GreenGuard Team",
    tags: ["alerts", "thresholds", "configuration", "advanced"],
    relatedIds: ["env-001", "auth-001"],
    featured: false,
    certificate: true,
    downloadable: true,
    prerequisites: ["env-001", "auth-001"],
    steps: [
      {
        id: "s1",
        title: "Threshold Types",
        description: "Understand the four types of alert trigger",
        duration: "8 min",
        type: "read",
        content: [
          { type: "list", items: ["AQI Category Breach — Triggers when AQI crosses a category boundary (e.g., Good → Moderate)", "Absolute Value — Triggers when a specific pollutant exceeds a set concentration (e.g., PM2.5 > 35 μg/m³)", "Rate of Change — Triggers when a value rises faster than a set rate per hour", "Duration — Triggers when a condition persists beyond a set time window (e.g., AQI > 100 for > 2 hours)"] },
        ],
      },
      {
        id: "s2",
        title: "Creating Alert Rules",
        description: "Configure your first custom alert",
        duration: "12 min",
        type: "practice",
        content: [
          { type: "list", items: ["Navigate to Settings → Alerts → Alert Rules", "Click New Alert Rule", "Select the trigger type", "Set the threshold value and applicable sensors/district", "Choose notification channels: email, push, SMS, or webhook", "Set the recipient list", "Configure escalation: who gets notified if the alert isn't acknowledged within X minutes", "Activate the rule"] },
        ],
      },
      {
        id: "s3",
        title: "Testing and Tuning Alerts",
        description: "Avoid alert fatigue with correct calibration",
        duration: "10 min",
        type: "read",
        content: [
          { type: "paragraph", text: "Alert fatigue occurs when too many alerts fire, causing recipients to ignore them. Proper threshold calibration is critical." },
          { type: "list", items: ["Review historical alert frequency before setting thresholds", "Start conservatively (higher thresholds) and tune down gradually", "Use the 30-day alert volume report to assess calibration", "Consolidate related alerts where possible", "Review and update thresholds quarterly"] },
          { type: "callout", variant: "warning", text: "An alert rule that fires more than 20 times per day is usually misconfigured. Use the Alert Diagnostics tool to review." },
        ],
      },
    ],
  },
];

// ─── Derived lookups ──────────────────────────────────────────────────────────

export const TUTORIALS_BY_ID = Object.fromEntries(
  TUTORIALS.map(t => [t.id, t]),
);

export const TUTORIALS_BY_CATEGORY = TUT_CATEGORIES.reduce<
  Record<string, Tutorial[]>
>((acc, cat) => {
  acc[cat.id] = TUTORIALS.filter(t => t.categoryId === cat.id);
  return acc;
}, {});

// ─── Learning paths ───────────────────────────────────────────────────────────

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: "lp-citizen",
    title: "Citizen Essentials",
    description: "Everything a citizen needs to report pollution, monitor local AQI, and use GreenGuard confidently.",
    targetRole: "Citizens",
    difficulty: "Beginner",
    tutorialIds: ["pb-001", "pb-002", "cit-001", "cit-002", "cit-003"],
    estimatedHours: 2,
    accentColor: "var(--color-info)",
    icon: User,
    featured: true,
  },
  {
    id: "lp-authority",
    title: "Authority Command Training",
    description: "Complete authority operational readiness — from alert triage to enforcement reporting and map analysis.",
    targetRole: "Authority Officers",
    difficulty: "Intermediate",
    tutorialIds: ["pb-001", "auth-001", "auth-002", "map-001", "env-001"],
    estimatedHours: 4,
    accentColor: "var(--color-warning)",
    icon: ShieldCheck,
    featured: true,
  },
  {
    id: "lp-ai-power",
    title: "GreenGuard Intelligence Center Power User",
    description: "Go from GreenGuard Intelligence Center basics to advanced data analysis, scheduled briefings, and trend investigation.",
    targetRole: "All Roles",
    difficulty: "Intermediate",
    tutorialIds: ["pb-001", "ai-001", "ai-002", "env-001"],
    estimatedHours: 3,
    accentColor: "var(--color-primary)",
    icon: Sparkles,
    featured: true,
  },
  {
    id: "lp-security",
    title: "Security Fundamentals",
    description: "Protect your account and your data — 2FA, sessions, passwords, and access control best practices.",
    targetRole: "All Roles",
    difficulty: "Beginner",
    tutorialIds: ["pb-002", "sec-001"],
    estimatedHours: 1,
    accentColor: "var(--color-destructive)",
    icon: Shield,
    featured: false,
  },
];

export const LEARNING_PATHS_BY_ID = Object.fromEntries(
  LEARNING_PATHS.map(lp => [lp.id, lp]),
);

// ─── Popular search chips ─────────────────────────────────────────────────────

export const TUT_POPULAR_SEARCHES = [
  "Getting Started",
  "Submit Complaint",
  "AQI",
  "2FA",
  "GreenGuard Intelligence Center",
  "Smart Maps",
  "Reports",
  "Command Center",
  "Dashboard",
  "Sensor Data",
];
