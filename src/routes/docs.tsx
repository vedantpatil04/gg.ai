import { createFileRoute, Link } from "@tanstack/react-router";
import { InfoPageShell, Prose, CTABlock } from "@/components/landing/InfoPageShell";
import {
  BookOpen,
  Code2,
  Cpu,
  Database,
  Shield,
  Zap,
  ArrowUpRight,
  Activity,
  CloudRain,
  Map,
  Leaf,
  FileBarChart,
  Users,
  CheckCircle2,
  Layers,
  Lock,
  Sliders,
  MessageSquare,
  AlertTriangle,
  Server,
  Workflow,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — GreenGuard AI" },
      {
        name: "description",
        content:
          "Explore the platform architecture, environmental intelligence workflows, AI capabilities, and implementation patterns behind GreenGuard AI.",
      },
      { property: "og:title", content: "Documentation — GreenGuard AI" },
      {
        property: "og:description",
        content:
          "Architecture, workflows, modules, and API reference for the GreenGuard AI environmental platform.",
      },
    ],
  }),
  component: DocsPage,
});

const GETTING_STARTED_GUIDES = [
  {
    icon: Activity,
    t: "Explore the Dashboard",
    d: "Understand current environmental conditions, active alerts, and key environmental indicators across monitored cities.",
    to: "/dashboard",
  },
  {
    icon: Leaf,
    t: "Explore Environmental Intelligence",
    d: "View pollutant measurements (PM2.5, PM10, NO2, O3, SO2, CO), historical trends, and AI-assisted insights.",
    to: "/environment",
  },
  {
    icon: MessageSquare,
    t: "Submit a Citizen Complaint",
    d: "Report environmental issues like garbage burning, water contamination, or smoke with photo evidence.",
    to: "/citizen",
  },
  {
    icon: Shield,
    t: "Manage Complaints",
    d: "Understand how administrators review, verify validity, prioritize, and assign complaints to departments.",
    to: "/admin",
  },
  {
    icon: Users,
    t: "Investigate as Authority",
    d: "Learn how authority personnel receive assigned complaints, conduct investigations, and submit resolution details.",
    to: "/citizen",
  },
  {
    icon: CloudRain,
    t: "Explore Forecast & Sustainability",
    d: "Review 7-day weather and air quality forecasting, city EcoScore metrics, and run policy impact simulations.",
    to: "/forecast",
  },
] as const;

const CORE_MODULES = [
  {
    icon: Activity,
    name: "Dashboard",
    desc: "Real-time environmental monitoring, AQI indicators, and operational alert feeds.",
    to: "/dashboard",
  },
  {
    icon: Leaf,
    name: "Environmental Monitoring",
    desc: "Comprehensive pollutant metrics, air & water indices, and historical trend analysis.",
    to: "/environment",
  },
  {
    icon: CloudRain,
    name: "Forecast",
    desc: "7-day meteorological and AQI forecasting with confidence intervals and weather outlooks.",
    to: "/forecast",
  },
  {
    icon: Cpu,
    name: "GreenGuard Intelligence Center",
    desc: "Context-aware AI copilot for natural-language environmental analysis and recommendations.",
    to: "/copilot",
  },
  {
    icon: Users,
    name: "Citizen Hub",
    desc: "Civic portal for geolocation-tagged complaint reporting, evidence uploads, and tracking.",
    to: "/citizen",
  },
  {
    icon: Map,
    name: "Smart Map",
    desc: "Interactive GIS map featuring monitoring stations, pollution hotspots, and geocoded reports.",
    to: "/map",
  },
  {
    icon: Sparkles,
    name: "Sustainability",
    desc: "City EcoScore calculation, carbon tracking benchmarks, and SDG environmental alignment.",
    to: "/sustainability",
  },
  {
    icon: Sliders,
    name: "Policy Simulator",
    desc: "Scenario modeling for clean-air zones, traffic regulations, and industrial emission shifts.",
    to: "/simulator",
  },
  {
    icon: FileBarChart,
    name: "Reports",
    desc: "AI-summarized environmental briefings, compliance tracking, and structured PDF exports.",
    to: "/reports",
  },
  {
    icon: Shield,
    name: "Administrator Portal",
    desc: "Governance dashboard for complaint verification, city parameters, and system oversight.",
    to: "/admin",
  },
] as const;

const API_GROUPS = [
  {
    category: "Authentication",
    endpoints: [
      { method: "POST", path: "/api/auth/signup", desc: "Register a new user account" },
      { method: "POST", path: "/api/auth/login", desc: "Authenticate credentials and issue JWT" },
      { method: "GET", path: "/api/auth/me", desc: "Fetch profile of current authenticated user" },
      { method: "POST", path: "/api/auth/2fa-challenge", desc: "Verify 2FA OTP for enabled accounts" },
    ],
  },
  {
    category: "Environmental & Forecast",
    endpoints: [
      { method: "GET", path: "/api/environmental/cities", desc: "List all active monitored cities" },
      { method: "GET", path: "/api/environmental/cities/:cityId", desc: "Get real-time city pollutant metrics" },
      { method: "GET", path: "/api/environmental/cities/:cityId/forecast", desc: "Get 7-day daily weather/AQI forecast" },
      { method: "GET", path: "/api/environmental/cities/:cityId/map-data", desc: "Fetch GIS stations, zones, and hotspots" },
      { method: "GET", path: "/api/forecast/:cityId", desc: "Retrieve detailed multi-day forecast model" },
    ],
  },
  {
    category: "Complaints & Workflow",
    endpoints: [
      { method: "GET", path: "/api/complaints", desc: "List and filter complaints with role scoping" },
      { method: "POST", path: "/api/complaints", desc: "Submit a new geo-tagged complaint" },
      { method: "POST", path: "/api/complaints/:id/images", desc: "Upload photo evidence for a complaint" },
      { method: "POST", path: "/api/complaints/:id/verify", desc: "Admin verification of completed resolution" },
      { method: "POST", path: "/api/complaints/:id/rework", desc: "Admin request for authority rework" },
    ],
  },
  {
    category: "AI & Intelligence",
    endpoints: [
      { method: "POST", path: "/api/copilot/chat", desc: "Send grounded environmental query to AI assistant" },
      { method: "POST", path: "/api/copilot/health-advice", desc: "Generate health recommendations based on AQI" },
      { method: "GET", path: "/api/copilot/insights", desc: "Get automated environmental summary insights" },
      { method: "POST", path: "/api/simulator/ai-analysis", desc: "Evaluate policy scenario impact using AI" },
    ],
  },
  {
    category: "Alerts & Simulator",
    endpoints: [
      { method: "GET", path: "/api/alerts/active", desc: "List all currently triggered threshold alerts" },
      { method: "POST", path: "/api/alerts", desc: "Create an advisory alert (authority/admin)" },
      { method: "POST", path: "/api/simulator/run", desc: "Execute mathematical policy simulation" },
      { method: "POST", path: "/api/simulator/compare", desc: "Compare multiple simulation parameter sets" },
    ],
  },
  {
    category: "Reports & Admin",
    endpoints: [
      { method: "GET", path: "/api/reports", desc: "List generated environmental reports" },
      { method: "POST", path: "/api/reports/generate-ai-report", desc: "Generate full AI executive report" },
      { method: "GET", path: "/api/reports/:id/download", desc: "Download generated report PDF" },
      { method: "GET", path: "/api/admin/stats", desc: "Retrieve platform governance statistics" },
    ],
  },
] as const;

function DocsPage() {
  return (
    <InfoPageShell
      eyebrow="Documentation"
      title="Understand how GreenGuard AI works."
      lead="Explore the platform architecture, environmental intelligence workflows, AI capabilities, and implementation patterns behind GreenGuard AI."
    >
      {/* ─── 1. Platform Overview ────────────────────────────────────────────── */}
      <section aria-labelledby="overview-heading" className="space-y-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-primary)] font-medium">
            Overview
          </div>
          <h2
            id="overview-heading"
            className="font-display mt-2 text-2xl lg:text-3xl font-semibold tracking-tight text-foreground"
          >
            What is GreenGuard AI?
          </h2>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-3xl">
            GreenGuard AI is an environmental intelligence platform that unifies real-time
            environmental monitoring, meteorological forecasting, AI-assisted analysis, citizen
            reporting, and municipal authority workflows into a single cohesive system.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xs">
            <div className="grid size-10 place-items-center rounded-xl bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
              <Users className="size-5" />
            </div>
            <h3 className="font-display mt-4 text-base font-semibold text-foreground">Citizens</h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Access real-time AQI and weather indicators, submit geo-tagged complaints with photo
              evidence, track resolution progress, and interact with the AI assistant.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xs">
            <div className="grid size-10 place-items-center rounded-xl bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
              <Shield className="size-5" />
            </div>
            <h3 className="font-display mt-4 text-base font-semibold text-foreground">Authorities</h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Receive assigned complaints within departmental jurisdiction, review severity scores,
              record investigation notes, submit resolution evidence, and resolve cases.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xs">
            <div className="grid size-10 place-items-center rounded-xl bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
              <Lock className="size-5" />
            </div>
            <h3 className="font-display mt-4 text-base font-semibold text-foreground">
              Administrators
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Triage and verify incoming citizen reports, route cases to appropriate authorities,
              manage monitored city parameters, and oversee system governance.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 2. Getting Started ──────────────────────────────────────────────── */}
      <section aria-labelledby="getting-started-heading" className="mt-16 lg:mt-20 space-y-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-primary)] font-medium">
            Quickstart
          </div>
          <h2
            id="getting-started-heading"
            className="font-display mt-2 text-2xl lg:text-3xl font-semibold tracking-tight text-foreground"
          >
            Getting Started
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Key operational entry points across the platform for exploring data, submitting issues,
            and managing environmental workflows.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GETTING_STARTED_GUIDES.map((g) => (
            <Link
              key={g.t}
              to={g.to}
              className="group flex flex-col justify-between rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[color:var(--color-primary)]/40 hover:bg-card hover:shadow-md"
            >
              <div>
                <div className="grid size-10 place-items-center rounded-xl bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
                  <g.icon className="size-5" />
                </div>
                <h3 className="font-display mt-4 text-[15px] font-semibold text-foreground">
                  {g.t}
                </h3>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{g.d}</p>
              </div>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[color:var(--color-primary)] group-hover:underline">
                Explore module <ArrowUpRight className="size-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── 3. Core Platform Modules ────────────────────────────────────────── */}
      <section aria-labelledby="modules-heading" className="mt-16 lg:mt-20 space-y-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-primary)] font-medium">
            Capabilities
          </div>
          <h2
            id="modules-heading"
            className="font-display mt-2 text-2xl lg:text-3xl font-semibold tracking-tight text-foreground"
          >
            Core Platform Modules
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Every module is designed to solve a specific facet of urban environmental monitoring,
            forecasting, decision-making, and public collaboration.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
          {CORE_MODULES.map((m) => (
            <Link
              key={m.name}
              to={m.to}
              className="group flex items-start gap-4 rounded-xl border border-border/60 bg-card/40 p-4 transition-all duration-200 hover:border-border hover:bg-card"
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
                <m.icon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm font-semibold text-foreground">
                    {m.name}
                  </span>
                  <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── 4. How GreenGuard AI Works ─────────────────────────────────────── */}
      <section aria-labelledby="workflow-heading" className="mt-16 lg:mt-20 space-y-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-primary)] font-medium">
            System Flow
          </div>
          <h2
            id="workflow-heading"
            className="font-display mt-2 text-2xl lg:text-3xl font-semibold tracking-tight text-foreground"
          >
            How GreenGuard AI Works
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            From sensor ingestion and meteorological feeds to actionable municipal insights and
            citizen resolution workflows.
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/40 p-6 lg:p-8">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="inline-flex size-6 items-center justify-center rounded-full bg-[color:var(--color-primary)]/20 text-xs font-mono font-semibold text-[color:var(--color-primary)]">
                1
              </div>
              <h3 className="font-display text-sm font-semibold text-foreground">
                Data Collection & Ingestion
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Weather observations and atmospheric metrics are pulled via Open-Meteo feeds,
                combined with localized citizen-submitted environmental reports.
              </p>
            </div>

            <div className="space-y-2">
              <div className="inline-flex size-6 items-center justify-center rounded-full bg-[color:var(--color-primary)]/20 text-xs font-mono font-semibold text-[color:var(--color-primary)]">
                2
              </div>
              <h3 className="font-display text-sm font-semibold text-foreground">
                Analytics & AI Processing
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The platform computes pollutant sub-indices, EcoScores, and 7-day predictive
                trends, using Google Gemini for grounded contextual briefings.
              </p>
            </div>

            <div className="space-y-2">
              <div className="inline-flex size-6 items-center justify-center rounded-full bg-[color:var(--color-primary)]/20 text-xs font-mono font-semibold text-[color:var(--color-primary)]">
                3
              </div>
              <h3 className="font-display text-sm font-semibold text-foreground">
                Action & Governance
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Insights are surfaced on the Smart Map and Dashboards, while complaints are
                triaged by administrators and assigned to authorities for resolution.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-border/60 bg-background/80 p-4 font-mono text-[11px] leading-relaxed text-muted-foreground overflow-x-auto">
            <div className="flex flex-wrap items-center gap-2 text-foreground/80">
              <span className="rounded bg-secondary/80 px-2 py-1 text-xs text-foreground">
                Environmental Data Feeds
              </span>
              <span>→</span>
              <span className="rounded bg-secondary/80 px-2 py-1 text-xs text-foreground">
                Express Normalization
              </span>
              <span>→</span>
              <span className="rounded bg-secondary/80 px-2 py-1 text-xs text-foreground">
                EcoScore & Trend Engine
              </span>
              <span>→</span>
              <span className="rounded bg-secondary/80 px-2 py-1 text-xs text-foreground">
                Gemini AI Decision Support
              </span>
              <span>→</span>
              <span className="rounded bg-secondary/80 px-2 py-1 text-xs text-foreground">
                Citizen & Authority Workflows
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. Reference Architecture ───────────────────────────────────────── */}
      <section aria-labelledby="architecture-heading" className="mt-16 lg:mt-20 space-y-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-primary)] font-medium">
            Engineering
          </div>
          <h2
            id="architecture-heading"
            className="font-display mt-2 text-2xl lg:text-3xl font-semibold tracking-tight text-foreground"
          >
            Reference Architecture
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            The full-stack application architecture connecting the React frontend, Node.js API,
            MongoDB persistence layer, and external intelligence services.
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 lg:p-8">
          <pre className="overflow-x-auto rounded-xl border border-border/60 bg-background p-5 text-[11.5px] font-mono leading-relaxed text-foreground/90">
            {`  ┌─────────────────────────────────────────────────────────────────────────┐
  │                    React 19 + TypeScript Application                    │
  │     TanStack Router · TanStack Query · Tailwind CSS · MapLibre GL       │
  └────────────────────────────────────┬────────────────────────────────────┘
                                       │ HTTP / REST (JWT Auth & Cookies)
                                       ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                   Node.js / Express.js REST API Gateway                 │
  │     Security (Helmet, CORS) · Rate Limiting · Role Authorization (RBAC) │
  └──────────────┬───────────────────────────┬──────────────────────────┬───┘
                 │                           │                          │
                 ▼                           ▼                          ▼
  ┌──────────────────────────────┐ ┌───────────────────┐ ┌──────────────────┐
  │      MongoDB / Mongoose      │ │  Open-Meteo API   │ │ Google Gemini AI │
  │ Users · Complaints · Cities  │ │ Weather & AQI     │ │ 2.5 Flash Model  │
  │ Alerts · Reports · Audits    │ │ Forecast Feeds    │ │ Prompt Grounding │
  └──────────────────────────────┘ └───────────────────┘ └──────────────────┘`}
          </pre>
        </div>
      </section>

      {/* ─── 6. AI & Intelligence Layer ─────────────────────────────────────── */}
      <section aria-labelledby="ai-heading" className="mt-16 lg:mt-20 space-y-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-primary)] font-medium">
            Intelligence
          </div>
          <h2
            id="ai-heading"
            className="font-display mt-2 text-2xl lg:text-3xl font-semibold tracking-tight text-foreground"
          >
            AI & Intelligence Layer
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            How GreenGuard AI leverages Google Gemini as a grounded decision-support layer.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
            <h3 className="font-display text-base font-semibold text-foreground">
              Data-Grounded Prompting
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              To ensure accuracy and prevent hallucinations, all AI queries query the underlying
              MongoDB database and meteorological services first. Current pollutant numbers,
              temperature, historical baselines, and complaint context are directly passed into the
              Gemini model prompts.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
            <h3 className="font-display text-base font-semibold text-foreground">
              Decision-Support Role
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              AI within GreenGuard AI functions as an assistive intelligence tool — summarizing
              complex time-series datasets, generating public health guidance, and explaining
              policy simulator impacts. Final municipal actions and governance approvals always
              remain with human operators.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 7. Citizen → Admin → Authority Workflow ────────────────────────── */}
      <section aria-labelledby="governance-heading" className="mt-16 lg:mt-20 space-y-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-primary)] font-medium">
            Governance
          </div>
          <h2
            id="governance-heading"
            className="font-display mt-2 text-2xl lg:text-3xl font-semibold tracking-tight text-foreground"
          >
            Citizen → Administrator → Authority Workflow
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            The closed-loop resolution process ensuring every environmental issue is tracked,
            verified, and resolved with full accountability.
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Citizen Submission",
                desc: "Citizens submit localized complaints with category, location coordinates, description, and optional photo evidence via Citizen Hub.",
              },
              {
                step: "2",
                title: "Administrator Triage & Review",
                desc: "Administrators review new reports in the governance dashboard, verify validity, classify severity, and assign them to the appropriate municipal department.",
              },
              {
                step: "3",
                title: "Authority Investigation",
                desc: "Assigned authority personnel view the complaint in their dashboard, conduct field investigation, update case notes, and record resolution details.",
              },
              {
                step: "4",
                title: "Admin Verification & Closure",
                desc: "Administrators review the submitted resolution evidence. Once approved, the case is marked resolved, and the citizen receives a status update.",
              },
              {
                step: "5",
                title: "Citizen Feedback Loop",
                desc: "The citizen reviews the resolution outcome and can either accept the resolution or request rework if the issue persists.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex items-start gap-4 rounded-xl border border-border/40 bg-card/60 p-4"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[color:var(--color-primary)]/10 font-mono text-xs font-bold text-[color:var(--color-primary)]">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-display text-sm font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 8. Data & Environmental Intelligence ───────────────────────────── */}
      <section aria-labelledby="data-heading" className="mt-16 lg:mt-20 space-y-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-primary)] font-medium">
            Data Architecture
          </div>
          <h2
            id="data-heading"
            className="font-display mt-2 text-2xl lg:text-3xl font-semibold tracking-tight text-foreground"
          >
            Data Categories & Transparency
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            GreenGuard AI maintains explicit separation between observed physical readings, derived
            indices, forecasts, and AI analysis.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--color-primary)]">
              Category A
            </span>
            <h3 className="font-display mt-1 text-sm font-semibold text-foreground">
              Observed Data
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Direct meteorological measurements from Open-Meteo APIs (temperature, humidity, wind
              speed) and direct citizen report observations.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--color-primary)]">
              Category B
            </span>
            <h3 className="font-display mt-1 text-sm font-semibold text-foreground">
              Derived Metrics
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Standardized Air Quality Index (AQI), Water Quality Index (WQI), and city EcoScores
              calculated via deterministic backend scoring formulas.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--color-primary)]">
              Category C
            </span>
            <h3 className="font-display mt-1 text-sm font-semibold text-foreground">
              Forecast Projections
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              7-day predictive weather and AQI models generated from meteorological services with
              confidence intervals.
            </p>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--color-primary)]">
              Category D
            </span>
            <h3 className="font-display mt-1 text-sm font-semibold text-foreground">
              AI Insights
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Natural-language context, environmental summaries, and simulation policy explanations
              synthesized by Google Gemini models.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 9. Technology Stack ─────────────────────────────────────────────── */}
      <section aria-labelledby="tech-heading" className="mt-16 lg:mt-20 space-y-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-primary)] font-medium">
            Stack
          </div>
          <h2
            id="tech-heading"
            className="font-display mt-2 text-2xl lg:text-3xl font-semibold tracking-tight text-foreground"
          >
            Technology Stack
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Technologies, libraries, and frameworks powering the current implementation.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <div className="text-xs font-semibold text-foreground">Frontend</div>
            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <li>• React 19 & TypeScript</li>
              <li>• TanStack Router & Query</li>
              <li>• Tailwind CSS 4</li>
              <li>• MapLibre GL GIS maps</li>
              <li>• Framer Motion & Lucide</li>
            </ul>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5">
            <div className="text-xs font-semibold text-foreground">Backend</div>
            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <li>• Node.js & Express.js</li>
              <li>• TypeScript</li>
              <li>• Helmet & CORS security</li>
              <li>• Express-Rate-Limit</li>
              <li>• Morgan logging</li>
            </ul>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5">
            <div className="text-xs font-semibold text-foreground">Database & Auth</div>
            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <li>• MongoDB & Mongoose</li>
              <li>• JWT Token Authentication</li>
              <li>• Bcrypt password hashing</li>
              <li>• Role-Based Access (RBAC)</li>
              <li>• Optional 2FA Challenge</li>
            </ul>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5">
            <div className="text-xs font-semibold text-foreground">AI & Services</div>
            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <li>• Google Gemini 2.5 Flash</li>
              <li>• Data-Grounded Prompting</li>
              <li>• Open-Meteo Weather APIs</li>
              <li>• jsPDF Report Exporter</li>
              <li>• Audit Trail Governance</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── 10. API Reference ──────────────────────────────────────────────── */}
      <section aria-labelledby="api-heading" className="mt-16 lg:mt-20 space-y-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-primary)] font-medium">
            API Reference
          </div>
          <h2
            id="api-heading"
            className="font-display mt-2 text-2xl lg:text-3xl font-semibold tracking-tight text-foreground"
          >
            Backend REST Endpoints
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Implemented REST endpoints available on the GreenGuard backend service.
          </p>
        </div>

        <div className="space-y-6">
          {API_GROUPS.map((group) => (
            <div
              key={group.category}
              className="rounded-2xl border border-border/60 bg-card/40 overflow-hidden"
            >
              <div className="border-b border-border/60 bg-muted/20 px-5 py-3 text-xs font-semibold text-foreground">
                {group.category}
              </div>
              <div className="divide-y divide-border/40">
                {group.endpoints.map((ep) => (
                  <div
                    key={`${ep.method}-${ep.path}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 text-xs"
                  >
                    <div className="flex items-center gap-3 font-mono">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          ep.method === "GET"
                            ? "bg-blue-500/15 text-blue-400"
                            : ep.method === "POST"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-amber-500/15 text-amber-400"
                        }`}
                      >
                        {ep.method}
                      </span>
                      <span className="text-foreground">{ep.path}</span>
                    </div>
                    <span className="text-muted-foreground sm:text-right">{ep.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 11. Security & Access Control ──────────────────────────────────── */}
      <section aria-labelledby="security-heading" className="mt-16 lg:mt-20 space-y-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-primary)] font-medium">
            Security
          </div>
          <h2
            id="security-heading"
            className="font-display mt-2 text-2xl lg:text-3xl font-semibold tracking-tight text-foreground"
          >
            Security & Access Control
          </h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Security controls implemented across the API, database, and client applications.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
            <h3 className="font-display text-sm font-semibold text-foreground">
              Role-Based Access (RBAC)
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Granular access control enforcing strict permissions for Citizen, Authority, and
              Administrator roles across all routes and API controllers.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
            <h3 className="font-display text-sm font-semibold text-foreground">
              JWT & Session Security
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Stateless JSON Web Tokens with expiration handling, bcrypt salted password hashing,
              and optional 2FA verification challenge workflows.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
            <h3 className="font-display text-sm font-semibold text-foreground">
              API Defense & Rate Limiting
            </h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Express rate limiters protect authentication endpoints, AI endpoints, and general API
              routes, combined with Helmet HTTP security headers.
            </p>
          </div>
        </div>
      </section>

      {/* ─── CTA Block ──────────────────────────────────────────────────────── */}
      <CTABlock />
    </InfoPageShell>
  );
}
