import type { ComponentType, CSSProperties } from "react";
import {
  BookOpen, User, ShieldCheck, Settings, LayoutDashboard,
  Sparkles, Leaf, Map, FileText, Shield, HelpCircle, CloudSun,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface KbCategory {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  accentColor: string;
  articleCount: number;
  lastUpdated: string;
  featured?: boolean;
}

export interface KbArticle {
  id: string;
  categoryId: string;
  title: string;
  excerpt: string;
  content: KbSection[];
  readTime: string;
  difficulty: Difficulty;
  views: number;
  updatedAt: string;
  author: string;
  tags: string[];
  relatedIds: string[];
  featured?: boolean;
}

export interface KbSection {
  type: "heading" | "paragraph" | "list" | "callout" | "code" | "image";
  level?: 1 | 2 | 3;
  text?: string;
  items?: string[];
  variant?: "info" | "warning" | "success" | "danger";
  language?: string;
  alt?: string;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export const KB_CATEGORIES: KbCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Account setup, first steps, and orientation for new users",
    icon: BookOpen,
    accentColor: "var(--color-primary)",
    articleCount: 12,
    lastUpdated: "2 days ago",
    featured: true,
  },
  {
    id: "citizen-portal",
    title: "Citizen Portal",
    description: "Submit complaints, track reports, and view local environmental alerts",
    icon: User,
    accentColor: "var(--color-info)",
    articleCount: 9,
    lastUpdated: "4 days ago",
    featured: true,
  },
  {
    id: "authority-portal",
    title: "Authority Portal",
    description: "Command center, complaint management, and enforcement tools",
    icon: ShieldCheck,
    accentColor: "var(--color-warning)",
    articleCount: 14,
    lastUpdated: "1 day ago",
    featured: true,
  },
  {
    id: "administrator-portal",
    title: "Administrator Portal",
    description: "Platform governance, user management, and city configuration",
    icon: Settings,
    accentColor: "var(--color-destructive)",
    articleCount: 10,
    lastUpdated: "3 days ago",
    featured: true,
  },
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Environmental metrics, widgets, and real-time data panels",
    icon: LayoutDashboard,
    accentColor: "var(--color-primary)",
    articleCount: 11,
    lastUpdated: "5 days ago",
  },
  {
    id: "ai-copilot",
    title: "AI Copilot",
    description: "Natural language queries, AI briefs, and smart analysis",
    icon: Sparkles,
    accentColor: "var(--color-info)",
    articleCount: 7,
    lastUpdated: "1 week ago",
  },
  {
    id: "environmental-monitoring",
    title: "Environmental Monitoring",
    description: "Sensor networks, AQI thresholds, and pollution tracking",
    icon: CloudSun,
    accentColor: "var(--color-success)",
    articleCount: 13,
    lastUpdated: "3 days ago",
  },
  {
    id: "smart-maps",
    title: "Smart Maps",
    description: "GIS layers, air quality overlays, and hazard intelligence",
    icon: Map,
    accentColor: "var(--color-primary)",
    articleCount: 8,
    lastUpdated: "6 days ago",
  },
  {
    id: "reports",
    title: "Reports",
    description: "Generate, export, and schedule environmental reports",
    icon: FileText,
    accentColor: "var(--color-warning)",
    articleCount: 7,
    lastUpdated: "1 week ago",
  },
  {
    id: "sustainability",
    title: "Sustainability",
    description: "ESG tracking, sustainability scores, and green initiatives",
    icon: Leaf,
    accentColor: "var(--color-success)",
    articleCount: 6,
    lastUpdated: "2 weeks ago",
  },
  {
    id: "security",
    title: "Security",
    description: "Two-factor authentication, session management, and data privacy",
    icon: Shield,
    accentColor: "var(--color-destructive)",
    articleCount: 9,
    lastUpdated: "5 days ago",
  },
  {
    id: "settings",
    title: "Settings",
    description: "Profile customization, notification preferences, 2FA, and system settings",
    icon: Settings,
    accentColor: "var(--color-primary)",
    articleCount: 8,
    lastUpdated: "3 days ago",
  },
  {
    id: "faq",
    title: "FAQ",
    description: "Frequently asked questions and quick answers for common issues",
    icon: HelpCircle,
    accentColor: "var(--color-muted-foreground)",
    articleCount: 18,
    lastUpdated: "1 day ago",
  },
];

// ─── Articles ─────────────────────────────────────────────────────────────────

export const KB_ARTICLES: KbArticle[] = [
  // ── Getting Started ───────────────────────────────────────────────────────
  {
    id: "gs-001",
    categoryId: "getting-started",
    title: "Welcome to GreenGuard AI — Platform Overview",
    excerpt: "A comprehensive introduction to GreenGuard AI: what it is, who it's for, and how to get the most from the platform from day one.",
    readTime: "6 min read",
    difficulty: "Beginner",
    views: 12840,
    updatedAt: "2 days ago",
    author: "GreenGuard Team",
    tags: ["intro", "overview", "onboarding"],
    relatedIds: ["gs-002", "gs-003", "faq-001"],
    featured: true,
    content: [
      { type: "paragraph", text: "GreenGuard AI is an enterprise environmental intelligence platform designed for municipalities, regulatory authorities, and engaged citizens. It brings together real-time sensor data, AI-powered analysis, and collaborative workflows into a single, accessible interface." },
      { type: "heading", level: 2, text: "Who is GreenGuard for?" },
      { type: "list", items: ["Citizens who want to report pollution or monitor local air quality", "Environmental authorities managing complaints and enforcement", "Administrators governing platform users, cities, and data policies"] },
      { type: "heading", level: 2, text: "Core Platform Modules" },
      { type: "paragraph", text: "The platform is organized into several interconnected modules, each designed for a specific role and workflow." },
      { type: "list", items: ["Dashboard — Environmental KPIs, live sensor feeds, and trend analysis", "Smart Maps — GIS-based overlays for AQI, pollution, and hazard zones", "AI Copilot — Natural language environmental queries and automated briefs", "Citizen Portal — Complaint submission and tracking", "Authority Command Center — Alert triage and enforcement coordination", "Reports — Scheduled and ad-hoc PDF/CSV export"] },
      { type: "callout", variant: "info", text: "Your role determines which modules and features are available. Contact your platform administrator if you need access to additional areas." },
      { type: "heading", level: 2, text: "Getting Help" },
      { type: "paragraph", text: "This Help Center is your primary resource for guides, tutorials, and troubleshooting. For real-time support, use the Support Center or reach out to your platform administrator." },
    ],
  },
  {
    id: "gs-002",
    categoryId: "getting-started",
    title: "Creating Your Account and Setting Up Your Profile",
    excerpt: "Step-by-step guide to creating your GreenGuard account, verifying your email, configuring your profile, and setting up two-factor authentication.",
    readTime: "4 min read",
    difficulty: "Beginner",
    views: 8921,
    updatedAt: "1 week ago",
    author: "GreenGuard Team",
    tags: ["account", "profile", "setup", "2fa"],
    relatedIds: ["gs-001", "sec-001", "gs-003"],
    featured: true,
    content: [
      { type: "paragraph", text: "Setting up your GreenGuard account takes just a few minutes. This guide walks you through each step so you can hit the ground running." },
      { type: "heading", level: 2, text: "Step 1: Create Your Account" },
      { type: "list", items: ["Navigate to the signup page and enter your email address", "Choose a strong password (minimum 12 characters recommended)", "Accept the Terms of Service and Privacy Policy", "Click Create Account"] },
      { type: "heading", level: 2, text: "Step 2: Verify Your Email" },
      { type: "paragraph", text: "After signing up, GreenGuard will send a verification email. Click the link in the email within 24 hours. If you don't receive it, check your spam folder or request a new verification email from the login page." },
      { type: "heading", level: 2, text: "Step 3: Complete Your Profile" },
      { type: "paragraph", text: "Once verified, you'll be prompted to complete your profile. Fill in your display name, organization, and optionally upload a profile photo using the built-in photo cropper." },
      { type: "callout", variant: "success", text: "Tip: A complete profile helps authorities identify your complaints and responses more effectively." },
      { type: "heading", level: 2, text: "Step 4: Enable Two-Factor Authentication" },
      { type: "paragraph", text: "We strongly recommend enabling 2FA for your account. Navigate to Settings → Security and follow the prompts to link your authenticator app." },
    ],
  },
  {
    id: "gs-003",
    categoryId: "getting-started",
    title: "Navigating the GreenGuard Dashboard",
    excerpt: "Learn how to navigate the dashboard, customize your widget layout, interpret environmental indicators, and set up your personal preferences.",
    readTime: "5 min read",
    difficulty: "Beginner",
    views: 7654,
    updatedAt: "3 days ago",
    author: "GreenGuard Team",
    tags: ["dashboard", "navigation", "widgets"],
    relatedIds: ["gs-001", "dash-001", "gs-002"],
    featured: false,
    content: [
      { type: "paragraph", text: "The GreenGuard Dashboard is your mission control for environmental monitoring. Here's how to get oriented." },
      { type: "heading", level: 2, text: "Dashboard Layout" },
      { type: "paragraph", text: "The dashboard is divided into the main content area (KPI widgets, charts, and data feeds) and the sidebar navigation. The header provides quick access to search, notifications, and your profile." },
      { type: "heading", level: 2, text: "Key Widgets" },
      { type: "list", items: ["AQI Overview — Current air quality index for your city", "Active Complaints — Number of open environmental complaints", "Sensor Network — Live status of all monitoring sensors", "Recent Alerts — Latest environmental threshold breaches"] },
      { type: "callout", variant: "warning", text: "Dashboard data refreshes every 5 minutes. If you see stale data, use the manual refresh button in the top right." },
    ],
  },

  // ── Citizen Portal ────────────────────────────────────────────────────────
  {
    id: "cit-001",
    categoryId: "citizen-portal",
    title: "How to Submit an Environmental Complaint",
    excerpt: "Complete walkthrough for submitting pollution complaints, attaching photo evidence, choosing the right complaint category, and tracking your submission.",
    readTime: "5 min read",
    difficulty: "Beginner",
    views: 9102,
    updatedAt: "4 days ago",
    author: "GreenGuard Team",
    tags: ["complaint", "pollution", "report", "citizen"],
    relatedIds: ["cit-002", "cit-003", "gs-001"],
    featured: true,
    content: [
      { type: "paragraph", text: "Submitting a complaint is the most direct way citizens can flag environmental issues in their community. GreenGuard routes your complaint to the responsible authority and keeps you updated on its status." },
      { type: "heading", level: 2, text: "Before You Submit" },
      { type: "paragraph", text: "Gather as much detail as possible: the exact location, time of incident, type of pollution, and any photographic evidence. More detail helps authorities respond faster." },
      { type: "heading", level: 2, text: "Submitting the Complaint" },
      { type: "list", items: ["Navigate to Citizen Portal → New Complaint", "Select the pollution type (Air, Water, Noise, Soil, or Other)", "Pin the location on the map or enter an address", "Describe the incident in the details field", "Attach photos or videos (optional but strongly recommended)", "Review and submit"] },
      { type: "callout", variant: "info", text: "Complaints are reviewed by environmental authorities within 48 hours on business days. Urgent issues may be escalated faster." },
      { type: "heading", level: 2, text: "Tracking Your Complaint" },
      { type: "paragraph", text: "After submission, you'll receive a complaint ID and can track status in Citizen Portal → My Complaints. You'll receive notifications when the status changes or the authority adds a comment." },
    ],
  },
  {
    id: "cit-002",
    categoryId: "citizen-portal",
    title: "Understanding Your Local Air Quality Index",
    excerpt: "A plain-language guide to what AQI means, how GreenGuard calculates it, what each color band indicates, and when to take protective action.",
    readTime: "7 min read",
    difficulty: "Beginner",
    views: 11203,
    updatedAt: "1 week ago",
    author: "GreenGuard Team",
    tags: ["AQI", "air quality", "health", "monitoring"],
    relatedIds: ["env-001", "env-002", "cit-001"],
    featured: true,
    content: [
      { type: "paragraph", text: "The Air Quality Index (AQI) is a standardized scale used worldwide to communicate how clean or polluted the air is and what health effects might be a concern." },
      { type: "heading", level: 2, text: "AQI Scale" },
      { type: "list", items: ["0–50 (Good) — Air quality is satisfactory and poses little or no health risk", "51–100 (Moderate) — Acceptable for most, but sensitive individuals should limit prolonged outdoor exertion", "101–150 (Unhealthy for Sensitive Groups) — At-risk groups should reduce outdoor activity", "151–200 (Unhealthy) — Everyone may begin to experience health effects", "201–300 (Very Unhealthy) — Health alert — everyone should avoid prolonged outdoor exposure", "301+ (Hazardous) — Emergency conditions — remain indoors"] },
      { type: "callout", variant: "warning", text: "GreenGuard AQI is calculated from a blend of local sensor readings and satellite data. There may be a 15–30 minute lag versus real-world conditions." },
      { type: "heading", level: 2, text: "Setting Up AQI Alerts" },
      { type: "paragraph", text: "You can configure personal AQI alerts in Settings → Notifications. Choose the threshold that triggers a push notification or email." },
    ],
  },
  {
    id: "cit-003",
    categoryId: "citizen-portal",
    title: "Viewing Nearby Sensor Readings and Environmental Alerts",
    excerpt: "How to use the map view to find nearby monitoring stations, interpret real-time sensor readings, and subscribe to location-based environmental alerts.",
    readTime: "4 min read",
    difficulty: "Beginner",
    views: 5430,
    updatedAt: "5 days ago",
    author: "GreenGuard Team",
    tags: ["sensors", "alerts", "map", "monitoring"],
    relatedIds: ["cit-002", "map-001", "env-001"],
    featured: false,
    content: [
      { type: "paragraph", text: "GreenGuard's sensor network provides real-time environmental data across your city. You can explore this data directly from the Citizen Portal or the Smart Maps module." },
      { type: "heading", level: 2, text: "Finding Nearby Sensors" },
      { type: "list", items: ["Open the Smart Maps module from the sidebar", "Enable the Sensor Layer in the map controls", "Blue dots represent active monitoring stations", "Click any dot to see current readings for PM2.5, PM10, NO2, SO2, O3, and CO"] },
    ],
  },

  // ── Authority Portal ──────────────────────────────────────────────────────
  {
    id: "auth-001",
    categoryId: "authority-portal",
    title: "Authority Command Center: Managing Alerts and Dispatching",
    excerpt: "Complete walkthrough of the Command Center — triaging incoming alerts, assigning complaints to officers, escalating critical events, and tracking resolution.",
    readTime: "8 min read",
    difficulty: "Intermediate",
    views: 4210,
    updatedAt: "1 day ago",
    author: "GreenGuard Team",
    tags: ["command center", "alerts", "dispatch", "authority"],
    relatedIds: ["auth-002", "auth-003", "gs-001"],
    featured: true,
    content: [
      { type: "paragraph", text: "The Authority Command Center is the operational hub for environmental enforcement teams. It aggregates incoming complaints, sensor alerts, and AI-flagged events into a unified triage interface." },
      { type: "heading", level: 2, text: "Alert Triage Queue" },
      { type: "paragraph", text: "Incoming alerts are displayed in the triage queue, sorted by severity (Critical → High → Medium → Low). Each alert card shows the type, location, current AQI/pollutant level, and time since flagged." },
      { type: "callout", variant: "danger", text: "Critical alerts (AQI > 300 or confirmed industrial spill events) should be escalated within 15 minutes per compliance requirements." },
      { type: "heading", level: 2, text: "Assigning Complaints" },
      { type: "list", items: ["Click any complaint card to open the detail drawer", "Use the Assign Officer dropdown to route the complaint", "Set a target resolution date", "Add internal notes visible only to authority staff", "Click Confirm Assignment"] },
      { type: "heading", level: 2, text: "Escalation Workflow" },
      { type: "paragraph", text: "If a complaint cannot be resolved at field level, use the Escalate button to route it to the senior authority tier. Escalated complaints trigger notifications to supervisors." },
    ],
  },
  {
    id: "auth-002",
    categoryId: "authority-portal",
    title: "Generating Environmental Enforcement Reports",
    excerpt: "How to create, schedule, and export enforcement activity reports — including case summaries, resolution rates, and officer performance metrics.",
    readTime: "6 min read",
    difficulty: "Intermediate",
    views: 2890,
    updatedAt: "3 days ago",
    author: "GreenGuard Team",
    tags: ["reports", "enforcement", "export", "authority"],
    relatedIds: ["auth-001", "rep-001", "rep-002"],
    featured: false,
    content: [
      { type: "paragraph", text: "The Reports module allows authority users to generate detailed enforcement summaries, export data for regulatory submissions, and schedule recurring reports." },
      { type: "heading", level: 2, text: "Creating a Report" },
      { type: "list", items: ["Navigate to Reports from the sidebar", "Click New Report and select Authority Enforcement Summary", "Set the date range and scope (city-wide or by district)", "Choose output format: PDF, CSV, or XLSX", "Click Generate"] },
    ],
  },
  {
    id: "auth-003",
    categoryId: "authority-portal",
    title: "Managing Authority Profile and Permissions",
    excerpt: "Configure your authority profile, understand your permission scope, and learn how to request additional access from your platform administrator.",
    readTime: "4 min read",
    difficulty: "Beginner",
    views: 1980,
    updatedAt: "1 week ago",
    author: "GreenGuard Team",
    tags: ["profile", "permissions", "authority", "settings"],
    relatedIds: ["auth-001", "admin-001", "sec-001"],
    featured: false,
    content: [
      { type: "paragraph", text: "Authority users have a role-scoped permission model. Your profile determines which cities, complaint types, and reports you can access." },
      { type: "heading", level: 2, text: "Viewing Your Permissions" },
      { type: "paragraph", text: "Navigate to Profile → Permissions to see a summary of your current access rights. If you need additional permissions, contact your Platform Administrator." },
    ],
  },

  // ── Environmental Monitoring ───────────────────────────────────────────────
  {
    id: "env-001",
    categoryId: "environmental-monitoring",
    title: "Understanding GreenGuard's Sensor Network",
    excerpt: "How GreenGuard's distributed IoT sensor network works, what pollutants are measured, sensor calibration schedules, and data accuracy standards.",
    readTime: "8 min read",
    difficulty: "Intermediate",
    views: 6701,
    updatedAt: "3 days ago",
    author: "GreenGuard Team",
    tags: ["sensors", "IoT", "monitoring", "accuracy"],
    relatedIds: ["env-002", "map-001", "cit-002"],
    featured: true,
    content: [
      { type: "paragraph", text: "GreenGuard's sensor network is the backbone of the platform. Hundreds of IoT devices distributed across city districts continuously measure environmental conditions and transmit data to the GreenGuard cloud." },
      { type: "heading", level: 2, text: "What We Measure" },
      { type: "list", items: ["PM2.5 — Fine particulate matter (most harmful air pollutant)", "PM10 — Coarse particulate matter", "NO2 — Nitrogen dioxide (traffic and industrial emissions)", "SO2 — Sulfur dioxide (industrial combustion)", "O3 — Ground-level ozone", "CO — Carbon monoxide", "Temperature and Relative Humidity"] },
      { type: "callout", variant: "info", text: "All sensor data is validated against a reference station network. Readings that deviate more than 15% from nearby reference stations are flagged and excluded from AQI calculations." },
      { type: "heading", level: 2, text: "Sensor Accuracy and Calibration" },
      { type: "paragraph", text: "Sensors are calibrated quarterly by certified technicians. Between calibrations, a software drift-correction algorithm continuously adjusts readings based on reference station comparisons." },
    ],
  },
  {
    id: "env-002",
    categoryId: "environmental-monitoring",
    title: "Configuring AQI Alert Thresholds",
    excerpt: "How to set up custom AQI and pollutant alert thresholds for your city or district, including notification channels and escalation rules.",
    readTime: "5 min read",
    difficulty: "Intermediate",
    views: 3402,
    updatedAt: "5 days ago",
    author: "GreenGuard Team",
    tags: ["AQI", "alerts", "thresholds", "configuration"],
    relatedIds: ["env-001", "cit-002", "auth-001"],
    featured: false,
    content: [
      { type: "paragraph", text: "Alert thresholds determine when GreenGuard sends notifications to users, authorities, and administrators. Proper configuration ensures the right people are alerted at the right time without alert fatigue." },
      { type: "heading", level: 2, text: "Threshold Types" },
      { type: "list", items: ["AQI Category Breach — Trigger when AQI crosses a category boundary (e.g., Good → Moderate)", "Absolute Value — Trigger when a specific pollutant exceeds a set concentration", "Rate of Change — Trigger when a value rises faster than a defined rate per hour", "Duration — Trigger when a condition persists beyond a set time window"] },
    ],
  },

  // ── Smart Maps ────────────────────────────────────────────────────────────
  {
    id: "map-001",
    categoryId: "smart-maps",
    title: "Getting Started with Smart Maps",
    excerpt: "Introduction to the Smart Maps module: map layers, navigation controls, sensor overlays, complaint pins, and hazard intelligence layers.",
    readTime: "5 min read",
    difficulty: "Beginner",
    views: 5801,
    updatedAt: "6 days ago",
    author: "GreenGuard Team",
    tags: ["maps", "GIS", "layers", "navigation"],
    relatedIds: ["map-002", "env-001", "cit-003"],
    featured: true,
    content: [
      { type: "paragraph", text: "The Smart Maps module gives you a geographic view of all environmental data: sensor readings, complaints, alerts, and hazard zones displayed directly on an interactive map." },
      { type: "heading", level: 2, text: "Available Layers" },
      { type: "list", items: ["AQI Heatmap — Color-coded air quality intensity across the city", "Sensor Network — Location and live status of all monitoring devices", "Complaint Pins — Open and resolved complaints mapped by location", "Wildfire Risk — AI-predicted high-risk zones updated daily", "Flood Zones — FEMA-integrated flood risk mapping", "Industrial Hazards — Registered industrial facilities and their compliance status"] },
      { type: "callout", variant: "warning", text: "Hazard layer data is updated daily. For real-time emergency response, always cross-reference with official emergency management sources." },
    ],
  },
  {
    id: "map-002",
    categoryId: "smart-maps",
    title: "Advanced Map Layers: GIS Configuration",
    excerpt: "Configure custom GIS data sources, adjust layer opacity, create saved map views, and export map screenshots for reports.",
    readTime: "7 min read",
    difficulty: "Advanced",
    views: 2104,
    updatedAt: "2 weeks ago",
    author: "GreenGuard Team",
    tags: ["GIS", "layers", "advanced", "export"],
    relatedIds: ["map-001", "rep-001"],
    featured: false,
    content: [
      { type: "paragraph", text: "Advanced GIS configuration allows administrators and authority users to integrate custom data sources, fine-tune layer rendering, and create persistent map views for team use." },
      { type: "heading", level: 2, text: "Connecting a Custom GIS Source" },
      { type: "list", items: ["Navigate to Smart Maps → Layer Manager", "Click Add Custom Layer", "Enter the WMS/WFS endpoint URL", "Configure authentication if required", "Set the layer name and default opacity", "Click Connect and Verify"] },
      { type: "callout", variant: "info", text: "Custom GIS sources must be publicly accessible or reachable from GreenGuard's server IPs. Contact support for IP whitelisting assistance." },
    ],
  },

  // ── AI Copilot ────────────────────────────────────────────────────────────
  {
    id: "ai-001",
    categoryId: "ai-copilot",
    title: "Using the AI Copilot for Environmental Analysis",
    excerpt: "Learn how to query the AI Copilot in natural language, interpret AI-generated analysis, generate daily briefs, and use smart recommendations.",
    readTime: "6 min read",
    difficulty: "Beginner",
    views: 7890,
    updatedAt: "1 week ago",
    author: "GreenGuard Team",
    tags: ["AI", "copilot", "analysis", "natural language"],
    relatedIds: ["ai-002", "env-001", "dash-001"],
    featured: true,
    content: [
      { type: "paragraph", text: "The AI Copilot is a conversational assistant powered by large language models, grounded in GreenGuard's real-time environmental data. You can ask it questions, request analysis, or generate reports in plain English." },
      { type: "heading", level: 2, text: "Example Queries" },
      { type: "list", items: ["\"What's the air quality trend in District 4 over the past week?\"", "\"Which three areas have the highest complaint volume this month?\"", "\"Generate a daily environmental brief for the city council.\"", "\"Which sensors are underperforming and need maintenance?\""] },
      { type: "callout", variant: "info", text: "The AI Copilot draws on data up to 30 minutes ago. For real-time sensor values, use the Dashboard or Smart Maps directly." },
      { type: "heading", level: 2, text: "Generating the Daily Brief" },
      { type: "paragraph", text: "Click the Daily Brief button in the Copilot sidebar to generate a formatted executive summary of the previous 24 hours. The brief includes AQI trends, notable events, and complaint volume." },
    ],
  },
  {
    id: "ai-002",
    categoryId: "ai-copilot",
    title: "AI Copilot Data Sources and Limitations",
    excerpt: "Understand what data the AI Copilot can and cannot access, how its responses are grounded, and best practices for getting accurate results.",
    readTime: "5 min read",
    difficulty: "Intermediate",
    views: 3201,
    updatedAt: "2 weeks ago",
    author: "GreenGuard Team",
    tags: ["AI", "data sources", "accuracy", "limitations"],
    relatedIds: ["ai-001", "env-001"],
    featured: false,
    content: [
      { type: "paragraph", text: "The AI Copilot is designed to give accurate, grounded responses — but like all AI systems, it has limitations you should be aware of." },
      { type: "heading", level: 2, text: "What the Copilot Can Access" },
      { type: "list", items: ["Real-time and historical sensor data (with up to 30-min lag)", "Complaint records within your permission scope", "Environmental alerts and threshold breach logs", "Published GreenGuard documentation and guidelines"] },
      { type: "heading", level: 2, text: "What It Cannot Access" },
      { type: "list", items: ["Personal user data outside your permission scope", "External databases not connected to GreenGuard", "Information more recent than ~30 minutes"] },
      { type: "callout", variant: "warning", text: "Always verify AI-generated summaries against source data before using them in official reports or regulatory submissions." },
    ],
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  {
    id: "rep-001",
    categoryId: "reports",
    title: "Generating Your First Environmental Report",
    excerpt: "Step-by-step guide to creating, configuring, and exporting an environmental report in PDF, CSV, or XLSX format.",
    readTime: "5 min read",
    difficulty: "Beginner",
    views: 4560,
    updatedAt: "1 week ago",
    author: "GreenGuard Team",
    tags: ["reports", "export", "PDF", "CSV"],
    relatedIds: ["rep-002", "auth-002"],
    featured: false,
    content: [
      { type: "paragraph", text: "The Reports module makes it easy to generate standardized environmental reports for regulatory submissions, internal review, or public disclosure." },
      { type: "heading", level: 2, text: "Report Types" },
      { type: "list", items: ["AQI Summary — Daily or weekly air quality averages by district", "Complaint Activity — Volume, resolution rate, and category breakdown", "Sensor Performance — Uptime, drift, and calibration status", "Authority Enforcement — Case outcomes and officer activity", "Custom Report — Build your own with the drag-and-drop report builder"] },
    ],
  },
  {
    id: "rep-002",
    categoryId: "reports",
    title: "Scheduling Automated Reports",
    excerpt: "Configure recurring report schedules, set delivery channels (email, Slack, or download), and manage your report queue.",
    readTime: "4 min read",
    difficulty: "Intermediate",
    views: 2301,
    updatedAt: "2 weeks ago",
    author: "GreenGuard Team",
    tags: ["reports", "scheduling", "automation", "email"],
    relatedIds: ["rep-001", "auth-002"],
    featured: false,
    content: [
      { type: "paragraph", text: "Automated scheduling ensures key stakeholders receive timely environmental summaries without manual effort." },
      { type: "heading", level: 2, text: "Creating a Schedule" },
      { type: "list", items: ["Open any report and click Schedule", "Choose frequency: Daily, Weekly, or Monthly", "Set the delivery time and timezone", "Add email recipients or Slack channel webhook", "Click Activate Schedule"] },
    ],
  },

  // ── Security ──────────────────────────────────────────────────────────────
  {
    id: "sec-001",
    categoryId: "security",
    title: "Setting Up Two-Factor Authentication",
    excerpt: "A complete guide to enabling 2FA on your GreenGuard account, using an authenticator app, generating backup codes, and recovering access if you lose your device.",
    readTime: "5 min read",
    difficulty: "Beginner",
    views: 6120,
    updatedAt: "5 days ago",
    author: "GreenGuard Team",
    tags: ["2FA", "security", "authentication", "password"],
    relatedIds: ["gs-002", "sec-002"],
    featured: true,
    content: [
      { type: "paragraph", text: "Two-factor authentication (2FA) adds a critical extra layer of security to your account. Even if your password is compromised, an attacker cannot access your account without the second factor." },
      { type: "heading", level: 2, text: "Supported 2FA Methods" },
      { type: "list", items: ["Authenticator App (recommended) — TOTP-compatible apps like Authy or Google Authenticator", "SMS — One-time codes sent to your verified phone number (less secure)", "Backup Codes — One-time emergency codes for account recovery"] },
      { type: "heading", level: 2, text: "Enabling Authenticator App 2FA" },
      { type: "list", items: ["Navigate to Settings → Security → Two-Factor Authentication", "Click Enable and choose Authenticator App", "Scan the QR code with your authenticator app", "Enter the 6-digit code to verify setup", "Save your backup codes in a secure location"] },
      { type: "callout", variant: "danger", text: "Store backup codes offline — they are the only way to regain access if you lose your authenticator device. GreenGuard support cannot bypass 2FA." },
    ],
  },
  {
    id: "sec-002",
    categoryId: "security",
    title: "Understanding Session Management and Timeouts",
    excerpt: "How GreenGuard manages user sessions, idle timeout policies, active session monitoring, and how to remotely revoke sessions from other devices.",
    readTime: "4 min read",
    difficulty: "Intermediate",
    views: 2890,
    updatedAt: "4 days ago",
    author: "GreenGuard Team",
    tags: ["sessions", "security", "timeout", "access"],
    relatedIds: ["sec-001", "gs-002"],
    featured: false,
    content: [
      { type: "paragraph", text: "GreenGuard maintains security through automatic session management. Understanding how sessions work helps you stay secure, especially on shared devices." },
      { type: "heading", level: 2, text: "Session Policy" },
      { type: "list", items: ["Sessions expire after 60 minutes of inactivity", "Maximum session duration is 12 hours (even with activity)", "Each login from a new device creates a separate session", "You can view and revoke active sessions in Settings → Security → Sessions"] },
    ],
  },

  // ── FAQ ───────────────────────────────────────────────────────────────────
  {
    id: "faq-001",
    categoryId: "faq",
    title: "Why can't I log in to my account?",
    excerpt: "Common causes of login failures and how to resolve them: forgotten passwords, locked accounts, 2FA issues, and email verification.",
    readTime: "3 min read",
    difficulty: "Beginner",
    views: 14021,
    updatedAt: "1 day ago",
    author: "GreenGuard Team",
    tags: ["login", "password", "access", "troubleshooting"],
    relatedIds: ["gs-002", "sec-001", "faq-002"],
    featured: true,
    content: [
      { type: "paragraph", text: "If you're unable to log in, one of the following issues is most likely the cause." },
      { type: "heading", level: 2, text: "Common Causes" },
      { type: "list", items: ["Incorrect password — Use the Forgot Password link to reset it", "Email not verified — Check your inbox for a verification email", "2FA device lost — Use a backup code from your secure storage", "Account locked — After 5 failed attempts, accounts are locked for 30 minutes", "Account deactivated — Contact your platform administrator"] },
      { type: "callout", variant: "info", text: "If none of these apply, try clearing your browser cache or using a different browser. If the issue persists, contact support." },
    ],
  },
  {
    id: "faq-002",
    categoryId: "faq",
    title: "How do I reset my password?",
    excerpt: "Step-by-step password reset instructions for both logged-in users and users locked out of their accounts.",
    readTime: "2 min read",
    difficulty: "Beginner",
    views: 11340,
    updatedAt: "1 day ago",
    author: "GreenGuard Team",
    tags: ["password", "reset", "access", "login"],
    relatedIds: ["faq-001", "gs-002", "sec-001"],
    featured: false,
    content: [
      { type: "paragraph", text: "Resetting your GreenGuard password is straightforward whether you're logged in or locked out." },
      { type: "heading", level: 2, text: "If You're Logged In" },
      { type: "list", items: ["Go to Settings → Security → Password", "Enter your current password and choose a new one", "Click Update Password"] },
      { type: "heading", level: 2, text: "If You're Locked Out" },
      { type: "list", items: ["Click Forgot Password on the login page", "Enter the email address linked to your account", "Check your email for a reset link (valid for 1 hour)", "Follow the link and set a new password"] },
    ],
  },
  {
    id: "faq-003",
    categoryId: "faq",
    title: "How is my data stored and protected?",
    excerpt: "GreenGuard's data storage practices, encryption standards, data retention policies, GDPR compliance, and how to request data export or deletion.",
    readTime: "6 min read",
    difficulty: "Intermediate",
    views: 4210,
    updatedAt: "2 weeks ago",
    author: "GreenGuard Team",
    tags: ["privacy", "data", "GDPR", "security", "encryption"],
    relatedIds: ["sec-001", "faq-001"],
    featured: false,
    content: [
      { type: "paragraph", text: "GreenGuard takes data security and privacy seriously. Here's how we protect your information." },
      { type: "heading", level: 2, text: "Encryption" },
      { type: "list", items: ["All data is encrypted in transit using TLS 1.3", "Sensitive fields (passwords, tokens) are hashed with bcrypt", "Database storage is encrypted at rest using AES-256", "Backups are encrypted and stored in geographically separate regions"] },
      { type: "heading", level: 2, text: "GDPR Compliance" },
      { type: "paragraph", text: "GreenGuard is GDPR-compliant. You have the right to request a copy of your data, correct inaccuracies, or request deletion. Navigate to Settings → Privacy → Data Requests to submit a request." },
    ],
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  {
    id: "dash-001",
    categoryId: "dashboard",
    title: "Customizing Your Dashboard Layout",
    excerpt: "How to add, remove, resize, and rearrange dashboard widgets to create a personalized environmental monitoring workspace.",
    readTime: "4 min read",
    difficulty: "Beginner",
    views: 5401,
    updatedAt: "1 week ago",
    author: "GreenGuard Team",
    tags: ["dashboard", "widgets", "customization", "layout"],
    relatedIds: ["gs-003", "dash-002"],
    featured: false,
    content: [
      { type: "paragraph", text: "Your GreenGuard dashboard can be fully customized to show the data most relevant to your role and workflow." },
      { type: "heading", level: 2, text: "Entering Edit Mode" },
      { type: "list", items: ["Click the Edit Layout button in the top-right of the dashboard", "Drag widgets to reorder them", "Resize widgets by dragging the bottom-right corner", "Click the X on any widget to remove it", "Click Add Widget to browse the widget library"] },
    ],
  },
  {
    id: "dash-002",
    categoryId: "dashboard",
    title: "Understanding Dashboard Metrics and KPIs",
    excerpt: "What each dashboard KPI means, how it's calculated, which data sources feed it, and how to interpret trends and anomalies.",
    readTime: "7 min read",
    difficulty: "Intermediate",
    views: 3890,
    updatedAt: "2 weeks ago",
    author: "GreenGuard Team",
    tags: ["dashboard", "metrics", "KPI", "analytics"],
    relatedIds: ["dash-001", "env-001"],
    featured: false,
    content: [
      { type: "paragraph", text: "Each KPI on the GreenGuard dashboard is backed by a specific calculation and data source. Understanding how metrics are derived helps you interpret them correctly." },
      { type: "heading", level: 2, text: "Core KPIs" },
      { type: "list", items: ["City AQI — Average of all active sensor readings, weighted by population density", "Active Complaints — Count of unresolved complaints in the system", "Sensor Network Health — Percentage of sensors reporting within the last 15 minutes", "Alert Response Time — Average time from alert creation to authority acknowledgement"] },
    ],
  },
];

// ─── Derived lookups ──────────────────────────────────────────────────────────

export const KB_ARTICLES_BY_ID = Object.fromEntries(
  KB_ARTICLES.map(a => [a.id, a]),
);

export const KB_CATEGORIES_BY_ID = Object.fromEntries(
  KB_CATEGORIES.map(c => [c.id, c]),
);

export const KB_ARTICLES_BY_CATEGORY = KB_CATEGORIES.reduce<
  Record<string, KbArticle[]>
>((acc, cat) => {
  acc[cat.id] = KB_ARTICLES.filter(a => a.categoryId === cat.id);
  return acc;
}, {});

export const DIFFICULTY_ORDER: Record<Difficulty, number> = {
  Beginner: 0,
  Intermediate: 1,
  Advanced: 2,
};

export const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  Beginner: "var(--color-success)",
  Intermediate: "var(--color-warning)",
  Advanced: "var(--color-destructive)",
};

export const POPULAR_SEARCH_CHIPS = [
  "Dashboard",
  "AI Copilot",
  "Pollution Reports",
  "Smart Maps",
  "Complaint Tracking",
  "Sustainability",
  "Authority Portal",
  "Citizen Portal",
];
