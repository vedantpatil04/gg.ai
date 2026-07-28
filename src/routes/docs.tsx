import { createFileRoute, Link } from "@tanstack/react-router";
import { InfoPageShell } from "@/components/landing/InfoPageShell";
import { BookOpen, Code2, Cpu, Database, Shield, Zap, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — GreenGuard AI" },
      {
        name: "description",
        content:
          "Guides, API reference and integration patterns for the GreenGuard AI environmental intelligence platform.",
      },
    ],
  }),
  component: DocsPage,
});

const sections = [
  {
    icon: BookOpen,
    t: "Getting started",
    d: "Provision your workspace, invite your team and configure your first city.",
    to: "/dashboard",
  },
  {
    icon: Database,
    t: "Data ingestion",
    d: "Connect sensors, satellite feeds, weather APIs and CSV imports.",
    to: "/dashboard",
  },
  {
    icon: Cpu,
    t: "AI Copilot",
    d: "Prompt patterns, grounding strategy and confidence scoring.",
    to: "/copilot",
  },
  {
    icon: Zap,
    t: "Alerts & webhooks",
    d: "Route alerts to Slack, MS Teams, SMS and your own systems.",
    to: "/dashboard",
  },
  {
    icon: Code2,
    t: "API reference",
    d: "Read-only and write APIs for environmental, forecast and citizen data.",
    to: "/dashboard",
  },
  {
    icon: Shield,
    t: "Security & compliance",
    d: "Auth, roles, audit logging, SOC 2 controls and data residency.",
    to: "/settings",
  },
] as const;

function DocsPage() {
  return (
    <InfoPageShell
      eyebrow="Documentation"
      title="Build with GreenGuard AI."
      lead="Guides, API reference and integration patterns — designed to get an environmental analyst, a city operations team or an integration engineer productive on day one."
    >
      <div className="grid gap-px bg-border/60 rounded-2xl overflow-hidden border border-border/60 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link
            key={s.t}
            to={s.to}
            className="group bg-card p-6 hover:bg-card/60 transition-colors"
          >
            <div className="grid size-10 place-items-center rounded-lg bg-[color:var(--color-primary)]/10 text-[color:var(--color-primary)]">
              <s.icon className="size-5" />
            </div>
            <div className="mt-5 text-[15px] font-semibold tracking-tight">{s.t}</div>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
            <div className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-foreground/70 group-hover:text-[color:var(--color-primary)] transition-colors">
              Read guide{" "}
              <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-border/60 bg-card p-8">
        <div className="font-display text-xl font-semibold tracking-tight">
          Reference architecture
        </div>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
          GreenGuard AI ingests time-series environmental data into a normalised event fabric, runs
          anomaly detection and forecast models, and surfaces insights through the dashboard, AI
          Copilot and alerting layer. Citizen reports and policy simulations enrich the same
          underlying graph.
        </p>
        <pre className="mt-5 overflow-x-auto rounded-lg border border-border/60 bg-background p-4 text-[12px] font-mono leading-relaxed text-foreground/80">
          {`  ┌────────────┐   ┌────────────┐   ┌────────────┐
  │  Sensors   │   │ Satellite  │   │  Citizens  │
  └─────┬──────┘   └─────┬──────┘   └─────┬──────┘
        ▼                ▼                ▼
        ┌──────────── Event Fabric ─────────────┐
        │   normalise · enrich · time-series    │
        └────────────────┬──────────────────────┘
                         ▼
        ┌──────── AI + Forecast Engines ────────┐
        │  anomaly · 72h horizon · grounding    │
        └────────────────┬──────────────────────┘
                         ▼
   Dashboard · Copilot · Reports · Map · Simulator`}
        </pre>
      </div>
    </InfoPageShell>
  );
}
